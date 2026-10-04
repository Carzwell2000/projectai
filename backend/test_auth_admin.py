import sqlite3
from types import SimpleNamespace

import main
from routes import auth


def test_admin_login_uses_current_configured_password(tmp_path, monkeypatch):
    database_path = tmp_path / "auth.sqlite"
    email = "admin@example.test"
    monkeypatch.setattr(main, "AUTH_DATABASE_PATH", database_path)
    monkeypatch.setattr(auth, "AUTH_DATABASE_PATH", database_path)
    monkeypatch.setattr(
        main,
        "settings",
        SimpleNamespace(admin_email=None, admin_password=None),
    )
    main.ensure_auth_schema()

    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "INSERT INTO nurses (id, email, name, password_hash, created_at, role) "
            "VALUES (?, ?, ?, ?, ?, 'admin')",
            (
                "admin",
                email,
                "Administrator",
                main.hash_password("previous-password"),
                "2026-01-01T00:00:00+00:00",
            ),
        )

    monkeypatch.setattr(
        main,
        "settings",
        SimpleNamespace(
            admin_email=email,
            admin_password="current-password",
            auth_secret="test-auth-secret",
        ),
    )

    response = auth.login(main.NurseLoginRequest(email=email, password="current-password"))

    assert response["nurse"]["role"] == "admin"
    assert response["nurse"]["email"] == email
