# FastAPI mobile API

FastAPI loads the trained XGBoost artifact from `disease_model.joblib`, predicts
assessments, and stores them in the backend-owned `assessments.db` SQLite database.
When Neon Postgres is available, pending local rows are synchronized automatically.

Start the API from the project root:

```bash
npm.cmd run api
```

Or start it from the `backend` directory:

```powershell
Set-Location backend
.\start_api.ps1
```

The server must bind to `0.0.0.0` for a physical phone to reach it. The
React Native app uses `EXPO_PUBLIC_API_URL` from `offlineai/.env.local`; copy
the LAN URL from `offlineai/.env.example` and change it when your computer's
Wi-Fi address changes. Android emulators should use `http://10.0.2.2:8000`.

Open the API in a browser at `http://127.0.0.1:8000/` or check
`http://127.0.0.1:8000/health`. The `0.0.0.0` address is only a server bind
address and must not be entered in a browser URL.

The mobile app sends requests to `http://YOUR_COMPUTER_IP:8000` when running on a
physical device. The API accepts these routes:

- `GET /health` returns backend and database status.
- `POST /api/predict` predicts without saving an assessment.
- `POST /api/explain` returns SHAP feature explanations.
- `POST /api/assessments` predicts and saves one assessment.
- `GET /api/assessments` returns local assessment history.
- `GET /api/assessments/{id}` returns one assessment.
- `POST /api/assessments/sync` processes queued assessment requests.
- `POST /api/sync/run` uploads pending SQLite records to PostgreSQL when configured.
- `GET /api/sync/status` returns local pending and synced counts.

Assessment requests use this shape:

```json
{
	"id": "assessment-123",
	"patientName": "Patient Name",
	"age": 40,
	"temperature": 37.0,
	"bloodPressure": "120/80",
	"symptoms": "cough, fever",
	"createdAt": "2026-09-08T12:00:00Z"
}
```

The classifier accepts one or more recognized symptoms. With one symptom it
returns the most likely disease and ranked alternatives in `predictions`; the
confidence is limited evidence, not a diagnosis. The response includes
`status: "prediction"`. Additional symptoms and vital signs improve the
comparison.
