import Constants from "expo-constants";
import { Platform } from "react-native";
import { z } from "zod";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const defaultApiUrl = Platform.OS === "android"
  ? "http://10.0.2.2:8000"
  : Platform.OS === "web"
    ? "http://127.0.0.1:8000"
    : `http://${expoHost ?? "127.0.0.1"}:8000`;
const apiUrl = Platform.OS === "web" ? "http://127.0.0.1:8000" : configuredApiUrl || defaultApiUrl;

export const assessmentSchema = z.object({
  patientName: z.string().trim().min(2, "Enter the patient's full name."),
  age: z.coerce.number().int().min(0).max(130),
  temperature: z.coerce.number().min(25).max(45),
  bloodPressure: z.string().trim().regex(/^\d{2,3}\/\d{2,3}$/, "Use the format 120/80."),
  symptoms: z.string().trim().min(2, "Enter at least one symptom."),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;
export type AssessmentRequest = AssessmentInput & { id: string; createdAt: string };

export type AssessmentPrediction = {
  disease: string;
  confidence: number;
  predictions: Array<{ disease: string; confidence: number }>;
  recommendation: string;
  modelVersion: string;
  status?: "prediction" | "insufficient_evidence";
  syncStatus: "pending_sync" | "synced";
};

export type LocalAssessment = AssessmentPrediction & {
  id: string;
  patient_name: string;
  age: number;
  temperature: number;
  blood_pressure: string;
  symptoms: string;
  created_at: string;
  sync_status: "pending_sync" | "synced";
};

export type PatientRequest = {
  name: string;
  phone: string;
  dateOfBirth: string;
  condition: string;
};

export type PatientRecord = PatientRequest & {
  id: string;
  createdAt: string;
  syncStatus?: "pending_sync" | "synced";
};

export type SyncStatus = {
  total: number;
  pending: number;
  synced: number;
  postgresConfigured: boolean;
};

function formatApiError(status: number, detail: string): string {
  try {
    const payload = JSON.parse(detail) as {
      detail?: string | Array<{ loc?: Array<string | number>; msg?: string }>;
    };
    if (Array.isArray(payload.detail)) {
      return payload.detail.map((item) => `${item.loc?.at(-1) ?? "request"}: ${item.msg ?? "invalid value"}`).join(" ");
    }
    if (typeof payload.detail === "string") return payload.detail;
  } catch {
    // Keep the raw response when FastAPI did not return JSON.
  }
  return detail ? `Request failed (${status}): ${detail}` : `Request failed (${status}).`;
}

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  console.log("FastAPI request:", init?.method ?? "GET", url);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
    const detail = await response.text();
    console.log("FastAPI response:", response.status, url);
    if (!response.ok) throw new Error(formatApiError(response.status, detail));
    try {
      return JSON.parse(detail) as T;
    } catch {
      throw new Error("FastAPI returned an unreadable response.");
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`FastAPI timed out at ${url}. Make sure the backend is running.`);
    }
    if (error instanceof TypeError) {
      throw new Error(`Could not connect to FastAPI at ${url}. Make sure the backend is running and reachable.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function jsonRequest(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseAssessment(input: {
  patientName: string;
  age: string;
  temperature: string;
  bloodPressure: string;
  symptoms: string;
}) {
  return assessmentSchema.safeParse(input);
}

export async function createAssessment(record: AssessmentRequest | AssessmentInput): Promise<AssessmentPrediction> {
  const request: AssessmentRequest = {
    ...record,
    id: "id" in record && record.id ? record.id : generateId(),
    createdAt: "createdAt" in record && record.createdAt ? record.createdAt : new Date().toISOString(),
    age: Number(record.age),
    temperature: Number(record.temperature),
  };
  const prediction = await requestApi<Partial<AssessmentPrediction>>("/api/assessments", jsonRequest(request));
  if (typeof prediction.disease !== "string" || typeof prediction.confidence !== "number" || !Array.isArray(prediction.predictions) || typeof prediction.recommendation !== "string") {
    throw new Error("FastAPI returned an invalid prediction response.");
  }
  return {
    disease: prediction.disease,
    confidence: prediction.confidence,
    predictions: prediction.predictions,
    recommendation: prediction.recommendation,
    modelVersion: prediction.modelVersion ?? "unknown",
    status: prediction.status ?? "prediction",
    syncStatus: prediction.syncStatus ?? "pending_sync",
  };
}

function normalizeServerAssessment(row: Record<string, unknown>): LocalAssessment {
  let predictions = row.predictions;
  if (typeof predictions === "string") {
    try { predictions = JSON.parse(predictions); } catch { predictions = []; }
  }
  const syncStatus = (row.syncStatus ?? row.sync_status ?? "pending_sync") as "pending_sync" | "synced";
  return {
    id: String(row.id ?? generateId()),
    patient_name: String(row.patient_name ?? row.patientName ?? ""),
    age: Number(row.age ?? 0),
    temperature: Number(row.temperature ?? 0),
    blood_pressure: String(row.blood_pressure ?? row.bloodPressure ?? ""),
    symptoms: String(row.symptoms ?? ""),
    created_at: String(row.created_at ?? row.createdAt ?? ""),
    disease: String(row.disease ?? "Insufficient evidence"),
    confidence: Number(row.confidence ?? 0),
    predictions: Array.isArray(predictions) ? predictions as LocalAssessment["predictions"] : [],
    recommendation: String(row.recommendation ?? "Await assessment"),
    modelVersion: String(row.modelVersion ?? row.model_version ?? "unknown"),
    status: row.status as LocalAssessment["status"],
    syncStatus,
    sync_status: syncStatus,
  };
}

export async function listAssessments(): Promise<LocalAssessment[]> {
  const payload = await requestApi<{ assessments?: Record<string, unknown>[] }>("/api/assessments");
  return (payload.assessments ?? []).map(normalizeServerAssessment);
}

export async function listPatients(): Promise<PatientRecord[]> {
  const payload = await requestApi<{ patients?: PatientRecord[] }>("/api/patients");
  return payload.patients ?? [];
}

export async function createPatient(patient: PatientRequest): Promise<PatientRecord> {
  return requestApi<PatientRecord>("/api/patients", jsonRequest(patient));
}

export async function syncPendingAssessments(): Promise<number> {
  const result = await requestApi<{ assessments?: number }>("/api/sync/run", jsonRequest({}));
  return result.assessments ?? 0;
}

export async function syncPendingPatients(): Promise<number> {
  const result = await requestApi<{ patients?: number }>("/api/sync/run", jsonRequest({}));
  return result.patients ?? 0;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return requestApi<SyncStatus>("/api/sync/status");
}
