from __future__ import annotations

import json
import hashlib
import sqlite3
import sys
from uuid import uuid4
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any


base_site_packages = Path(sys.base_prefix) / "Lib" / "site-packages"
if base_site_packages.is_dir() and str(base_site_packages) not in sys.path:
    sys.path.insert(0, str(base_site_packages))

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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


class Settings(BaseSettings):
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    model_path: Path = Path(__file__).with_name("disease_model.joblib")

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
MIN_PREDICTION_CONFIDENCE = 0.0


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
    predictions = [
        {
            "disease": disease_names[int(index)],
            "confidence": round(float(probabilities[index]), 4),
        }
        for index in ranked
    ]
    primary = predictions[0]
    recommendations = artifact.get("recommendations", {})
    recognized_symptoms = resolve_symptoms(symptoms)
    has_sufficient_evidence = bool(recognized_symptoms) and top_confidence >= MIN_PREDICTION_CONFIDENCE
    recommendation = recommendations.get(
        primary["disease"] if has_sufficient_evidence else "",
        "No recognized symptom was matched. Capture a specific symptom and review the ranked possibilities with a qualified health professional.",
    )
    return {
        "disease": primary["disease"],
        "confidence": primary["confidence"],
        "predictions": predictions,
        "recommendation": recommendation,
        "modelVersion": artifact.get("model_version", "unknown"),
        "status": "prediction" if has_sufficient_evidence else "insufficient_evidence",
    }


def explain_assessment(symptoms: str, temperature: float) -> dict[str, Any]:
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

    coefficients = model.coef_
    coefficient_row = coefficients[predicted_index]
    if coefficients.shape[0] == 1 and len(disease_names) > 1:
        coefficient_row = coefficients[0]
    contributions = coefficient_row * transformed_features

    ranked_features = np.argsort(np.abs(contributions))[::-1][:10]
    feature_contributions = [
        {
            "feature": feature_names[int(index)],
            "contribution": round(float(contributions[index]), 6),
            "direction": "supports" if contributions[index] >= 0 else "opposes",
        }
        for index in ranked_features
        if contributions[index] != 0
    ]

    prediction = predict_assessment(symptoms, temperature)
    return {
        "disease": prediction["disease"],
        "confidence": prediction["confidence"],
        "predictions": prediction["predictions"],
        "recommendation": prediction["recommendation"],
        "status": prediction["status"],
        "features": feature_contributions,
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
    symptoms: str = Field(min_length=2, max_length=4000)

    @field_validator("symptoms")
    @classmethod
    def trim_symptoms(cls, value: str) -> str:
        return value.strip()


class AssessmentSyncRequest(BaseModel):
    assessments: list[AssessmentRequest] = Field(min_length=1, max_length=100)


class PatientRequest(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    phone: str = Field(min_length=1, max_length=40)
    dateOfBirth: str = Field(min_length=1, max_length=40)
    condition: str = Field(min_length=1, max_length=400)


class PatientRecord(PatientRequest):
    id: str
    createdAt: datetime
    syncStatus: str = "pending_sync"


def ensure_local_schema() -> None:
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS assessments (
                id TEXT PRIMARY KEY NOT NULL,
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
            CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                date_of_birth TEXT NOT NULL,
                condition TEXT NOT NULL,
                created_at TEXT NOT NULL,
                sync_status TEXT NOT NULL DEFAULT 'pending_sync'
            )
            """
        )
        try:
            connection.execute(
                "ALTER TABLE patients ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending_sync'"
            )
        except sqlite3.OperationalError:
            pass


def ensure_postgres_schema() -> None:
    if not settings.database_url or psycopg is None:
        raise RuntimeError("Database configuration or psycopg is unavailable.")

    with psycopg.connect(settings.database_url, connect_timeout=15) as connection:
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
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                date_of_birth TEXT NOT NULL,
                condition TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                sync_status TEXT NOT NULL DEFAULT 'synced'
            )
            """
        )
        connection.execute(
            "ALTER TABLE patients ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced'"
        )


def save_local_assessment(
    request: AssessmentRequest,
    prediction: dict[str, Any],
    created_at: datetime,
) -> None:
    ensure_local_schema()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.execute(
            """
            INSERT INTO assessments
              (id, patient_name, age, temperature, blood_pressure, symptoms,
                    created_at, disease, confidence, predictions, recommendation, model_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
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


def save_postgres_assessment(
    request: AssessmentRequest,
    prediction: dict[str, Any],
    created_at: datetime,
) -> None:
    ensure_postgres_schema()
    anonymized_subject = f"encounter-{hashlib.sha256(request.id.encode()).hexdigest()[:16]}"
    with psycopg.connect(settings.database_url, connect_timeout=15) as connection:
        connection.execute(
            """
            INSERT INTO assessments
                  (id, patient_name, age, temperature, blood_pressure, symptoms,
                    created_at, disease, confidence, predictions, recommendation, model_version)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
              disease = EXCLUDED.disease,
              confidence = EXCLUDED.confidence,
              predictions = EXCLUDED.predictions,
              recommendation = EXCLUDED.recommendation,
              model_version = EXCLUDED.model_version,
              sync_status = 'synced'
            """,
            (
                request.id,
                anonymized_subject,
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
        )


def sync_local_assessments() -> int:
    if not settings.database_url or psycopg is None:
        return 0

    ensure_local_schema()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT * FROM assessments WHERE sync_status = 'pending_sync' ORDER BY created_at"
        ).fetchall()

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
        save_postgres_assessment(request, prediction, request.createdAt)
        mark_local_assessment_synced(request.id)
        synced += 1
    return synced


def save_local_patient(patient: PatientRecord) -> None:
    ensure_local_schema()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.execute(
            """
            INSERT INTO patients (id, name, phone, date_of_birth, condition, created_at, sync_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              phone = excluded.phone,
              date_of_birth = excluded.date_of_birth,
                            condition = excluded.condition,
                            sync_status = excluded.sync_status
            """,
                        (patient.id, patient.name, patient.phone, patient.dateOfBirth, patient.condition, patient.createdAt.isoformat(), patient.syncStatus),
        )


def save_postgres_patient(patient: PatientRecord) -> None:
    ensure_postgres_schema()
    with psycopg.connect(settings.database_url, connect_timeout=15) as connection:
        connection.execute(
            """
            INSERT INTO patients (id, name, phone, date_of_birth, condition, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              date_of_birth = EXCLUDED.date_of_birth,
              condition = EXCLUDED.condition
            """,
            (patient.id, patient.name, patient.phone, patient.dateOfBirth, patient.condition, patient.createdAt),
        )


def mark_local_patient_synced(patient_id: str) -> None:
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.execute(
            "UPDATE patients SET sync_status = 'synced' WHERE id = ?",
            (patient_id,),
        )


def sync_local_patients() -> int:
    if not settings.database_url or psycopg is None:
        return 0

    ensure_local_schema()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT * FROM patients WHERE sync_status = 'pending_sync' ORDER BY created_at"
        ).fetchall()

    synced = 0
    for row in rows:
        patient = PatientRecord(
            id=row["id"],
            name=row["name"],
            phone=row["phone"],
            dateOfBirth=row["date_of_birth"],
            condition=row["condition"],
            createdAt=datetime.fromisoformat(row["created_at"]),
            syncStatus="pending_sync",
        )
        try:
            save_postgres_patient(patient)
            mark_local_patient_synced(patient.id)
            synced += 1
        except Exception:
            continue
    return synced


def create_patient(request: PatientRequest) -> PatientRecord:
    patient = PatientRecord(
        id=f"PT-{uuid4().hex[:10].upper()}",
        createdAt=datetime.now(timezone.utc),
        syncStatus="pending_sync",
        **request.model_dump(),
    )
    if settings.database_url and psycopg is not None:
        try:
            save_postgres_patient(patient)
            patient = patient.model_copy(update={"syncStatus": "synced"})
            return patient
        except Exception:
            pass
    save_local_patient(patient)
    return patient


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_local_schema()
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
from routes.patients import router as patients_router
from routes.prediction import router as prediction_router
from routes.system import router as system_router

app.include_router(system_router)
app.include_router(prediction_router)
app.include_router(assessments_router)
app.include_router(patients_router)