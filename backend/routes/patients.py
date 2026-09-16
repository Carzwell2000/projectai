import sqlite3
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends

from main import (
    PATIENTS_DATABASE_PATH,
    AUTH_DATABASE_PATH,
    PatientRequest,
    create_patient,
    ensure_patients_schema,
    get_current_nurse,
    sync_local_patients,
)

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("", status_code=201)
def register_patient(
    request: PatientRequest,
    background_tasks: BackgroundTasks,
    nurse: dict[str, str] = Depends(get_current_nurse),
) -> dict[str, Any]:
    patient = create_patient(request, nurse["id"], nurse["name"])
    background_tasks.add_task(sync_local_patients, nurse["id"])
    return patient.model_dump(mode="json")


@router.get("")
def list_patients(nurse: dict[str, str] = Depends(get_current_nurse)) -> dict[str, Any]:
    # SQLite keeps the original patient details. PostgreSQL stores an anonymized
    # copy for sync, so it must not be used to populate the patient picker.
    ensure_patients_schema()
    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute("SELECT * FROM patients ORDER BY created_at DESC").fetchall()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        nurse_rows = connection.execute("SELECT id, name FROM nurses").fetchall()
    nurse_names = {row["id"]: row["name"] for row in nurse_rows}
    patients = [
        {
            "id": row["id"],
            "name": row["name"],
            "phone": row["phone"],
            "dateOfBirth": row["date_of_birth"],
            "createdAt": row["created_at"],
            "syncStatus": row["sync_status"],
            "registeredBy": nurse_names.get(row["nurse_id"], "Unknown nurse"),
        }
        for row in rows
    ]
    return {"count": len(patients), "patients": patients}