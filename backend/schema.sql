CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY NOT NULL,
  patient_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  temperature DOUBLE PRECISION NOT NULL,
  blood_pressure TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  disease TEXT,
  confidence DOUBLE PRECISION,
  predictions JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT NOT NULL DEFAULT '',
  model_version TEXT NOT NULL DEFAULT 'unknown',
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  condition TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);