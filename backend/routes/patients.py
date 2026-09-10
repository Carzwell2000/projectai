import sqlite3
from typing import Any

from fastapi import APIRouter

from main import LOCAL_DATABASE_PATH, PatientRequest, create_patient, ensure_local_schema, sync_local_patients, settings, psycopg, dict_row

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("", status_code=201)
def register_patient(request: PatientRequest) -> dict[str, Any]:
    return create_patient(request).model_dump(mode="json")


@router.get("")
def list_patients() -> dict[str, Any]:
    if settings.database_url and psycopg is not None:
        try:
            with psycopg.connect(settings.database_url, connect_timeout=15, row_factory=dict_row) as connection:
                rows = connection.execute("SELECT * FROM patients ORDER BY created_at DESC").fetchall()
            patients = [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "phone": row["phone"],
                    "dateOfBirth": row["date_of_birth"],
                    "condition": row["condition"],
                    "createdAt": row["created_at"],
                    "syncStatus": row["sync_status"],
                }
                for row in rows
            ]
            return {"count": len(patients), "patients": patients}
        except Exception:
            pass
    ensure_local_schema()
    sync_local_patients()
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute("SELECT * FROM patients ORDER BY created_at DESC").fetchall()
    patients = [
        {
            "id": row["id"],
            "name": row["name"],
            "phone": row["phone"],
            "dateOfBirth": row["date_of_birth"],
            "condition": row["condition"],
            "createdAt": row["created_at"],
            "syncStatus": row["sync_status"],
        }
        for row in rows
    ]
    return {"count": len(patients), "patients": patients}