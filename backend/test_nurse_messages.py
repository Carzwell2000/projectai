import sqlite3

from fastapi.testclient import TestClient

import main
from routes import auth


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

    received = client.get("/api/auth/messages/nurse-a", headers=nurse_b)
    assert received.status_code == 200
    assert received.json()[0]["id"] == sent.json()["id"]
    assert received.json()[0]["deliveredAt"]

    assert client.get("/api/auth/messages/nurse-b", headers=nurse_a).json()[0]["deliveredAt"]
    assert client.get("/api/auth/messages/nurses").status_code == 401
