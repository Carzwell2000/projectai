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

	if (Platform.OS === "android" && !Constants.isDevice) {
		return "http://10.0.2.2:8000";
	}

	return `http://${host ?? "127.0.0.1"}:8000`;
}

export const apiUrl = getApiUrl();
let accessToken: string | null = null;

export function setApiAccessToken(token: string | null): void {
	accessToken = token;
}

export const api = axios.create({
	baseURL: apiUrl,
	headers: { "Content-Type": "application/json" },
	timeout: 15_000,
});

api.interceptors.request.use((config) => {
	if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error: unknown) => {
		if (!shouldRetryWithApiFallback(error) || !error.config) {
			return Promise.reject(error);
		}
		return api.request({ ...error.config, baseURL: getApiFallbackUrl() });
	},
);

export type Nurse = { id: string; email: string; name: string; role: "nurse" | "admin" };
export type AuthResponse = { accessToken: string; nurse: Nurse };
export type AuthCredentials = { email: string; name?: string; password: string };

export async function login(credentials: Pick<AuthCredentials, "email" | "password">): Promise<AuthResponse> {
	try {
		const response = await api.post<AuthResponse>("/api/auth/login", credentials);
		return response.data;
	} catch (error) {
		if (!shouldRetryWithApiFallback(error)) {
			throw error;
		}
		const response = await api.post<AuthResponse>("/api/auth/login", credentials, {
			baseURL: getApiFallbackUrl(),
		});
		return response.data;
	}
}

export async function signup(credentials: AuthCredentials): Promise<AuthResponse> {
	const response = await api.post<AuthResponse>("/api/auth/signup", credentials);
	return response.data;
}

export async function createNurse(credentials: AuthCredentials): Promise<Nurse> {
	const response = await api.post<Nurse>("/api/auth/nurses", credentials);
	return response.data;
}

export type RegisteredNurse = Nurse & { created_at: string };

export async function listNurses(): Promise<RegisteredNurse[]> {
	const response = await api.get<RegisteredNurse[]>("/api/auth/nurses");
	return response.data;
}

export async function listUnsyncedPatients(): Promise<PatientRecord[]> {
	const response = await api.get<PatientRecord[]>("/api/auth/patients/unsynced");
	return response.data;
}

export async function deleteNurse(id: string): Promise<void> {
	await api.delete(`/api/auth/nurses/${encodeURIComponent(id)}`);
}

export async function logout(): Promise<void> {
	await api.post("/api/auth/logout");
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
	await api.post("/api/auth/password/change", { currentPassword, newPassword });
}

export async function resetPassword(email: string, resetCode: string, newPassword: string): Promise<void> {
	await api.post("/api/auth/password/reset", { email, resetCode, newPassword });
}

export async function requestPasswordReset(email: string): Promise<void> {
	await api.post("/api/auth/password/request", { email });
}

export type AssessmentRequest = {
	id: string;
	patientName: string;
	age: number;
	gender: "Male" | "Female" | "Other";
	pregnant: boolean | null;
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
	predictedDiseases: {
		disease: string;
		confidence: number;
		recommendation: string;
		features: {
			feature: string;
			contribution: number;
			direction: "supports" | "opposes";
		}[];
	}[];
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
	nurse_name: string;
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
	gender: "female" | "male" | "intersex" | "other" | "prefer_not_to_say";
	email: string;
	address: string;
};

export type PatientRecord = NewPatient & {
	id: string;
	createdAt: string;
	syncStatus: string;
	registeredBy: string;
};

export type SyncStatus = {
	nurses?: number;
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
	gender: z.enum(["Male", "Female", "Other"], {
		message: "Select a gender option.",
	}),
	pregnant: z.enum(["yes", "no", "not_applicable"], {
		message: "Select a pregnancy status.",
	}),
	temperature: z.coerce.number().min(25).max(45),
	bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, "Use blood pressure format 120/80."),
	symptoms: z.string().trim().min(2, "Enter at least one symptom."),
}).superRefine((data, context) => {
	if (data.gender !== "Female" && data.pregnant === "yes") {
		context.addIssue({ code: z.ZodIssueCode.custom, path: ["pregnant"], message: "Pregnancy status is only available for female patients." });
	}
}).transform((data) => ({
	...data,
	pregnant: data.pregnant === "yes" ? true : data.pregnant === "no" ? false : null,
}));

export function parseAssessment(input: Record<string, string>) {
	return assessmentSchema.safeParse(input);
}

export async function createAssessment(request: AssessmentRequest): Promise<AssessmentResult> {
	try {
		const response = await api.post<AssessmentResult>("/api/assessments", request);
		return response.data;
	} catch (error) {
		if (!shouldRetryWithApiFallback(error)) {
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

function shouldRetryWithApiFallback(error: unknown): error is AxiosError {
	if (!(error instanceof AxiosError) || error.response || !error.config) return false;
	const fallbackUrl = getApiFallbackUrl();
	return apiUrl !== fallbackUrl && error.config.baseURL !== fallbackUrl;
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
		if (!shouldRetryWithApiFallback(error)) {
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
		if (!shouldRetryWithApiFallback(error)) {
			if (error instanceof AxiosError && !error.response && patient.id) {
				try {
					const records = await api.get<{ patients: PatientRecord[] }>("/api/patients", {
						baseURL: getApiFallbackUrl(),
					});
					const created = records.data.patients.find((record) => record.id === patient.id);
					if (created) return created;
				} catch {}
			}
			throw error;
		}
		try {
			const response = await api.post<PatientRecord>("/api/patients", patient, {
				baseURL: getApiFallbackUrl(),
			});
			return response.data;
		} catch (fallbackError) {
			// A timeout can happen after FastAPI has committed the patient.
			// Read back the id before reporting the request as failed.
			if (patient.id) {
				const records = await api.get<{ patients: PatientRecord[] }>("/api/patients", {
					baseURL: getApiFallbackUrl(),
				});
				const created = records.data.patients.find((record) => record.id === patient.id);
				if (created) return created;
			}
			throw fallbackError;
		}
	}
}

export async function updatePatient(patient: NewPatient): Promise<PatientRecord> {
	if (!patient.id) throw new Error("Patient ID is required to update a record.");
	try {
		const response = await api.put<PatientRecord>(`/api/patients/${encodeURIComponent(patient.id)}`, patient);
		return response.data;
	} catch (error) {
		if (!shouldRetryWithApiFallback(error)) {
			throw error;
		}
		const response = await api.put<PatientRecord>(`/api/patients/${encodeURIComponent(patient.id)}`, patient, {
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
		if (!shouldRetryWithApiFallback(error)) {
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

export async function syncPendingAssessments(): Promise<{ nurses: number; assessments: number; patients: number }> {
	const response = await api.post<{ nurses: number; assessments: number; patients: number }>("/api/sync/run", undefined, {
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
	try {
		const response = await api.get<{ status: string }>("/health");
		return response.data;
	} catch (error) {
		if (!shouldRetryWithApiFallback(error)) {
			throw error;
		}
		const response = await api.get<{ status: string }>("/health", {
			baseURL: getApiFallbackUrl(),
		});
		return response.data;
	}
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
