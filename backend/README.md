# FastAPI assessment backend

The API loads `backend/disease_model.joblib`, predicts the top three disease
matches, and stores each assessment in the backend-owned `backend/assessments.db`
SQLite database. When Neon Postgres is reachable, local pending rows are synced
to the `assessments` table automatically.

Start it from the `backend` directory:

```bash
npm run api
```

The API is available at `http://127.0.0.1:8000` locally and listens on all
network interfaces when started with the project command. On a physical device,
set
`EXPO_PUBLIC_API_URL` in `offlineai/.env.local` to the computer's LAN address.

Configure the administrator sign-in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` in
`backend/.env.local`. The configured password is applied to the local admin
account when authentication initializes, so changing the setting updates the
admin's login password.

## Password reset email

Password reset codes are sent by Resend. In the Resend dashboard, create an API
key and verify the domain used for the sender address. Create `backend/.env.local`
with these settings:

```dotenv
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=Clinical Care <no-reply@your-verified-domain.com>
```

Keep this file on the backend only; do not put the API key in an Expo
`EXPO_PUBLIC_*` variable. Local `.env` files are ignored by Git. Restart the API
after changing the settings. Reset codes expire after 10 minutes and can only be
used once. The request endpoint returns the same success response for unknown
email addresses to avoid revealing which accounts are registered.

Use `http://127.0.0.1:8000/` or `http://127.0.0.1:8000/docs` in a browser.
`0.0.0.0` is only the bind address used by Uvicorn; it is not a browser URL.

The frontend only posts requests to FastAPI. SQLite is used when Neon is offline;
the API returns `pending_sync` until the row is uploaded to Neon. Use the pooled
Neon URL for runtime requests and a direct, non-pooled URL for migrations.
Both web and mobile clients retry `/api/sync/run` when the app opens, resumes, or
regains connectivity, and every second while online. A sync pass uploads every
queued local nurse, assessment, patient, and nurse message, regardless of which
nurse is currently signed in; administrator accounts can also check status and
trigger this sync. Failed uploads stay queued in SQLite and become eligible for
retry after one second.

The current demo/testing artifact is `logistic-single-symptom-7`. It excludes
Ebola virus disease from its training dataset and preserves the removal of
selected generic symptoms (including headache, vomiting, itching, fever,
fatigue, diarrhoea, sweating, skin rash, and high fever) from the original CSV
lines 386-637. The rural-health disease updates add symptoms to matching
existing labels, map related conditions to suitable existing categories, and
add separate classes only where no suitable category exists. Missing
disease-specific temperatures are left blank in the source dataset and use the
training dataset's median temperature during model training. The model was
retrained from the user-provided Desktop `dataset_clean.csv` and compares the
disease classes when at least one recognized symptom is supplied. It returns
ranked alternatives and is not for clinical use. A result is decision support
only and must be reviewed by a qualified healthcare professional. Each
recommendation includes a clinician-directed note that blood tests may be
ordered when indicated and should follow local clinical guidance.