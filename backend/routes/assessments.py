import sqlite3
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from main import (
    AssessmentRequest,
    AssessmentSyncRequest,
    AUTH_DATABASE_PATH,
    LOCAL_DATABASE_PATH,
    PATIENTS_DATABASE_PATH,
    ensure_local_schema,
    mark_local_assessment_synced,
    predict_assessment,
    save_local_assessment,
    save_postgres_assessment,
    settings,
    sync_local_assessments,
    sync_local_nurses,
    sync_local_patients,
    ensure_patients_schema,
    psycopg,
    dict_row,
    get_current_nurse,
)
from rule_engine import infer_triage

router = APIRouter(prefix="/api")


def row_to_response(row: dict[str, Any]) -> dict[str, Any]:
    predictions = row["predictions"]
    if isinstance(predictions, str):
        import json

        row["predictions"] = json.loads(predictions)
    return row


def local_assessment_rows(
    limit: int,
    nurse_id: str,
) -> list[dict[str, Any]]:
    ensure_local_schema()
    query = "SELECT * FROM assessments WHERE nurse_id = ?"
    parameters: tuple[Any, ...] = (nurse_id,)
    query += " ORDER BY created_at DESC LIMIT ?"
    parameters += (limit,)

    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(query, parameters).fetchall()
    nurse_ids = {row["nurse_id"] for row in rows if row["nurse_id"]}
    nurse_names: dict[str, str] = {}
    if nurse_ids:
        placeholders = ",".join("?" for _ in nurse_ids)
        with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
            nurse_names = dict(
                connection.execute(
                    f"SELECT id, name FROM nurses WHERE id IN ({placeholders})",
                    tuple(nurse_ids),
                ).fetchall()
            )
    assessments = []
    for row in rows:
        assessment = row_to_response(dict(row))
        assessment["nurse_name"] = nurse_names.get(row["nurse_id"], "Unknown nurse")
        assessments.append(assessment)
    return assessments


def postgres_assessment_rows(limit: int, sync_status: str | None) -> list[dict[str, Any]]:
    query = "SELECT * FROM assessments"
    parameters: list[Any] = []
    if sync_status in {"pending_sync", "synced"}:
        query += " WHERE sync_status = %s"
        parameters.append(sync_status)
    query += " ORDER BY created_at DESC LIMIT %s"
    parameters.append(limit)
    with psycopg.connect(settings.database_url, connect_timeout=15, row_factory=dict_row) as connection:
        rows = connection.execute(query, parameters).fetchall()
    return [row_to_response(dict(row)) for row in rows]


def sync_assessment_to_postgres(
    request: AssessmentRequest,
    prediction: dict[str, Any],
    created_at: datetime,
    nurse_id: str,
) -> None:
    try:
        if settings.database_url and psycopg is not None:
            save_postgres_assessment(request, prediction, created_at, nurse_id)
            mark_local_assessment_synced(request.id)
    except Exception:
        pass


def process_assessment(request: AssessmentRequest, nurse_id: str) -> dict[str, Any]:
    prediction = predict_assessment(request.symptoms, request.temperature)
    triage = infer_triage(
        age=request.age,
        temperature=request.temperature,
        blood_pressure=request.bloodPressure,
        symptoms=request.symptoms,
    )
    prediction = {
        "disease": str(prediction.get("disease", "Insufficient evidence")),
        "confidence": float(prediction.get("confidence", 0)),
        "predictions": [
            {
                "disease": str(item.get("disease", "Unknown")),
                "confidence": float(item.get("confidence", 0)),
            }
            for item in prediction.get("predictions", [])
        ],
        "recognizedSymptoms": [str(item) for item in prediction.get("recognizedSymptoms", [])],
        "recommendation": str(prediction.get("recommendation", "Review with a qualified healthcare professional.")),
        "modelVersion": str(prediction.get("modelVersion", "unknown")),
        "status": prediction.get("status", "prediction"),
        "triage": triage.as_dict(),
    }
    created_at = request.createdAt or datetime.now(timezone.utc)
    # Return the model result without waiting for a remote database connection.
    save_local_assessment(request, prediction, created_at, nurse_id)
    sync_status = "pending_sync"
    return {**request.model_dump(mode="json"), **prediction, "syncStatus": sync_status}


@router.post("/triage")
def triage_assessment(request: AssessmentRequest) -> dict[str, Any]:
    """Return deterministic triage without persisting an encounter."""
    return infer_triage(
        age=request.age,
        temperature=request.temperature,
        blood_pressure=request.bloodPressure,
        symptoms=request.symptoms,
    ).as_dict()


@router.post("/assessments", status_code=201)
def create_assessment(
    request: AssessmentRequest,
    background_tasks: BackgroundTasks,
    nurse: dict[str, str] = Depends(get_current_nurse),
) -> dict[str, Any]:
    response = process_assessment(request, nurse["id"])
    if response["syncStatus"] == "pending_sync":
        background_tasks.add_task(
            sync_assessment_to_postgres,
            request,
            response,
            request.createdAt or datetime.now(timezone.utc),
            nurse["id"],
        )
    return response


@router.post("/assessments/sync")
def sync_assessments(
    request: AssessmentSyncRequest,
    nurse: dict[str, str] = Depends(get_current_nurse),
) -> dict[str, Any]:
    synced = [process_assessment(assessment, nurse["id"]) for assessment in request.assessments]
    try:
        sync_local_assessments(nurse["id"])
    except Exception:
        pass
    return {
        "synced": sum(item["syncStatus"] == "synced" for item in synced),
        "assessments": synced,
    }


@router.get("/assessments")
def list_assessments(
    limit: int = Query(default=100, ge=1, le=500),
    nurse: dict[str, str] = Depends(get_current_nurse),
) -> dict[str, Any]:
    # SQLite is the local source of truth. PostgreSQL sync is optional and
    # should not hide records from the local FastAPI database.
    assessments = local_assessment_rows(limit, nurse["id"])
    return {"count": len(assessments), "assessments": assessments}


@router.get("/sync/status")
def sync_status(_nurse: dict[str, str] = Depends(get_current_nurse)) -> dict[str, Any]:
    ensure_local_schema()
    ensure_patients_schema()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        pending = connection.execute(
            "SELECT COUNT(*) FROM assessments WHERE sync_status = 'pending_sync'"
        ).fetchone()[0]
        total = connection.execute("SELECT COUNT(*) FROM assessments").fetchone()[0]
        conflicts = connection.execute(
            "SELECT COUNT(*) FROM assessments WHERE sync_status = 'conflict'"
        ).fetchone()[0]
        synced = connection.execute(
            "SELECT COUNT(*) FROM assessments WHERE sync_status = 'synced'"
        ).fetchone()[0]
    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        patient_pending = connection.execute(
            "SELECT COUNT(*) FROM patients WHERE sync_status = 'pending_sync'"
        ).fetchone()[0]
        patient_conflicts = connection.execute(
            "SELECT COUNT(*) FROM patients WHERE sync_status = 'conflict'"
        ).fetchone()[0]
        patient_total = connection.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
        patient_synced = connection.execute(
            "SELECT COUNT(*) FROM patients WHERE sync_status = 'synced'"
        ).fetchone()[0]
    return {
        "total": total + patient_total,
        "pending": pending + patient_pending,
        "pendingAssessments": pending,
        "pendingPatients": patient_pending,
        "synced": synced + patient_synced,
        "conflicts": conflicts + patient_conflicts,
        "postgresConfigured": bool(settings.database_url and psycopg is not None),
    }


@router.post("/sync/run")
def run_sync(nurse: dict[str, str] = Depends(get_current_nurse)) -> dict[str, int]:
    """Upload pending SQLite records when PostgreSQL is available."""
    if not settings.database_url or psycopg is None:
        return {"nurses": 0, "assessments": 0, "patients": 0}

    try:
        nurses = sync_local_nurses()
    except Exception:
        nurses = 0

    try:
        assessments = sync_local_assessments(nurse["id"])
    except Exception:
        assessments = 0

    try:
        patients = sync_local_patients(nurse["id"])
    except Exception:
        patients = 0

    return {
        "nurses": nurses,
        "assessments": assessments,
        "patients": patients,
    }


@router.get("/assessments/{assessment_id}")
def get_assessment(assessment_id: str, nurse: dict[str, str] = Depends(get_current_nurse)) -> dict[str, Any]:
    ensure_local_schema()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT * FROM assessments WHERE id = ? AND nurse_id = ?",
            (assessment_id, nurse["id"]),
        ).fetchone()
    if row is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Assessment not found.")
    assessment = row_to_response(dict(row))
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        nurse_row = connection.execute(
            "SELECT name FROM nurses WHERE id = ?", (row["nurse_id"],)
        ).fetchone()
    assessment["nurse_name"] = nurse_row[0] if nurse_row else "Unknown nurse"
    return assessment
