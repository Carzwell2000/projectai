import * as SQLite from "expo-sqlite";
import type { AssessmentRequest, AssessmentResult, ModelCatalog } from "./api";

type QueuedAssessment = {
  id: string;
  payload: AssessmentRequest;
  result: AssessmentResult;
};

const database = SQLite.openDatabaseSync("offlineai.db");

function prepareDatabase() {
  database.execSync(`
    CREATE TABLE IF NOT EXISTS offline_assessments (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS model_catalog (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      catalog TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function saveModelCatalog(catalog: ModelCatalog): void {
  prepareDatabase();
  database.runSync(
    "INSERT OR REPLACE INTO model_catalog (id, catalog, updated_at) VALUES (1, ?, ?)",
    JSON.stringify(catalog),
    new Date().toISOString(),
  );
}

export function getCachedModelCatalog(): ModelCatalog | null {
  prepareDatabase();
  const row = database.getFirstSync<{ catalog: string }>(
    "SELECT catalog FROM model_catalog WHERE id = 1",
  );
  if (!row) return null;
  try {
    return JSON.parse(row.catalog) as ModelCatalog;
  } catch {
    return null;
  }
}

export function saveOfflineAssessment(request: AssessmentRequest, result: AssessmentResult): void {
  prepareDatabase();
  const anonymizedRequest = { ...request, patientName: "Anonymous" };
  database.runSync(
    "INSERT OR REPLACE INTO offline_assessments (id, payload, result, created_at, sync_status) VALUES (?, ?, ?, ?, 'pending')",
    request.id,
    JSON.stringify(anonymizedRequest),
    JSON.stringify(result),
    request.createdAt ?? new Date().toISOString(),
  );
}

export function getPendingOfflineAssessments(): QueuedAssessment[] {
  prepareDatabase();
  const rows = database.getAllSync<{ id: string; payload: string; result: string }>(
    "SELECT id, payload, result FROM offline_assessments WHERE sync_status = 'pending' ORDER BY created_at",
  );
  return rows.map((row) => ({ id: row.id, payload: JSON.parse(row.payload), result: JSON.parse(row.result) }));
}

export function removeOfflineAssessment(id: string): void {
  prepareDatabase();
  database.runSync("DELETE FROM offline_assessments WHERE id = ?", id);
}