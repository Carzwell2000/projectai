import sqlite3
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import main
from routes import assessments, auth


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


def test_admin_can_create_primary_healthcare_account(tmp_path, monkeypatch):
    database_path = tmp_path / "auth.sqlite"
    monkeypatch.setattr(main, "AUTH_DATABASE_PATH", database_path)
    monkeypatch.setattr(auth, "AUTH_DATABASE_PATH", database_path)
    main.ensure_auth_schema()

    response = auth.create_nurse(
        main.NurseSignupRequest(
            email="worker@example.test",
            name="Primary Worker",
            password="temporary-password",
            role="primary_healthcare",
        ),
        {"id": "admin", "role": "admin"},
    )
    accounts = auth.list_nurses({"id": "admin", "role": "admin"})

    assert response["role"] == "primary_healthcare"
    assert len(accounts) == 1
    assert accounts[0]["id"] == response["id"]
    assert accounts[0]["role"] == "primary_healthcare"
    assert accounts[0]["name"] == "Primary Worker"


def test_primary_healthcare_response_hides_recommendations_without_mutating_saved_result():
    saved_result = {
        "disease": "Example disease",
        "recommendation": "See a clinician",
        "triage": {"level": "urgent"},
        "clinicalSignals": [{"meaning": "Urgent review"}],
        "predictedDiseases": [
            {"disease": "Example disease", "recommendation": "Treatment guidance"}
        ],
    }

    visible_result = main.for_staff_role(saved_result, "primary_healthcare")

    assert "recommendation" not in visible_result
    assert "triage" not in visible_result
    assert "clinicalSignals" not in visible_result
    assert "recommendation" not in visible_result["predictedDiseases"][0]
    assert saved_result["recommendation"] == "See a clinician"
    assert saved_result["predictedDiseases"][0]["recommendation"] == "Treatment guidance"
    assert main.for_staff_role(saved_result, "nurse") is saved_result


def test_primary_healthcare_cannot_request_triage_recommendations():
    request = main.AssessmentRequest(
        id="assessment-test",
        patientName="Test Patient",
        age=30,
        gender="Male",
        temperature=36.8,
        bloodPressure="120/80",
        symptoms="mild cough",
    )

    with pytest.raises(HTTPException) as error:
        assessments.triage_assessment(request, {"role": "primary_healthcare"})

    assert error.value.status_code == 403
