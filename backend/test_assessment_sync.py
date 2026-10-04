import json
import inspect
import logging
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import main
from routes import assessments


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    def fetchall(self):
        return self.rows


class FakePostgresConnection:
    def __init__(self, rows):
        self.rows = rows

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def execute(self, query, parameters):
        assert "WHERE nurse_id = %s" in query
        assert parameters == ("nurse-1",)
        return FakeCursor(self.rows)


class FakePsycopg:
    def __init__(self, rows):
        self.rows = rows

    def connect(self, *_args, **_kwargs):
        return FakePostgresConnection(self.rows)


def postgres_assessment(assessment_id, patient_name):
    return {
        "id": assessment_id,
        "nurse_id": "nurse-1",
        "patient_name": patient_name,
        "age": 34,
        "gender": "Female",
        "pregnant": False,
        "temperature": 36.8,
        "blood_pressure": "120/80",
        "symptoms": "headache",
        "created_at": datetime(2026, 10, 2, tzinfo=timezone.utc),
        "disease": "Example result",
        "confidence": 0.75,
        "predictions": [{"disease": "Example result", "confidence": 0.75}],
        "recommendation": "Review with a clinician.",
        "model_version": "test-model",
    }


class AssessmentSyncTests(unittest.TestCase):
    def test_sync_endpoints_accept_authenticated_admin_accounts(self):
        self.assertIs(
            inspect.signature(assessments.sync_status).parameters["_account"].default.dependency,
            main.get_current_account,
        )
        self.assertIs(
            inspect.signature(assessments.run_sync).parameters["account"].default.dependency,
            main.get_current_account,
        )

    def test_neon_sync_backoff_defers_retries_and_recovers(self):
        main.reset_postgres_sync_backoff()
        with mock.patch.object(main.time, "monotonic", return_value=100), \
                mock.patch.object(logging.Logger, "warning") as warning:
            self.assertEqual(main.defer_postgres_sync(), 1)
            self.assertFalse(main.should_attempt_postgres_sync())
            warning.assert_not_called()

        with mock.patch.object(main.time, "monotonic", return_value=101):
            self.assertTrue(main.should_attempt_postgres_sync())

        main.reset_postgres_sync_backoff()

    def test_remote_assessments_import_only_when_missing_locally(self):
        with tempfile.TemporaryDirectory() as temp_directory:
            database_path = Path(temp_directory) / "assessments.sqlite"
            fake_postgres = FakePsycopg([
                postgres_assessment("remote-1", "Cloud Patient"),
                postgres_assessment("pending-1", "Cloud Copy"),
            ])
            with (
                mock.patch.object(main, "LOCAL_DATABASE_PATH", database_path),
                mock.patch.object(main, "settings", SimpleNamespace(database_url="postgresql://test")),
                mock.patch.object(main, "psycopg", fake_postgres),
                mock.patch.object(main, "ensure_local_schema"),
                mock.patch.object(main, "ensure_postgres_schema"),
            ):
                with sqlite3.connect(database_path) as connection:
                    connection.execute(
                        """
                        CREATE TABLE assessments (
                            id TEXT PRIMARY KEY,
                            nurse_id TEXT,
                            patient_name TEXT NOT NULL,
                            age INTEGER NOT NULL,
                            gender TEXT NOT NULL,
                            pregnant INTEGER,
                            temperature REAL NOT NULL,
                            blood_pressure TEXT NOT NULL,
                            symptoms TEXT NOT NULL,
                            created_at TEXT NOT NULL,
                            disease TEXT,
                            confidence REAL,
                            predictions TEXT NOT NULL DEFAULT '[]',
                            recommendation TEXT NOT NULL DEFAULT '',
                            model_version TEXT NOT NULL DEFAULT 'unknown',
                            sync_status TEXT NOT NULL DEFAULT 'pending_sync'
                        )
                        """
                    )
                    connection.execute(
                        "INSERT INTO assessments (id, nurse_id, patient_name, age, gender, temperature, "
                        "blood_pressure, symptoms, created_at, sync_status) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (
                            "pending-1", "nurse-1", "Local Patient", 34, "Female", 36.8,
                            "120/80", "headache", "2026-10-02T00:00:00+00:00", "pending_sync",
                        ),
                    )
                connection.close()

                self.assertEqual(main.sync_postgres_assessments_to_local("nurse-1"), 1)
                self.assertEqual(main.sync_postgres_assessments_to_local("nurse-1"), 0)

                with sqlite3.connect(database_path) as connection:
                    rows = {
                        row[0]: row[1:]
                        for row in connection.execute(
                            "SELECT id, patient_name, sync_status, predictions FROM assessments"
                        )
                    }
                connection.close()

                self.assertEqual(rows["remote-1"][0:2], ("Cloud Patient", "synced"))
                self.assertEqual(
                    json.loads(rows["remote-1"][2]),
                    [{"disease": "Example result", "confidence": 0.75}],
                )
                self.assertEqual(rows["pending-1"][0:2], ("Local Patient", "pending_sync"))

    def test_sync_run_uploads_all_local_records_not_only_the_signed_in_nurse(self):
        with (
            mock.patch.object(assessments, "settings", SimpleNamespace(database_url="postgresql://test")),
            mock.patch.object(assessments, "psycopg", object()),
            mock.patch.object(assessments, "should_attempt_postgres_sync", return_value=True),
            mock.patch.object(assessments, "sync_local_nurses", return_value=2),
            mock.patch.object(assessments, "sync_local_assessments", return_value=4) as sync_assessments,
            mock.patch.object(assessments, "sync_postgres_assessments_to_local", return_value=1),
            mock.patch.object(assessments, "sync_local_patients", return_value=3) as sync_patients,
            mock.patch.object(assessments, "reset_postgres_sync_backoff") as reset_backoff,
        ):
            result = assessments.run_sync({"id": "nurse-1"})

        sync_assessments.assert_called_once_with()
        sync_patients.assert_called_once_with()
        reset_backoff.assert_called_once_with()
        self.assertEqual(result, {
            "nurses": 2,
            "assessments": 5,
            "downloadedAssessments": 1,
            "patients": 3,
        })

    def test_sync_run_surfaces_neon_failures_and_keeps_retry_queued(self):
        with (
            mock.patch.object(assessments, "settings", SimpleNamespace(database_url="postgresql://test")),
            mock.patch.object(assessments, "psycopg", object()),
            mock.patch.object(assessments, "should_attempt_postgres_sync", return_value=True),
            mock.patch.object(assessments, "sync_local_nurses", side_effect=RuntimeError("connection failed")),
            mock.patch.object(assessments, "defer_postgres_sync") as defer_sync,
            mock.patch.object(logging.Logger, "exception") as log_exception,
        ):
            with self.assertRaises(assessments.HTTPException) as raised:
                assessments.run_sync({"id": "nurse-1"})

        self.assertEqual(raised.exception.status_code, 503)
        self.assertIn("Local SQLite records remain queued", raised.exception.detail)
        defer_sync.assert_called_once_with()
        log_exception.assert_not_called()


if __name__ == "__main__":
    unittest.main()