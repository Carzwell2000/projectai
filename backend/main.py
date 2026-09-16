from __future__ import annotations

import json
import hashlib
import base64
import hmac
import re
import sqlite3
import sys
import secrets
import urllib.request
from uuid import uuid4
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any


base_site_packages = Path(sys.base_prefix) / "Lib" / "site-packages"
if base_site_packages.is_dir() and str(base_site_packages) not in sys.path:
    sys.path.insert(0, str(base_site_packages))

import joblib
import numpy as np
import pandas as pd
import shap
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    psycopg = None
    dict_row = None


BACKEND_ROOT = Path(__file__).resolve().parent
LOCAL_DATABASE_PATH = BACKEND_ROOT / "assessments.db"
PATIENTS_DATABASE_PATH = BACKEND_ROOT / "patients.db"
AUTH_DATABASE_PATH = BACKEND_ROOT / "nurses.db"
bearer_scheme = HTTPBearer(auto_error=False)


class SyncConflictError(RuntimeError):
    pass


class Settings(BaseSettings):
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    model_path: Path = Path(__file__).with_name("disease_model.joblib")
    auth_secret: str = Field(default="change-this-auth-secret", alias="AUTH_SECRET")
    admin_email: str | None = Field(default=None, alias="ADMIN_EMAIL")
    admin_password: str | None = Field(default=None, alias="ADMIN_PASSWORD")
    resend_api_key: str | None = Field(default=None, alias="RESEND_API_KEY")
    resend_from_email: str = Field(default="onboarding@resend.dev", alias="RESEND_FROM_EMAIL")

    model_config = SettingsConfigDict(
        env_file=(BACKEND_ROOT / ".env.local", BACKEND_ROOT / ".env"),
        extra="ignore",
        populate_by_name=True,
    )


settings = Settings()
if not settings.model_path.is_file():
    raise RuntimeError(
        f"Trained model not found at {settings.model_path}. Run train.py first."
    )

artifact = joblib.load(settings.model_path)
classifier = artifact["model"]
feature_names: list[str] = artifact["feature_names"]
disease_names: list[str] = artifact["disease_names"]
all_symptoms: set[str] = set(artifact["all_symptoms"])
MIN_PREDICTION_CONFIDENCE = 0.35


class NurseSignupRequest(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=200)


class NurseLoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=8, max_length=200)


class PasswordChangeRequest(BaseModel):
    currentPassword: str = Field(min_length=8, max_length=200)
    newPassword: str = Field(min_length=8, max_length=200)


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    resetCode: str = Field(min_length=1, max_length=200)
    newPassword: str = Field(min_length=8, max_length=200)


class PasswordResetRequestCode(BaseModel):
    email: str = Field(min_length=3, max_length=200)


def ensure_auth_schema() -> None:
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS nurses (
                id TEXT PRIMARY KEY NOT NULL,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'nurse'
            )
            """
        )
        try:
            connection.execute("ALTER TABLE nurses ADD COLUMN role TEXT NOT NULL DEFAULT 'nurse'")
        except sqlite3.OperationalError:
            pass
        if settings.admin_email and settings.admin_password:
            connection.execute(
                """
                INSERT INTO nurses (id, email, name, password_hash, created_at, role)
                VALUES (?, ?, ?, ?, ?, 'admin')
                ON CONFLICT(email) DO UPDATE SET role = 'admin'
                """,
                (
                    "admin",
                    normalize_email(settings.admin_email),
                    "Administrator",
                    hash_password(settings.admin_password),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS revoked_tokens (
                token_hash TEXT PRIMARY KEY NOT NULL,
                revoked_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS password_reset_codes (
                email TEXT PRIMARY KEY NOT NULL,
                code_hash TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
            """
        )


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or hashlib.sha256(uuid4().bytes).digest()[:16]
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        salt_hex, digest_hex = encoded.split("$", 1)
        expected = hash_password(password, bytes.fromhex(salt_hex)).split("$", 1)[1]
        return hmac.compare_digest(expected, digest_hex)
    except (ValueError, TypeError):
        return False


def issue_access_token(nurse_id: str) -> str:
    payload = {
        "sub": nurse_id,
        "exp": int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp()),
    }
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(settings.auth_secret.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def revoke_access_token(token: str) -> None:
    ensure_auth_schema()
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.execute(
            "INSERT OR REPLACE INTO revoked_tokens (token_hash, revoked_at) VALUES (?, ?)",
            (token_hash, datetime.now(timezone.utc).isoformat()),
        )


def get_current_user_record(token: str, user_id: str) -> dict[str, str]:
    ensure_auth_schema()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        revoked = connection.execute(
            "SELECT 1 FROM revoked_tokens WHERE token_hash = ?",
            (hashlib.sha256(token.encode()).hexdigest(),),
        ).fetchone()
        if revoked is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been signed out.")
        user = connection.execute(
            "SELECT id, email, name, role FROM nurses WHERE id = ?", (user_id,)
        ).fetchone()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found.")
    return dict(user)


def get_current_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, str]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    try:
        encoded, signature = credentials.credentials.split(".", 1)
        expected_signature = hmac.new(settings.auth_secret.encode(), encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_signature):
            raise ValueError
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if int(payload["exp"]) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError
        nurse_id = str(payload["sub"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")

    return get_current_user_record(credentials.credentials, nurse_id)


def get_current_nurse(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, str]:
    nurse = get_current_account(credentials)
    if nurse["role"] != "nurse":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nurse access required.")
    return nurse


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, str]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    try:
        encoded, signature = credentials.credentials.split(".", 1)
        expected_signature = hmac.new(settings.auth_secret.encode(), encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_signature):
            raise ValueError
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if int(payload["exp"]) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError
        user_id = str(payload["sub"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    admin = get_current_user_record(credentials.credentials, user_id)
    if admin["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required.")
    return admin


def normalize_text(value: str) -> str:
    return " ".join(value.lower().replace("_", " ").split())


def split_symptoms(value: str) -> list[str]:
    return list(dict.fromkeys(
        normalized
        for normalized in (normalize_text(part) for part in value.split(","))
        if normalized
    ))


def resolve_symptoms(value: str) -> list[str]:
    normalized_value = normalize_text(value)
    resolved: list[str] = []
    aliases = {
        "stomach ache": "stomach pain",
        "belly ache": "belly pain",
        "high temperature": "high fever",
        "shortness of breath": "breathlessness",
        "difficulty breathing": "breathlessness",
        "throwing up": "vomiting",
        "feeling sick": "nausea",
        "loose motion": "diarrhoea",
        "loose motions": "diarrhoea",
    }

    for symptom in split_symptoms(value):
        candidate = aliases.get(symptom, symptom)
        if candidate in all_symptoms:
            resolved.append(candidate)
            continue

        best_match = max(
            all_symptoms,
            key=lambda known: SequenceMatcher(None, candidate, known).ratio(),
            default="",
        )
        if best_match and SequenceMatcher(None, candidate, best_match).ratio() >= 0.82:
            resolved.append(best_match)

    # Also recognize known symptoms inside natural sentences, not only CSV-style lists.
    for known_symptom in all_symptoms:
        if known_symptom in normalized_value and known_symptom not in resolved:
            resolved.append(known_symptom)

    return list(dict.fromkeys(resolved))


def build_features(symptoms: str, temperature: float) -> pd.DataFrame:
    values = dict.fromkeys(feature_names, 0.0)
    for symptom in resolve_symptoms(symptoms):
        if symptom in values:
            values[symptom] = 1.0

    temperature_column = "patient_temperature"
    if temperature_column not in values:
        temperature_column = artifact.get("temperature_feature", temperature_column)
    values[temperature_column] = temperature
    return pd.DataFrame([values], columns=feature_names)


def predict_assessment(symptoms: str, temperature: float) -> dict[str, Any]:
    features = build_features(symptoms, temperature)
    probabilities = classifier.predict_proba(features)[0]
    ranked = np.argsort(probabilities)[::-1][:5]
    top_confidence = float(probabilities[ranked[0]])
    recognized_symptoms = resolve_symptoms(symptoms)
    has_sufficient_evidence = bool(recognized_symptoms) and top_confidence >= MIN_PREDICTION_CONFIDENCE
    predictions = [
        {
            "disease": disease_names[int(index)],
            "confidence": round(float(probabilities[index]), 4),
        }
        for index in ranked
    ] if recognized_symptoms else []
    primary = predictions[0] if predictions else {"disease": "Insufficient evidence", "confidence": 0.0}
    recommendations = artifact.get("recommendations", {})
    if has_sufficient_evidence:
        recommendation = recommendations.get(
            primary["disease"],
            "Review this result with a qualified healthcare professional.",
        )
    elif not recognized_symptoms:
        recommendation = "No recognized symptom was matched. Capture a specific symptom and review the possibilities with a qualified healthcare professional."
    else:
        recommendation = recommendations.get(
            primary["disease"],
            "Review this possible match with a qualified healthcare professional.",
        )
    return {
        "disease": primary["disease"],
        "confidence": primary["confidence"],
        "predictions": predictions,
        "recognizedSymptoms": recognized_symptoms,
        "recommendation": recommendation,
        "modelVersion": artifact.get("model_version", "unknown"),
        "status": (
            "prediction"
            if has_sufficient_evidence
            else "low_confidence"
            if recognized_symptoms
            else "insufficient_evidence"
        ),
    }


def explain_assessment(symptoms: str, temperature: float, blood_pressure: str = "") -> dict[str, Any]:
    features = build_features(symptoms, temperature)
    probabilities = classifier.predict_proba(features)[0]
    predicted_index = int(np.argmax(probabilities))
    recognized_symptoms = resolve_symptoms(symptoms)
    has_sufficient_evidence = bool(recognized_symptoms) and float(probabilities[predicted_index]) >= MIN_PREDICTION_CONFIDENCE
    model = classifier
    transformed_features = features.to_numpy()[0]
    if hasattr(classifier, "named_steps"):
        steps = classifier.named_steps
        scaler = next(
            (step for step in steps.values() if hasattr(step, "transform") and hasattr(step, "scale_")),
            None,
        )
        model = next(
            (step for step in reversed(list(steps.values())) if hasattr(step, "coef_")),
            None,
        )
        if scaler is not None:
            transformed_features = scaler.transform(features)[0]

    if model is None or not hasattr(model, "coef_"):
        raise RuntimeError("The loaded model does not support feature explanations.")

    explainer = shap.LinearExplainer(
        model,
        np.zeros((1, transformed_features.shape[0])),
    )
    shap_values = np.asarray(explainer.shap_values(transformed_features.reshape(1, -1)))
    if shap_values.ndim == 3:
        contributions = shap_values[0, :, predicted_index]
    elif shap_values.ndim == 2 and shap_values.shape[0] == len(disease_names):
        contributions = shap_values[predicted_index]
    else:
        contributions = shap_values.reshape(1, -1)[0]

    temperature_feature = artifact.get("temperature_feature", "patient_temperature")
    explanation_feature_indices = [
        index for index, feature in enumerate(feature_names)
        if feature in recognized_symptoms or feature == temperature_feature
    ]
    ranked_features = sorted(
        explanation_feature_indices,
        key=lambda index: abs(contributions[index]),
        reverse=True,
    )[:10]
    feature_contributions = [
        {
            "feature": feature_names[int(index)],
            "contribution": round(float(contributions[index]), 6),
            "direction": "supports" if contributions[index] >= 0 else "opposes",
        }
        for index in ranked_features
        if contributions[index] != 0
    ]

    pressure_match = re.fullmatch(r"\s*(\d{2,3})\s*/\s*(\d{2,3})\s*", blood_pressure)
    systolic, diastolic = (int(pressure_match.group(1)), int(pressure_match.group(2))) if pressure_match else (None, None)
    clinical_signals: list[dict[str, str]] = []
    if temperature >= 40:
        clinical_signals.append({"feature": "Temperature", "value": f"{temperature:g} °C", "status": "high", "meaning": "Critical high temperature; emergency assessment is required."})
    elif temperature >= 38.5:
        clinical_signals.append({"feature": "Temperature", "value": f"{temperature:g} °C", "status": "high", "meaning": "High temperature; same-day clinical review is recommended."})
    elif temperature < 35:
        clinical_signals.append({"feature": "Temperature", "value": f"{temperature:g} °C", "status": "low", "meaning": "Critical low temperature; emergency assessment is required."})
    if systolic is not None and diastolic is not None:
        if systolic >= 180 or diastolic >= 120:
            clinical_signals.append({"feature": "Blood pressure", "value": f"{systolic}/{diastolic} mmHg", "status": "high", "meaning": "Severely elevated blood pressure; emergency assessment is required."})
        elif systolic < 90 or diastolic < 60:
            clinical_signals.append({"feature": "Blood pressure", "value": f"{systolic}/{diastolic} mmHg", "status": "low", "meaning": "Low blood pressure; emergency assessment is required."})

    prediction = predict_assessment(symptoms, temperature)
    return {
        "disease": prediction["disease"],
        "confidence": prediction["confidence"],
        "predictions": prediction["predictions"],
        "recognizedSymptoms": prediction["recognizedSymptoms"],
        "recommendation": prediction["recommendation"],
        "status": prediction["status"],
        "features": feature_contributions,
        "clinicalSignals": clinical_signals,
        "modelVersion": artifact.get("model_version", "unknown"),
    }


class AssessmentRequest(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    patientName: str = Field(min_length=2, max_length=200)
    age: int = Field(ge=0, le=130)
    temperature: float = Field(ge=25, le=45)
    bloodPressure: str = Field(pattern=r"^\d{2,3}/\d{2,3}$")
    symptoms: str = Field(min_length=2, max_length=4000)
    createdAt: datetime | None = None

    @field_validator("patientName", "symptoms")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()


class ExplanationRequest(BaseModel):
    temperature: float = Field(ge=25, le=45)
    bloodPressure: str = Field(default="", pattern=r"^$|^\d{2,3}/\d{2,3}$")
    symptoms: str = Field(min_length=2, max_length=4000)

    @field_validator("symptoms")
    @classmethod
    def trim_symptoms(cls, value: str) -> str:
        return value.strip()


class AssessmentSyncRequest(BaseModel):
    assessments: list[AssessmentRequest] = Field(min_length=1, max_length=100)


class PatientRequest(BaseModel):
    id: str | None = Field(default=None, min_length=1, max_length=120)
    name: str = Field(min_length=2, max_length=200)
    phone: str = Field(min_length=1, max_length=40)
    dateOfBirth: str = Field(min_length=1, max_length=40)

    @field_validator("name", "phone", "dateOfBirth")
    @classmethod
    def trim_patient_fields(cls, value: str) -> str:
        return value.strip()

    @field_validator("phone")
    @classmethod
    def validate_phone_digits(cls, value: str) -> str:
        digit_count = len(re.sub(r"\D", "", value))
        if digit_count < 10 or digit_count > 15:
            raise ValueError("Phone number must contain between 10 and 15 digits.")
        return value


class PatientRecord(PatientRequest):
    id: str
    createdAt: datetime
    syncStatus: str = "pending_sync"
    registeredBy: str = "Unknown nurse"


def ensure_local_schema() -> None:
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS assessments (
                id TEXT PRIMARY KEY NOT NULL,
                nurse_id TEXT,
                patient_name TEXT NOT NULL,
                age INTEGER NOT NULL,
                temperature REAL NOT NULL,
                blood_pressure TEXT NOT NULL,
                symptoms TEXT NOT NULL,
                created_at TEXT NOT NULL,
                disease TEXT,
                confidence REAL,
                predictions TEXT NOT NULL DEFAULT '[]',
                recommendation TEXT NOT NULL DEFAULT '',
                model_version TEXT NOT NULL DEFAULT 'unknown',
                sync_status TEXT NOT NULL DEFAULT 'pending_sync'
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sync_conflicts (
                record_type TEXT NOT NULL,
                record_id TEXT NOT NULL,
                local_payload TEXT NOT NULL,
                remote_payload TEXT NOT NULL,
                detected_at TEXT NOT NULL,
                PRIMARY KEY (record_type, record_id, detected_at)
            )
            """
        )
        connection.execute("DROP TABLE IF EXISTS patients")
        try:
            connection.execute("ALTER TABLE assessments ADD COLUMN nurse_id TEXT")
        except sqlite3.OperationalError:
            pass


def ensure_patients_schema() -> None:
    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                date_of_birth TEXT NOT NULL,
                created_at TEXT NOT NULL,
                sync_status TEXT NOT NULL DEFAULT 'pending_sync'
            )
            """
        )
        try:
            connection.execute("ALTER TABLE patients ADD COLUMN nurse_id TEXT")
        except sqlite3.OperationalError:
            pass
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sync_conflicts (
                record_type TEXT NOT NULL,
                record_id TEXT NOT NULL,
                local_payload TEXT NOT NULL,
                remote_payload TEXT NOT NULL,
                detected_at TEXT NOT NULL,
                PRIMARY KEY (record_type, record_id, detected_at)
            )
            """
        )


def ensure_postgres_schema() -> None:
    if not settings.database_url or psycopg is None:
        raise RuntimeError("Database configuration or psycopg is unavailable.")

    with psycopg.connect(settings.database_url, connect_timeout=15) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS nurses (
                id TEXT PRIMARY KEY NOT NULL,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                role TEXT NOT NULL DEFAULT 'nurse'
            )
            """
        )
        connection.execute(
            "ALTER TABLE nurses ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'nurse'"
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS assessments (
                id TEXT PRIMARY KEY NOT NULL,
                patient_name TEXT NOT NULL,
                age INTEGER NOT NULL,
                temperature DOUBLE PRECISION NOT NULL,
                blood_pressure TEXT NOT NULL,
                symptoms TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                disease TEXT,
                confidence DOUBLE PRECISION,
                predictions JSONB NOT NULL DEFAULT '[]'::jsonb,
                recommendation TEXT NOT NULL DEFAULT '',
                model_version TEXT NOT NULL DEFAULT 'unknown',
                sync_status TEXT NOT NULL DEFAULT 'synced'
            )
            """
        )
        connection.execute(
            """
            ALTER TABLE assessments
                ADD COLUMN IF NOT EXISTS nurse_id TEXT,
                ADD COLUMN IF NOT EXISTS disease TEXT,
                ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION,
                ADD COLUMN IF NOT EXISTS predictions JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS recommendation TEXT NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT 'unknown',
                ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced'
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY NOT NULL,
                nurse_id TEXT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                date_of_birth TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                sync_status TEXT NOT NULL DEFAULT 'synced'
            )
            """
        )
        connection.execute("ALTER TABLE patients DROP COLUMN IF EXISTS condition")
        connection.execute(
            "ALTER TABLE patients ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced'"
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sync_conflicts (
                record_type TEXT NOT NULL,
                record_id TEXT NOT NULL,
                local_payload JSONB NOT NULL,
                remote_payload JSONB NOT NULL,
                detected_at TIMESTAMPTZ NOT NULL,
                PRIMARY KEY (record_type, record_id, detected_at)
            )
            """
        )


def save_local_assessment(
    request: AssessmentRequest,
    prediction: dict[str, Any],
    created_at: datetime,
    nurse_id: str,
) -> None:
    ensure_local_schema()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.execute(
            """
            INSERT INTO assessments
                            (id, nurse_id, patient_name, age, temperature, blood_pressure, symptoms,
                    created_at, disease, confidence, predictions, recommendation, model_version)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                            nurse_id = excluded.nurse_id,
              patient_name = excluded.patient_name,
              age = excluded.age,
              temperature = excluded.temperature,
              blood_pressure = excluded.blood_pressure,
              symptoms = excluded.symptoms,
              created_at = excluded.created_at,
              disease = excluded.disease,
              confidence = excluded.confidence,
              predictions = excluded.predictions,
              recommendation = excluded.recommendation,
              model_version = excluded.model_version
            """,
            (
                request.id,
                nurse_id,
                request.patientName,
                request.age,
                request.temperature,
                request.bloodPressure,
                request.symptoms,
                created_at.isoformat(),
                prediction["disease"],
                prediction["confidence"],
                json.dumps(prediction["predictions"]),
                prediction["recommendation"],
                prediction["modelVersion"],
            ),
        )


def mark_local_assessment_synced(assessment_id: str) -> None:
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.execute(
            "UPDATE assessments SET sync_status = 'synced' WHERE id = ?",
            (assessment_id,),
        )


def mark_local_assessment_conflict(assessment_id: str) -> None:
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.execute(
            "UPDATE assessments SET sync_status = 'conflict' WHERE id = ?",
            (assessment_id,),
        )


def save_postgres_assessment(
    request: AssessmentRequest,
    prediction: dict[str, Any],
    created_at: datetime,
    nurse_id: str,
    ensure_schema: bool = True,
) -> None:
    if ensure_schema: ensure_postgres_schema()
    local_payload = {
        "id": request.id,
        "patient_name": request.patientName,
        "age": request.age,
        "temperature": request.temperature,
        "blood_pressure": request.bloodPressure,
        "symptoms": request.symptoms,
        "created_at": created_at.isoformat(),
        "disease": prediction["disease"],
        "confidence": prediction["confidence"],
        "predictions": prediction["predictions"],
        "recommendation": prediction["recommendation"],
        "model_version": prediction["modelVersion"],
    }
    with psycopg.connect(settings.database_url, connect_timeout=15) as connection:
        inserted = connection.execute(
            """
            INSERT INTO assessments
                                    (id, nurse_id, patient_name, age, temperature, blood_pressure, symptoms,
                    created_at, disease, confidence, predictions, recommendation, model_version)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                                nurse_id = EXCLUDED.nurse_id,
                patient_name = EXCLUDED.patient_name,
                age = EXCLUDED.age,
                temperature = EXCLUDED.temperature,
                blood_pressure = EXCLUDED.blood_pressure,
                symptoms = EXCLUDED.symptoms,
                created_at = EXCLUDED.created_at,
                disease = EXCLUDED.disease,
                confidence = EXCLUDED.confidence,
                predictions = EXCLUDED.predictions,
                recommendation = EXCLUDED.recommendation,
                model_version = EXCLUDED.model_version
            RETURNING id
            """,
            (
                request.id,
                nurse_id,
                request.patientName,
                request.age,
                request.temperature,
                request.bloodPressure,
                request.symptoms,
                created_at,
                prediction["disease"],
                prediction["confidence"],
                json.dumps(prediction["predictions"]),
                prediction["recommendation"],
                prediction["modelVersion"],
            ),
        ).fetchone()
        if inserted is None:
            raise RuntimeError(f"Assessment {request.id} was not written to Neon.")


def sync_local_assessments(nurse_id: str | None = None) -> int:
    if not settings.database_url or psycopg is None:
        return 0

    ensure_local_schema()
    ensure_postgres_schema()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        query = "SELECT * FROM assessments WHERE sync_status = 'pending_sync'"
        parameters: tuple[Any, ...] = ()
        if nurse_id:
            query += " AND nurse_id = ?"
            parameters = (nurse_id,)
        rows = connection.execute(query + " ORDER BY created_at", parameters).fetchall()

    synced = 0
    for row in rows:
        request = AssessmentRequest(
            id=row["id"],
            patientName=row["patient_name"],
            age=row["age"],
            temperature=row["temperature"],
            bloodPressure=row["blood_pressure"],
            symptoms=row["symptoms"],
            createdAt=datetime.fromisoformat(row["created_at"]),
        )
        prediction = {
            "disease": row["disease"],
            "confidence": row["confidence"],
            "predictions": json.loads(row["predictions"]),
            "recommendation": row["recommendation"],
            "modelVersion": row["model_version"],
        }
        try:
            save_postgres_assessment(request, prediction, request.createdAt, row["nurse_id"] or nurse_id or "", ensure_schema=False)
            mark_local_assessment_synced(request.id)
            synced += 1
        except SyncConflictError:
            mark_local_assessment_conflict(request.id)
        except Exception:
            continue
    return synced


def sync_local_nurses(nurse_id: str | None = None) -> int:
    if not settings.database_url or psycopg is None:
        return 0

    ensure_auth_schema()
    ensure_postgres_schema()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        query = "SELECT * FROM nurses"
        parameters: tuple[Any, ...] = ()
        if nurse_id:
            query += " WHERE id = ?"
            parameters = (nurse_id,)
        rows = connection.execute(query, parameters).fetchall()

    with psycopg.connect(settings.database_url, connect_timeout=15) as connection:
        for row in rows:
            connection.execute(
                """
                INSERT INTO nurses (id, email, name, password_hash, created_at, role)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    email = EXCLUDED.email,
                    name = EXCLUDED.name,
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role
                """,
                (
                    row["id"],
                    row["email"],
                    row["name"],
                    row["password_hash"],
                    row["created_at"],
                    row["role"],
                ),
            )
    return len(rows)


def save_local_patient(patient: PatientRecord, nurse_id: str) -> None:
    ensure_patients_schema()
    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        connection.execute(
            """
                        INSERT INTO patients (id, nurse_id, name, phone, date_of_birth, created_at, sync_status)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              phone = excluded.phone,
              date_of_birth = excluded.date_of_birth,
                            sync_status = excluded.sync_status
            """,
                        (patient.id, nurse_id, patient.name, patient.phone, patient.dateOfBirth, patient.createdAt.isoformat(), patient.syncStatus),
        )


def save_postgres_patient(patient: PatientRecord, nurse_id: str, ensure_schema: bool = True) -> None:
    if ensure_schema:
        ensure_postgres_schema()
    local_payload = {
        "id": patient.id,
        "name": patient.name,
        "phone": patient.phone,
        "date_of_birth": patient.dateOfBirth,
        "created_at": patient.createdAt.isoformat(),
    }
    with psycopg.connect(settings.database_url, connect_timeout=15) as connection:
        inserted = connection.execute(
            """
            INSERT INTO patients (id, nurse_id, name, phone, date_of_birth, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                nurse_id = EXCLUDED.nurse_id,
                name = EXCLUDED.name,
                phone = EXCLUDED.phone,
                date_of_birth = EXCLUDED.date_of_birth,
                created_at = EXCLUDED.created_at
            RETURNING id
            """,
            (
                patient.id,
                nurse_id,
                local_payload["name"],
                local_payload["phone"],
                local_payload["date_of_birth"],
                patient.createdAt,
            ),
        ).fetchone()
        if inserted is None:
            raise RuntimeError(f"Patient {patient.id} was not written to Neon.")


def mark_local_patient_synced(patient_id: str) -> None:
    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        connection.execute(
            "UPDATE patients SET sync_status = 'synced' WHERE id = ?",
            (patient_id,),
        )


def mark_local_patient_conflict(patient_id: str) -> None:
    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        connection.execute(
            "UPDATE patients SET sync_status = 'conflict' WHERE id = ?",
            (patient_id,),
        )


def sync_local_patients(nurse_id: str | None = None) -> int:
    if not settings.database_url or psycopg is None:
        return 0

    ensure_patients_schema()
    ensure_postgres_schema()
    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        query = "SELECT * FROM patients WHERE sync_status = 'pending_sync'"
        parameters: tuple[Any, ...] = ()
        if nurse_id:
            query += " AND nurse_id = ?"
            parameters = (nurse_id,)
        rows = connection.execute(query + " ORDER BY created_at", parameters).fetchall()

    synced = 0
    for row in rows:
        patient = PatientRecord(
            id=row["id"],
            name=row["name"],
            phone=row["phone"],
            dateOfBirth=row["date_of_birth"],
            createdAt=datetime.fromisoformat(row["created_at"]),
            syncStatus="pending_sync",
        )
        try:
            save_postgres_patient(patient, row["nurse_id"] or nurse_id or "", ensure_schema=False)
            mark_local_patient_synced(patient.id)
            synced += 1
        except SyncConflictError:
            mark_local_patient_conflict(patient.id)
        except Exception:
            continue
    return synced


def create_patient(request: PatientRequest, nurse_id: str, nurse_name: str = "Unknown nurse") -> PatientRecord:
    patient = PatientRecord(
        id=request.id or f"PT-{uuid4().hex[:10].upper()}",
        createdAt=datetime.now(timezone.utc),
        syncStatus="pending_sync",
        registeredBy=nurse_name,
        **request.model_dump(exclude={"id"}),
    )

    # Save locally first so FastAPI can always serve the registration.
    save_local_patient(patient, nurse_id)

    return patient


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_local_schema()
    ensure_patients_schema()
    ensure_auth_schema()
    yield


app = FastAPI(title="Patient Assessment API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Patient Assessment API",
        "status": "running",
        "health": "/health",
        "docs": "/docs",
    }

from routes.assessments import router as assessments_router
from routes.auth import router as auth_router
from routes.patients import router as patients_router
from routes.prediction import router as prediction_router
from routes.system import router as system_router

app.include_router(system_router)
app.include_router(auth_router)
app.include_router(prediction_router)
app.include_router(assessments_router)
app.include_router(patients_router)