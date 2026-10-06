import sqlite3
import hmac
import hashlib
import json
import secrets
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from main import (
    AUTH_DATABASE_PATH,
    LOCAL_DATABASE_PATH,
    PATIENTS_DATABASE_PATH,
    NurseLoginRequest,
    NurseSignupRequest,
    PasswordChangeRequest,
    PasswordResetRequest,
    PasswordResetRequestCode,
    ensure_auth_schema,
    ensure_local_schema,
    ensure_patients_schema,
    ensure_postgres_schema,
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
    psycopg,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class NurseMessageRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


def ensure_message_schema() -> None:
    ensure_auth_schema()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS nurse_messages (
                id TEXT PRIMARY KEY NOT NULL,
                sender_id TEXT NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
                recipient_id TEXT NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
                body TEXT NOT NULL,
                created_at TEXT NOT NULL,
                delivered_at TEXT,
                sync_status TEXT NOT NULL DEFAULT 'pending_sync'
            )
            """
        )
        try:
            connection.execute(
                "ALTER TABLE nurse_messages ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending_sync'"
            )
        except sqlite3.OperationalError:
            pass
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_nurse_messages_conversation "
            "ON nurse_messages(sender_id, recipient_id, created_at)"
        )


def sync_local_messages() -> int:
    if not settings.database_url or psycopg is None:
        return 0

    ensure_message_schema()
    ensure_postgres_schema()
    with sqlite3.connect(AUTH_DATABASE_PATH) as local_connection:
        local_connection.row_factory = sqlite3.Row
        rows = local_connection.execute(
            "SELECT id, sender_id, recipient_id, body, created_at, delivered_at "
            "FROM nurse_messages WHERE sync_status = 'pending_sync' ORDER BY created_at, id"
        ).fetchall()

    if not rows:
        return 0

    with psycopg.connect(settings.database_url, connect_timeout=15) as remote_connection:
        for row in rows:
            remote_connection.execute(
                """
                INSERT INTO nurse_messages
                    (id, sender_id, recipient_id, body, created_at, delivered_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    sender_id = EXCLUDED.sender_id,
                    recipient_id = EXCLUDED.recipient_id,
                    body = EXCLUDED.body,
                    created_at = EXCLUDED.created_at,
                    delivered_at = EXCLUDED.delivered_at
                """,
                (
                    row["id"],
                    row["sender_id"],
                    row["recipient_id"],
                    row["body"],
                    datetime.fromisoformat(row["created_at"]),
                    datetime.fromisoformat(row["delivered_at"]) if row["delivered_at"] else None,
                ),
            )

    with sqlite3.connect(AUTH_DATABASE_PATH) as local_connection:
        updated = local_connection.executemany(
            """
            UPDATE nurse_messages
            SET sync_status = 'synced'
            WHERE id = ? AND delivered_at IS ? AND sync_status = 'pending_sync'
            """,
            [(row["id"], row["delivered_at"]) for row in rows],
        )
    return updated.rowcount


def require_message_contact(contact_id: str, account_id: str) -> None:
    if contact_id == account_id:
        raise HTTPException(status_code=400, detail="You cannot start a conversation with yourself.")
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        contact = connection.execute(
            "SELECT 1 FROM nurses WHERE id = ? AND role = 'nurse'", (contact_id,)
        ).fetchone()
    if contact is None:
        raise HTTPException(status_code=404, detail="Nurse account not found.")


@router.get("/messages/nurses")
def list_message_nurses(account: dict[str, str] = Depends(get_current_account)) -> list[dict[str, str]]:
    ensure_message_schema()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT id, name FROM nurses WHERE role = 'nurse' AND id != ? ORDER BY name",
            (account["id"],),
        ).fetchall()
    return [dict(row) for row in rows]


@router.get("/messages/{nurse_id}")
def list_nurse_messages(
    nurse_id: str,
    account: dict[str, str] = Depends(get_current_account),
) -> list[dict[str, str | None]]:
    ensure_message_schema()
    require_message_contact(nurse_id, account["id"])
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.execute(
            "UPDATE nurse_messages SET delivered_at = ?, sync_status = 'pending_sync' "
            "WHERE sender_id = ? AND recipient_id = ? AND delivered_at IS NULL",
            (now, nurse_id, account["id"]),
        )
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT id, sender_id, recipient_id, body, created_at, delivered_at, sync_status
            FROM nurse_messages
            WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
            ORDER BY created_at, id
            """,
            (account["id"], nurse_id, nurse_id, account["id"]),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "senderId": row["sender_id"],
            "recipientId": row["recipient_id"],
            "body": row["body"],
            "createdAt": row["created_at"],
            "deliveredAt": row["delivered_at"],
            "syncStatus": row["sync_status"],
        }
        for row in rows
    ]


@router.post("/messages/{nurse_id}", status_code=status.HTTP_201_CREATED)
def send_nurse_message(
    nurse_id: str,
    request: NurseMessageRequest,
    account: dict[str, str] = Depends(get_current_account),
) -> dict[str, str | None]:
    ensure_message_schema()
    require_message_contact(nurse_id, account["id"])
    body = request.body.strip()
    if not body:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")
    message = {
        "id": f"message-{uuid4().hex}",
        "senderId": account["id"],
        "recipientId": nurse_id,
        "body": body,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "deliveredAt": None,
        "syncStatus": "pending_sync",
    }
    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        connection.execute(
            "INSERT INTO nurse_messages (id, sender_id, recipient_id, body, created_at, sync_status) "
            "VALUES (?, ?, ?, ?, ?, 'pending_sync')",
            (message["id"], account["id"], nurse_id, body, message["createdAt"]),
        )
    return message


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


@router.get("/admin/analytics")
def admin_analytics(_: dict[str, str] = Depends(get_current_admin)) -> dict[str, object]:
    ensure_local_schema()
    ensure_patients_schema()
    ensure_auth_schema()

    today = datetime.now(timezone.utc).date()
    first_day = today - timedelta(days=6)
    with sqlite3.connect(LOCAL_DATABASE_PATH) as connection:
        total_assessments = connection.execute("SELECT COUNT(*) FROM assessments").fetchone()[0]
        pending_assessments = connection.execute(
            "SELECT COUNT(*) FROM assessments WHERE sync_status != 'synced'"
        ).fetchone()[0]
        conflict_count = connection.execute(
            "SELECT COUNT(*) FROM assessments WHERE sync_status = 'conflict'"
        ).fetchone()[0]
        daily_rows = connection.execute(
            """
            SELECT date(created_at), COUNT(*)
            FROM assessments
            WHERE date(created_at) >= ?
            GROUP BY date(created_at)
            """,
            (first_day.isoformat(),),
        ).fetchall()
        nurse_rows = connection.execute(
            "SELECT nurse_id, COUNT(*) FROM assessments GROUP BY nurse_id ORDER BY COUNT(*) DESC"
        ).fetchall()
        disease_rows = connection.execute(
            """
            SELECT COALESCE(NULLIF(TRIM(disease), ''), 'Unknown'), COUNT(*)
            FROM assessments
            GROUP BY COALESCE(NULLIF(TRIM(disease), ''), 'Unknown')
            ORDER BY COUNT(*) DESC
            LIMIT 5
            """
        ).fetchall()

    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        total_patients = connection.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
        pending_patients = connection.execute(
            "SELECT COUNT(*) FROM patients WHERE sync_status != 'synced'"
        ).fetchone()[0]
        patient_daily_rows = connection.execute(
            """
            SELECT date(created_at), COUNT(*)
            FROM patients
            WHERE date(created_at) >= ?
            GROUP BY date(created_at)
            """,
            (first_day.isoformat(),),
        ).fetchall()

    with sqlite3.connect(AUTH_DATABASE_PATH) as connection:
        nurse_names = dict(connection.execute(
            "SELECT id, name FROM nurses WHERE role = 'nurse'"
        ).fetchall())
        total_nurses = len(nurse_names)
        nurse_daily_rows = connection.execute(
            """
            SELECT date(created_at), COUNT(*)
            FROM nurses
            WHERE role = 'nurse' AND date(created_at) >= ?
            GROUP BY date(created_at)
            """,
            (first_day.isoformat(),),
        ).fetchall()

    daily_counts = {day: count for day, count in daily_rows if day}
    patient_daily_counts = {day: count for day, count in patient_daily_rows if day}
    nurse_daily_counts = {day: count for day, count in nurse_daily_rows if day}
    nurse_assessment_counts: dict[str, int] = {}
    for nurse_id, count in nurse_rows:
        label = nurse_names.get(nurse_id, "Unassigned")
        nurse_assessment_counts[label] = nurse_assessment_counts.get(label, 0) + count
    return {
        "totals": {
            "assessments": total_assessments,
            "patients": total_patients,
            "nurses": total_nurses,
            "pendingSync": pending_assessments + pending_patients,
            "conflicts": conflict_count,
        },
        "dailyAssessments": [
            {
                "date": (first_day + timedelta(days=offset)).isoformat(),
                "label": (first_day + timedelta(days=offset)).strftime("%a"),
                "value": daily_counts.get((first_day + timedelta(days=offset)).isoformat(), 0),
            }
            for offset in range(7)
        ],
        "dailyPatients": [
            {
                "date": (first_day + timedelta(days=offset)).isoformat(),
                "label": (first_day + timedelta(days=offset)).strftime("%a"),
                "value": patient_daily_counts.get((first_day + timedelta(days=offset)).isoformat(), 0),
            }
            for offset in range(7)
        ],
        "dailyNurses": [
            {
                "date": (first_day + timedelta(days=offset)).isoformat(),
                "label": (first_day + timedelta(days=offset)).strftime("%a"),
                "value": nurse_daily_counts.get((first_day + timedelta(days=offset)).isoformat(), 0),
            }
            for offset in range(7)
        ],
        "assessmentsByNurse": [
            {"label": name, "value": count}
            for name, count in sorted(nurse_assessment_counts.items(), key=lambda item: item[1], reverse=True)[:10]
        ],
        "topDiseases": [{"label": disease, "value": count} for disease, count in disease_rows],
    }


@router.get("/patients/unsynced")
def list_unsynced_patients(_: dict[str, str] = Depends(get_current_admin)) -> list[dict[str, str]]:
    ensure_patients_schema()
    ensure_auth_schema()
    with sqlite3.connect(PATIENTS_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        patient_rows = connection.execute(
            """
            SELECT id, name, phone, date_of_birth, email, address, created_at, sync_status, nurse_id
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
            "email": row["email"],
            "address": row["address"],
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
