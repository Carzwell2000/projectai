# FastAPI assessment backend

The API loads `backend/disease_model.joblib`, predicts the top three disease
matches, and stores each assessment in the backend-owned `backend/assessments.db`
SQLite database. When Neon Postgres is reachable, local pending rows are synced
to the `assessments` table automatically.

Start it from the project root:

```powershell
npm.cmd run api
```

The API is available at `http://127.0.0.1:8000` locally and listens on all
network interfaces when started with the project command. On a physical device,
set
`EXPO_PUBLIC_API_URL` in `offlineai/.env.local` to the computer's LAN address.

Use `http://127.0.0.1:8000/` or `http://127.0.0.1:8000/docs` in a browser.
`0.0.0.0` is only the bind address used by Uvicorn; it is not a browser URL.

The frontend only posts requests to FastAPI. SQLite is used when Neon is offline;
the API returns `pending_sync` until the row is uploaded to Neon. Use the pooled
Neon URL for runtime requests and a direct, non-pooled URL for migrations.

The current artifact is `logistic-single-symptom-2`. It compares all disease
classes when at least one recognized symptom is supplied and returns ranked
alternatives. A one-symptom result is decision support only and must be reviewed
by a qualified healthcare professional.