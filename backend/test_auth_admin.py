import sqlite3
from io import BytesIO
from types import SimpleNamespace
from xml.etree import ElementTree
from zipfile import ZipFile
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


def test_primary_healthcare_response_preserves_triage_and_hides_disease_recommendations():
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
    assert visible_result["triage"] == saved_result["triage"]
    assert "clinicalSignals" not in visible_result
    assert "recommendation" not in visible_result["predictedDiseases"][0]
    assert saved_result["recommendation"] == "See a clinician"
    assert saved_result["predictedDiseases"][0]["recommendation"] == "Treatment guidance"
    assert main.for_staff_role(saved_result, "nurse") is saved_result


def test_primary_healthcare_can_request_triage_priority():
    request = main.AssessmentRequest(
        id="assessment-test",
        patientName="Test Patient",
        age=30,
        gender="Male",
        temperature=36.8,
        bloodPressure="120/80",
        symptoms="mild cough",
    )

    result = assessments.triage_assessment(request, {"role": "primary_healthcare"})

    assert result["level"] == "routine"
    assert result["action"]


def test_admin_analytics_reports_assessment_usage_by_staff_role(tmp_path, monkeypatch):
    auth_path = tmp_path / "auth.sqlite"
    assessments_path = tmp_path / "assessments.sqlite"
    patients_path = tmp_path / "patients.sqlite"
    monkeypatch.setattr(main, "AUTH_DATABASE_PATH", auth_path)
    monkeypatch.setattr(main, "LOCAL_DATABASE_PATH", assessments_path)
    monkeypatch.setattr(main, "PATIENTS_DATABASE_PATH", patients_path)
    monkeypatch.setattr(auth, "AUTH_DATABASE_PATH", auth_path)
    monkeypatch.setattr(auth, "LOCAL_DATABASE_PATH", assessments_path)
    monkeypatch.setattr(auth, "PATIENTS_DATABASE_PATH", patients_path)
    test_settings = SimpleNamespace(admin_email=None, admin_password=None)
    monkeypatch.setattr(main, "settings", test_settings)
    monkeypatch.setattr(auth, "settings", test_settings)

    main.ensure_auth_schema()
    main.ensure_local_schema()
    main.ensure_patients_schema()
    with sqlite3.connect(auth_path) as connection:
        connection.executemany(
            "INSERT INTO nurses (id, email, name, password_hash, created_at, role) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            [
                ("nurse-1", "nurse1@example.test", "Nurse One", "hash", "2026-01-01", "nurse"),
                ("primary-1", "primary1@example.test", "Primary One", "hash", "2026-01-01", "primary_healthcare"),
            ],
        )
    with sqlite3.connect(assessments_path) as connection:
        connection.executemany(
            "INSERT INTO assessments "
            "(id, nurse_id, patient_name, age, temperature, blood_pressure, symptoms, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                ("nurse-assessment-1", "nurse-1", "Patient 1", 30, 37, "120/80", "cough", "2026-01-01"),
                ("nurse-assessment-2", "nurse-1", "Patient 2", 30, 37, "120/80", "cough", "2026-01-01"),
                ("nurse-assessment-3", "nurse-1", "Patient 3", 30, 37, "120/80", "cough", "2026-01-01"),
                ("primary-assessment-1", "primary-1", "Patient 4", 30, 37, "120/80", "cough", "2026-01-01"),
                ("unassigned-assessment-1", "missing-staff", "Patient 5", 30, 37, "120/80", "cough", "2026-01-01"),
            ],
        )

    response = auth.admin_analytics({"id": "admin", "role": "admin"})

    assert response["assessmentUsageByRole"] == [
        {"label": "Nurses", "role": "nurse", "value": 3},
        {"label": "Village health workers", "role": "primary_healthcare", "value": 1},
    ]


def test_admin_assessments_lists_all_staff_records_with_staff_names(tmp_path, monkeypatch):
    auth_path = tmp_path / "auth.sqlite"
    assessments_path = tmp_path / "assessments.sqlite"
    monkeypatch.setattr(main, "AUTH_DATABASE_PATH", auth_path)
    monkeypatch.setattr(main, "LOCAL_DATABASE_PATH", assessments_path)
    monkeypatch.setattr(auth, "AUTH_DATABASE_PATH", auth_path)
    monkeypatch.setattr(auth, "LOCAL_DATABASE_PATH", assessments_path)
    test_settings = SimpleNamespace(admin_email=None, admin_password=None)
    monkeypatch.setattr(main, "settings", test_settings)
    monkeypatch.setattr(auth, "settings", test_settings)

    main.ensure_auth_schema()
    main.ensure_local_schema()
    with sqlite3.connect(auth_path) as connection:
        connection.executemany(
            "INSERT INTO nurses (id, email, name, password_hash, created_at, role) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            [
                ("nurse-1", "nurse1@example.test", "Nurse One", "hash", "2026-01-01", "nurse"),
                ("nurse-2", "nurse2@example.test", "Nurse Two", "hash", "2026-01-01", "primary_healthcare"),
            ],
        )
    with sqlite3.connect(assessments_path) as connection:
        connection.executemany(
            "INSERT INTO assessments "
            "(id, nurse_id, patient_name, age, temperature, blood_pressure, symptoms, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                ("assessment-1", "nurse-1", "Patient One", 30, 37, "120/80", "cough", "2026-01-01"),
                ("assessment-2", "nurse-2", "Patient Two", 40, 38, "130/80", "fever", "2026-01-02"),
            ],
        )

    response = auth.admin_assessments({"id": "admin", "role": "admin"})

    assert response["count"] == 2
    assert [item["id"] for item in response["assessments"]] == ["assessment-2", "assessment-1"]
    assert [item["nurse_name"] for item in response["assessments"]] == ["Nurse Two", "Nurse One"]
    assert [item["staff_role"] for item in response["assessments"]] == ["primary_healthcare", "nurse"]


def test_admin_assessment_export_contains_clinic_records_and_symptoms(tmp_path, monkeypatch):
    auth_path = tmp_path / "auth.sqlite"
    assessments_path = tmp_path / "assessments.sqlite"
    monkeypatch.setattr(main, "AUTH_DATABASE_PATH", auth_path)
    monkeypatch.setattr(main, "LOCAL_DATABASE_PATH", assessments_path)
    monkeypatch.setattr(auth, "AUTH_DATABASE_PATH", auth_path)
    monkeypatch.setattr(auth, "LOCAL_DATABASE_PATH", assessments_path)
    test_settings = SimpleNamespace(admin_email=None, admin_password=None)
    monkeypatch.setattr(main, "settings", test_settings)
    monkeypatch.setattr(auth, "settings", test_settings)

    main.ensure_auth_schema()
    main.ensure_local_schema()
    with sqlite3.connect(auth_path) as connection:
        connection.executemany(
            "INSERT INTO nurses (id, email, name, password_hash, created_at, role) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            [
                ("nurse-1", "nurse1@example.test", "Nurse One", "hash", "2026-01-01", "nurse"),
                ("phc-1", "phc@example.test", "Health Worker One", "hash", "2026-01-01", "primary_healthcare"),
            ],
        )
    with sqlite3.connect(assessments_path) as connection:
        connection.execute(
            "INSERT INTO assessments "
            "(id, nurse_id, patient_name, age, gender, temperature, blood_pressure, symptoms, "
            "created_at, disease, confidence, recommendation, sync_status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "assessment-1",
                "nurse-1",
                "Patient One",
                34,
                "Female",
                38.2,
                "120/80",
                "=HYPERLINK(\"https://example.test\",\"fever\")",
                "2026-11-11T12:00:00+00:00",
                "Example result",
                0.875,
                "Review with a healthcare professional.",
                "synced",
            ),
        )
        connection.execute(
            "INSERT INTO assessments "
            "(id, nurse_id, patient_name, age, temperature, blood_pressure, symptoms, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("assessment-2", "phc-1", "Patient Two", 40, 37, "110/70", "headache", "2026-11-10"),
        )

    response = auth.export_admin_assessments(
        {"id": "admin", "role": "admin"}, staff_role="nurse"
    )
    with ZipFile(BytesIO(response.body)) as workbook:
        worksheet = ElementTree.fromstring(workbook.read("xl/worksheets/sheet1.xml"))

    assert response.media_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    namespace = {"sheet": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    cells = {
        cell.attrib["r"]: cell
        for cell in worksheet.findall(".//sheet:c", namespace)
    }
    def cell_text(reference):
        return cells[reference].find("sheet:is/sheet:t", namespace).text

    headers = [cell_text(f"{column}1") for column in "ABCDEFGHIJKLM"]
    assert cell_text("H1") == "Symptoms"
    assert cell_text("H2") == '=HYPERLINK("https://example.test","fever")'
    assert cell_text("L2") == "Nurse One"
    assert "Model version" not in headers
    assert worksheet.find("sheet:sheetViews/sheet:sheetView/sheet:pane", namespace).attrib["topLeftCell"] == "A2"
    assert worksheet.find("sheet:autoFilter", namespace).attrib["ref"] == "A1:M2"

    primary_response = auth.export_admin_assessments(
        {"id": "admin", "role": "admin"}, staff_role="primary_healthcare"
    )
    with ZipFile(BytesIO(primary_response.body)) as workbook:
        primary_worksheet = ElementTree.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
    primary_cells = {
        cell.attrib["r"]: cell
        for cell in primary_worksheet.findall(".//sheet:c", namespace)
    }
    assert primary_cells["A2"].find("sheet:is/sheet:t", namespace).text == "Patient Two"
    primary_headers = [
        primary_cells[f"{column}1"].find("sheet:is/sheet:t", namespace).text
        for column in "ABCDEFGHIJKL"
    ]
    assert "Recommendation" not in primary_headers
    assert primary_cells["K2"].find("sheet:is/sheet:t", namespace).text == "Health Worker One"
    assert primary_worksheet.find("sheet:autoFilter", namespace).attrib["ref"] == "A1:L2"
