import sqlite3
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Query

from main import (
    AssessmentRequest,
    AssessmentSyncRequest,
    LOCAL_DATABASE_PATH,
    ensure_local_schema,
    mark_local_assessment_synced,
    predict_assessment,
    save_local_assessment,
    save_postgres_assessment,
    settings,
    sync_local_assessments,
    sync_local_patients,
    psycopg,
    dict_row,
)

router = APIRouter(prefix="/api")


def row_to_response(row: dict[str, Any]) -> dict[str, Any]:
    predictions = row["predictions"]
    if isinstance(predictions, str):
        import json

        row["predictions"] = json.loads(predictions)
    return row


def local_assessment_rows(limit: int, sync_status: str | None) -> list[dict[str, Any]]:
    ensure_local_schema()
    query = "SELECT * FROM assessments"
    parameters: tuple[Any, ...] = ()
    if sync_status in {"pending_sync", "synced"}:
        query += " WHERE sync_status = ?"
        parameters = (sync_status,)
    query += " ORDER BY created_at DESC LIMIT ?"
    parameters += (limit,)

    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(query, parameters).fetchall()
    return [row_to_response(dict(row)) for row in rows]


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
) -> None:
    try:
        if settings.database_url and psycopg is not None:
            save_postgres_assessment(request, prediction, created_at)
            mark_local_assessment_synced(request.id)
    except Exception:
        pass


def process_assessment(request: AssessmentRequest) -> dict[str, Any]:
    prediction = predict_assessment(request.symptoms, request.temperature)
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
        "recommendation": str(prediction.get("recommendation", "Review with a qualified healthcare professional.")),
        "modelVersion": str(prediction.get("modelVersion", "unknown")),
        "status": prediction.get("status", "prediction"),
    }
    created_at = request.createdAt or datetime.now(timezone.utc)
    sync_status = "pending_sync"
    if settings.database_url and psycopg is not None:
        try:
            save_postgres_assessment(request, prediction, created_at)
            sync_status = "synced"
        except Exception:
            save_local_assessment(request, prediction, created_at)
    else:
        save_local_assessment(request, prediction, created_at)
    return {**request.model_dump(mode="json"), **prediction, "syncStatus": sync_status}


@router.post("/assessments", status_code=201)
def create_assessment(
    request: AssessmentRequest,
    background_tasks: BackgroundTasks,
) -> dict[str, Any]:
    response = process_assessment(request)
    if response["syncStatus"] == "pending_sync":
        background_tasks.add_task(
            sync_assessment_to_postgres,
            request,
            response,
            request.createdAt or datetime.now(timezone.utc),
        )
    return response


@router.post("/assessments/sync")
def sync_assessments(request: AssessmentSyncRequest) -> dict[str, Any]:
    synced = [process_assessment(assessment) for assessment in request.assessments]
    try:
        sync_local_assessments()
    except Exception:
        pass
    return {
        "synced": sum(item["syncStatus"] == "synced" for item in synced),
        "assessments": synced,
    }


@router.get("/assessments")
def list_assessments(
    limit: int = Query(default=100, ge=1, le=500),
    sync_status: str | None = Query(default=None),
) -> dict[str, Any]:
    try:
        assessments = (
            postgres_assessment_rows(limit, sync_status)
            if settings.database_url and psycopg is not None
            else local_assessment_rows(limit, sync_status)
        )
    except Exception:
        assessments = local_assessment_rows(limit, sync_status)
    return {"count": len(assessments), "assessments": assessments}


@router.get("/sync/status")
def sync_status() -> dict[str, Any]:
    ensure_local_schema()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        pending = connection.execute(
            "SELECT COUNT(*) FROM assessments WHERE sync_status = 'pending_sync'"
        ).fetchone()[0]
        total = connection.execute("SELECT COUNT(*) FROM assessments").fetchone()[0]
        patient_pending = connection.execute(
            "SELECT COUNT(*) FROM patients WHERE sync_status = 'pending_sync'"
        ).fetchone()[0]
        patient_total = connection.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
    return {
        "total": total + patient_total,
        "pending": pending + patient_pending,
        "synced": (total - pending) + (patient_total - patient_pending),
        "postgresConfigured": bool(settings.database_url and psycopg is not None),
    }


@router.post("/sync/run")
def run_sync() -> dict[str, int]:
    """Upload pending SQLite records when PostgreSQL is available."""
    if not settings.database_url or psycopg is None:
        return {"assessments": 0, "patients": 0}

    try:
        assessments = sync_local_assessments()
        patients = sync_local_patients()
    except Exception:
        return {"assessments": 0, "patients": 0}

    return {
        "assessments": assessments,
        "patients": patients,
    }


@router.get("/assessments/{assessment_id}")
def get_assessment(assessment_id: str) -> dict[str, Any]:
    if settings.database_url and psycopg is not None:
        try:
            with psycopg.connect(settings.database_url, connect_timeout=15, row_factory=dict_row) as connection:
                row = connection.execute(
                    "SELECT * FROM assessments WHERE id = %s", (assessment_id,)
                ).fetchone()
            if row is not None:
                return row_to_response(dict(row))
        except Exception:
            pass
    ensure_local_schema()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT * FROM assessments WHERE id = ?", (assessment_id,)
        ).fetchone()
    if row is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Assessment not found.")
    return row_to_response(dict(row))
