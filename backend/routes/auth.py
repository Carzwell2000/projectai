import sqlite3
import hmac
import hashlib
import json
import secrets
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from main import (
    AUTH_DATABASE_PATH,
    PATIENTS_DATABASE_PATH,
    NurseLoginRequest,
    NurseSignupRequest,
    PasswordChangeRequest,
    PasswordResetRequest,
    PasswordResetRequestCode,
    ensure_auth_schema,
    ensure_patients_schema,
    hash_password,
    issue_access_token,
    normalize_email,
    verify_password,
    get_current_nurse,
    get_current_account,
    get_current_admin,
    settings,
    revoke_access_token,
    bearer_scheme,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def session_response(row: sqlite3.Row) -> dict[str, object]:
    return {
        "accessToken": issue_access_token(row["id"]),
        "nurse": {"id": row["id"], "email": row["email"], "name": row["name"], "role": row["role"]},
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(request: NurseSignupRequest) -> dict[str, object]:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nurse accounts must be created by an administrator.")


@router.post("/login")
def login(request: NurseLoginRequest) -> dict[str, object]:
    ensure_auth_schema()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute("SELECT * FROM nurses WHERE email = ?", (normalize_email(request.email),)).fetchone()
    if row is None or not verify_password(request.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return session_response(row)


@router.post("/nurses", status_code=status.HTTP_201_CREATED)
def create_nurse(
    request: NurseSignupRequest,
    _: dict[str, str] = Depends(get_current_admin),
) -> dict[str, str]:
    ensure_auth_schema()
    email = normalize_email(request.email)
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        existing = connection.execute("SELECT 1 FROM nurses WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        nurse_id = f"nurse-{uuid4().hex}"
        connection.execute(
            "INSERT INTO nurses (id, email, name, password_hash, created_at, role) VALUES (?, ?, ?, ?, ?, 'nurse')",
            (nurse_id, email, request.name.strip(), hash_password(request.password), datetime.now(timezone.utc).isoformat()),
        )
    return {"id": nurse_id, "email": email, "name": request.name.strip(), "role": "nurse"}


@router.get("/nurses")
def list_nurses(_: dict[str, str] = Depends(get_current_admin)) -> list[dict[str, str]]:
    ensure_auth_schema()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT id, email, name, role, created_at FROM nurses WHERE role = 'nurse' ORDER BY name"
        ).fetchall()
    return [dict(row) for row in rows]


@router.get("/patients/unsynced")
def list_unsynced_patients(_: dict[str, str] = Depends(get_current_admin)) -> list[dict[str, str]]:
    ensure_patients_schema()
    ensure_auth_schema()
    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        patient_rows = connection.execute(
            """
            SELECT id, name, phone, date_of_birth, created_at, sync_status, nurse_id
            FROM patients
            WHERE sync_status != 'synced'
            ORDER BY created_at DESC
            """
        ).fetchall()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        nurse_rows = connection.execute("SELECT id, name FROM nurses").fetchall()
    nurse_names = {row["id"]: row["name"] for row in nurse_rows}
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "phone": row["phone"],
            "dateOfBirth": row["date_of_birth"],
            "createdAt": row["created_at"],
            "syncStatus": row["sync_status"],
            "registeredBy": nurse_names.get(row["nurse_id"], "Unknown nurse"),
        }
        for row in patient_rows
    ]


@router.delete("/nurses/{nurse_id}")
def delete_nurse(
    nurse_id: str,
    _: dict[str, str] = Depends(get_current_admin),
) -> dict[str, str]:
    ensure_auth_schema()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        row = connection.execute(
            "SELECT role FROM nurses WHERE id = ?", (nurse_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Nurse account not found.")
        if row[0] != "nurse":
            raise HTTPException(status_code=400, detail="The administrator account cannot be deleted.")
        connection.execute("DELETE FROM nurses WHERE id = ?", (nurse_id,))
    return {"status": "nurse_deleted"}


@router.post("/password/change")
def change_password(
    request: PasswordChangeRequest,
    account: dict[str, str] = Depends(get_current_account),
) -> dict[str, str]:
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        row = connection.execute(
            "SELECT password_hash FROM nurses WHERE id = ?", (account["id"],)
        ).fetchone()
        if row is None or not verify_password(request.currentPassword, row[0]):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        connection.execute(
            "UPDATE nurses SET password_hash = ? WHERE id = ?",
            (hash_password(request.newPassword), account["id"]),
        )
    return {"status": "password_changed"}


@router.post("/password/reset")
def reset_password(request: PasswordResetRequest) -> dict[str, str]:
    ensure_auth_schema()
    email = normalize_email(request.email)
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        row = connection.execute(
            "SELECT code_hash, expires_at FROM password_reset_codes WHERE email = ?", (email,)
        ).fetchone()
    if row is None or datetime.fromisoformat(row[1]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid password reset code.")
    code_hash = hashlib.sha256(request.resetCode.encode()).hexdigest()
    if not hmac.compare_digest(code_hash, row[0]):
        raise HTTPException(status_code=400, detail="Invalid password reset code.")
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        nurse = connection.execute(
            "SELECT id FROM nurses WHERE email = ?", (email,)
        ).fetchone()
        if nurse is None:
            raise HTTPException(status_code=400, detail="Unable to reset this account.")
        connection.execute(
            "UPDATE nurses SET password_hash = ? WHERE id = ?",
            (hash_password(request.newPassword), nurse[0]),
        )
        connection.execute("DELETE FROM password_reset_codes WHERE email = ?", (email,))
    return {"status": "password_reset"}


@router.post("/password/request")
def request_password_reset(request: PasswordResetRequestCode) -> dict[str, str]:
    ensure_auth_schema()
    email = normalize_email(request.email)
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        exists = connection.execute("SELECT 1 FROM nurses WHERE email = ?", (email,)).fetchone()
    if exists is not None:
        if not settings.resend_api_key:
            raise HTTPException(status_code=503, detail="Password reset email is not configured.")
        code = f"{secrets.randbelow(1_000_000):06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
            connection.execute(
                """
                INSERT INTO password_reset_codes (email, code_hash, expires_at)
                VALUES (?, ?, ?)
                ON CONFLICT(email) DO UPDATE SET
                    code_hash = excluded.code_hash,
                    expires_at = excluded.expires_at
                """,
                (email, hashlib.sha256(code.encode()).hexdigest(), expires_at.isoformat()),
            )
        payload = json.dumps(
            {
                "from": settings.resend_from_email,
                "to": [email],
                "subject": "Your password reset code",
                "text": f"Your password reset code is {code}. It expires in 10 minutes.",
            }
        ).encode()
        request_message = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request_message, timeout=15):
                pass
        except (urllib.error.HTTPError, urllib.error.URLError) as error:
            raise HTTPException(status_code=502, detail="Unable to send the password reset email.") from error
    return {"status": "reset_code_sent"}


@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    _: dict[str, str] = Depends(get_current_account),
) -> dict[str, str]:
    if credentials is not None:
        revoke_access_token(credentials.credentials)
    return {"status": "signed_out"}
