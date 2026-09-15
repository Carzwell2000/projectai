import sqlite3
from typing import Any

from fastapi import APIRouter

from main import PATIENTS_DATABASE_PATH, PatientRequest, create_patient, ensure_patients_schema

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("", status_code=201)
def register_patient(request: PatientRequest) -> dict[str, Any]:
    return create_patient(request).model_dump(mode="json")


@router.get("")
def list_patients() -> dict[str, Any]:
    # SQLite keeps the original patient details. PostgreSQL stores an anonymized
    # copy for sync, so it must not be used to populate the patient picker.
    ensure_patients_schema()
    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute("SELECT * FROM patients ORDER BY created_at DESC").fetchall()
    patients = [
        {
            "id": row["id"],
            "name": row["name"],
            "phone": row["phone"],
            "dateOfBirth": row["date_of_birth"],
            "createdAt": row["created_at"],
            "syncStatus": row["sync_status"],
        }
        for row in rows
    ]
    return {"count": len(patients), "patients": patients}