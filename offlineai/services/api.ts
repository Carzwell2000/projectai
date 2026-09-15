import axios, { AxiosError } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { z } from "zod";

function getApiUrl(): string {
	const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
	const host = Constants.expoConfig?.hostUri?.split(":")[0];
	if (configuredUrl) {
		if (configuredUrl.includes("10.0.2.2") && Platform.OS === "web") {
			return configuredUrl.replace("10.0.2.2", "127.0.0.1").replace(/\/$/, "");
		}
		if (configuredUrl.includes("10.0.2.2") && Platform.OS === "android" && Constants.isDevice && host) {
			return configuredUrl.replace("10.0.2.2", host).replace(/\/$/, "");
		}
		return configuredUrl.replace(/\/$/, "");
	}

	return `http://${host ?? "127.0.0.1"}:8000`;
}

export const apiUrl = getApiUrl();

export const api = axios.create({
	baseURL: apiUrl,
	headers: { "Content-Type": "application/json" },
	timeout: 15_000,
});

export type AssessmentRequest = {
	id: string;
	patientName: string;
	age: number;
	temperature: number;
	bloodPressure: string;
	symptoms: string;
	createdAt?: string;
};

export type Prediction = {
	disease: string;
	confidence: number;
};

export type PredictionResult = {
	disease: string;
	confidence: number;
	predictions: Prediction[];
	recognizedSymptoms: string[];
	recommendation: string;
	modelVersion: string;
	status: string;
};

export type ModelCatalog = {
	modelVersion: string;
	diseases: string[];
	symptoms: string[];
};

export type TriageRecommendation = {
	level: "emergency" | "urgent" | "routine";
	action: string;
	rationale: string;
	rules: string[];
};

export type AssessmentExplanation = PredictionResult & {
	features: {
		feature: string;
		contribution: number;
		direction: "supports" | "opposes";
	}[];
	clinicalSignals: {
		feature: string;
		value: string;
		status: "high" | "low";
		meaning: string;
	}[];
	modelVersion: string;
};

export type AssessmentResult = AssessmentRequest & PredictionResult & {
	syncStatus: string;
	triage?: TriageRecommendation;
};

export type LocalAssessment = {
	id: string;
	patient_name: string;
	age: number;
	temperature: number;
	blood_pressure: string;
	symptoms: string;
	created_at: string;
	disease: string | null;
	confidence: number | null;
	predictions: Prediction[];
	recommendation: string;
	model_version: string;
	sync_status: string;
};

export type NewPatient = {
	id?: string;
	name: string;
	phone: string;
	dateOfBirth: string;
};

export type PatientRecord = NewPatient & {
	id: string;
	createdAt: string;
	syncStatus: string;
};

export type SyncStatus = {
	total: number;
	pending: number;
	pendingAssessments: number;
	pendingPatients: number;
	synced: number;
	conflicts: number;
	postgresConfigured: boolean;
};

const assessmentSchema = z.object({
	patientName: z.string().trim().min(2, "Patient name must be at least 2 characters."),
	age: z.coerce.number().int().min(0).max(130),
	temperature: z.coerce.number().min(25).max(45),
	bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, "Use blood pressure format 120/80."),
	symptoms: z.string().trim().min(2, "Enter at least one symptom."),
});

export function parseAssessment(input: Record<string, string>) {
	return assessmentSchema.safeParse(input);
}

export async function createAssessment(request: AssessmentRequest): Promise<AssessmentResult> {
	try {
		const response = await api.post<AssessmentResult>("/api/assessments", request);
		return response.data;
	} catch (error) {
		if (!(error instanceof AxiosError) || error.response || apiUrl === getApiFallbackUrl()) {
			throw error;
		}
		const response = await api.post<AssessmentResult>("/api/assessments", request, {
			baseURL: getApiFallbackUrl(),
		});
		return response.data;
	}
}

function getApiFallbackUrl(): string {
	const host = Constants.expoConfig?.hostUri?.split(":")[0];
	if (host) return `http://${host}:8000`;
	return `http://127.0.0.1:8000`;
}

export async function predictAssessment(input: Pick<AssessmentRequest, "temperature" | "symptoms">): Promise<PredictionResult> {
	const response = await api.post<PredictionResult>("/api/predict", input);
	return response.data;
}

export async function explainAssessment(input: Pick<AssessmentRequest, "temperature" | "bloodPressure" | "symptoms">): Promise<AssessmentExplanation> {
	try {
		const response = await api.post<AssessmentExplanation>("/api/explain", input);
		return response.data;
	} catch (error) {
		if (!(error instanceof AxiosError) || error.response || apiUrl === getApiFallbackUrl()) {
			throw error;
		}
		const response = await api.post<AssessmentExplanation>("/api/explain", input, {
			baseURL: getApiFallbackUrl(),
		});
		return response.data;
	}
}

export async function getModelCatalog(): Promise<ModelCatalog> {
	const response = await api.get<ModelCatalog>("/api/model/catalog");
	return response.data;
}

export async function listAssessments(limit = 100): Promise<LocalAssessment[]> {
	const response = await api.get<{ assessments: LocalAssessment[] }>("/api/assessments", {
		params: { limit },
	});
	return response.data.assessments;
}

export async function getAssessment(id: string): Promise<LocalAssessment> {
	const response = await api.get<LocalAssessment>(`/api/assessments/${encodeURIComponent(id)}`);
	return response.data;
}

export async function createPatient(patient: NewPatient): Promise<PatientRecord> {
	try {
		const response = await api.post<PatientRecord>("/api/patients", patient);
		return response.data;
	} catch (error) { 
		if (!(error instanceof AxiosError) || error.response || apiUrl === getApiFallbackUrl()) {
			throw error;
		}
		const response = await api.post<PatientRecord>("/api/patients", patient, {
			baseURL: getApiFallbackUrl(),
		});
		return response.data;
	}
}

export async function listPatients(): Promise<PatientRecord[]> {
	try {
		const response = await api.get<{ patients: PatientRecord[] }>("/api/patients");
		return response.data.patients;
	} catch (error) {
		if (!(error instanceof AxiosError) || error.response || apiUrl === getApiFallbackUrl()) {
			throw error;
		}
		const response = await api.get<{ patients: PatientRecord[] }>("/api/patients", {
			baseURL: getApiFallbackUrl(),
		});
		return response.data.patients;
	}
}

export async function getSyncStatus(): Promise<SyncStatus> {
	const response = await api.get<SyncStatus>("/api/sync/status");
	return response.data;
}

export async function syncPendingAssessments(): Promise<{ assessments: number; patients: number }> {
	const response = await api.post<{ assessments: number; patients: number }>("/api/sync/run", undefined, {
		timeout: 60_000,
	});
	return response.data;
}

export async function syncAssessments(assessments: AssessmentRequest[]): Promise<{ synced: number; assessments: AssessmentResult[] }> {
	const response = await api.post<{ synced: number; assessments: AssessmentResult[] }>("/api/assessments/sync", {
		assessments,
	});
	return response.data;
}

export async function healthCheck(): Promise<{ status: string }> {
	const response = await api.get<{ status: string }>("/health");
	return response.data;
}

export function getApiErrorMessage(error: unknown): string {
	if (error instanceof AxiosError) {
		const detail = error.response?.data?.detail;
		if (typeof detail === "string") return detail;
		if (Array.isArray(detail)) {
			const messages = detail
				.map((item) => (typeof item?.msg === "string" ? item.msg : ""))
				.filter(Boolean);
			if (messages.length > 0) return messages.join(" ");
		}
		if (error.code === "ECONNABORTED") return "FastAPI request timed out.";
		if (!error.response) return `FastAPI is unavailable at ${apiUrl}. Check the API URL and backend server.`;
		return `FastAPI returned HTTP ${error.response.status}.`;
	}
	return error instanceof Error ? error.message : "An unexpected API error occurred.";
}
