import sqlite3
from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient

import main
from routes import auth


class FakePostgresConnection:
    def __init__(self, fail=False):
        self.fail = fail
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def execute(self, query, parameters):
        if self.fail:
            raise RuntimeError("Postgres write failed")
        self.executed.append((query, parameters))


class FakePsycopg:
    def __init__(self, connection):
        self.connection = connection

    def connect(self, *_args, **_kwargs):
        return self.connection


def test_nurse_messages_are_authenticated_and_marked_delivered(tmp_path, monkeypatch):
    database_path = tmp_path / "auth.sqlite"
    monkeypatch.setattr(main, "AUTH_DATABASE_PATH", database_path)
    monkeypatch.setattr(auth, "AUTH_DATABASE_PATH", database_path)
    main.ensure_auth_schema()
    with sqlite3.connect(database_path) as connection:
        connection.executemany(
            "INSERT INTO nurses (id, email, name, password_hash, created_at, role) "
            "VALUES (?, ?, ?, ?, ?, 'nurse')",
            [
                ("nurse-a", "a@example.test", "Nurse A", "unused", "2026-01-01T00:00:00+00:00"),
                ("nurse-b", "b@example.test", "Nurse B", "unused", "2026-01-01T00:00:00+00:00"),
            ],
        )

    client = TestClient(main.app)
    nurse_a = {"Authorization": f"Bearer {main.issue_access_token('nurse-a')}"}
    nurse_b = {"Authorization": f"Bearer {main.issue_access_token('nurse-b')}"}

    assert client.get("/api/auth/messages/nurses", headers=nurse_a).json() == [
        {"id": "nurse-b", "name": "Nurse B"},
    ]
    sent = client.post(
        "/api/auth/messages/nurse-b",
        headers=nurse_a,
        json={"body": "  Check the supply delivery.  "},
    )
    assert sent.status_code == 201
    assert sent.json()["body"] == "Check the supply delivery."
    assert sent.json()["deliveredAt"] is None
    assert sent.json()["syncStatus"] == "pending_sync"

    received = client.get("/api/auth/messages/nurse-a", headers=nurse_b)
    assert received.status_code == 200
    assert received.json()[0]["id"] == sent.json()["id"]
    assert received.json()[0]["deliveredAt"]
    assert received.json()[0]["syncStatus"] == "pending_sync"

    assert client.get("/api/auth/messages/nurse-b", headers=nurse_a).json()[0]["deliveredAt"]
    assert client.get("/api/auth/messages/nurses").status_code == 401


def create_pending_message_database(path):
    with sqlite3.connect(path) as connection:
        connection.execute(
            """
            CREATE TABLE nurse_messages (
                id TEXT PRIMARY KEY,
                sender_id TEXT NOT NULL,
                recipient_id TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT NOT NULL,
                delivered_at TEXT,
                sync_status TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "INSERT INTO nurse_messages VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                "message-1",
                "nurse-a",
                "nurse-b",
                "Shift handoff",
                datetime(2026, 10, 6, tzinfo=timezone.utc).isoformat(),
                None,
                "pending_sync",
            ),
        )


def test_pending_messages_are_marked_synced_only_after_postgres_write(tmp_path, monkeypatch):
    database_path = tmp_path / "auth.sqlite"
    monkeypatch.setattr(auth, "AUTH_DATABASE_PATH", database_path)
    create_pending_message_database(database_path)

    remote = FakePostgresConnection()
    monkeypatch.setattr(auth, "settings", SimpleNamespace(database_url="postgresql://test"))
    monkeypatch.setattr(auth, "psycopg", FakePsycopg(remote))
    monkeypatch.setattr(auth, "ensure_message_schema", lambda: None)
    monkeypatch.setattr(auth, "ensure_postgres_schema", lambda: None)

    assert auth.sync_local_messages() == 1
    assert len(remote.executed) == 1
    assert remote.executed[0][1][:4] == ("message-1", "nurse-a", "nurse-b", "Shift handoff")
    with sqlite3.connect(database_path) as connection:
        status = connection.execute(
            "SELECT sync_status FROM nurse_messages WHERE id = 'message-1'"
        ).fetchone()[0]
    assert status == "synced"


def test_failed_message_upload_remains_pending(tmp_path, monkeypatch):
    database_path = tmp_path / "auth.sqlite"
    monkeypatch.setattr(auth, "AUTH_DATABASE_PATH", database_path)
    create_pending_message_database(database_path)

    monkeypatch.setattr(auth, "settings", SimpleNamespace(database_url="postgresql://test"))
    monkeypatch.setattr(auth, "psycopg", FakePsycopg(FakePostgresConnection(fail=True)))
    monkeypatch.setattr(auth, "ensure_message_schema", lambda: None)
    monkeypatch.setattr(auth, "ensure_postgres_schema", lambda: None)

    try:
        auth.sync_local_messages()
    except RuntimeError as error:
        assert str(error) == "Postgres write failed"
    else:
        raise AssertionError("Expected the Postgres write error to propagate")

    with sqlite3.connect(database_path) as connection:
        status = connection.execute(
            "SELECT sync_status FROM nurse_messages WHERE id = 'message-1'"
        ).fetchone()[0]
    assert status == "pending_sync"
