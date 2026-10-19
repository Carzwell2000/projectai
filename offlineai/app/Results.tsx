import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import { explainAssessment, type AssessmentExplanation, type TriageRecommendation } from "../services/api";
import { useAuthStore } from "../stores/authStore";

export default function Results() {
  const router = useRouter();
  const role = useAuthStore((state) => state.session?.nurse.role);
  const isPrimaryHealthcare = role === "primary_healthcare";
  const { name = "Patient", age = "", symptoms = "", temperature = "", bloodPressure = "", disease = "", confidence = "", recommendation = "", status = "", recognizedSymptoms = "[]", triage = "" } = useLocalSearchParams<{
    name: string;
    age: string;
    symptoms: string;
    temperature: string;
    bloodPressure: string;
    disease: string;
    confidence: string;
    recommendation: string;
    status: string;
    recognizedSymptoms: string;
    triage: string;
  }>();
  const symptomText = Array.isArray(symptoms) ? symptoms.join(", ") : symptoms;
  const diseaseText = Array.isArray(disease) ? disease[0] : disease;
  const confidenceText = Array.isArray(confidence) ? confidence[0] : confidence;
  const recommendationText = Array.isArray(recommendation) ? recommendation[0] : recommendation;
  const statusText = Array.isArray(status) ? status[0] : status;
  const modelSymptoms = parseSymptoms(Array.isArray(recognizedSymptoms) ? recognizedSymptoms[0] : recognizedSymptoms);
  const triageResult = parseTriage(Array.isArray(triage) ? triage[0] : triage);
  const [explanation, setExplanation] = useState<AssessmentExplanation | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState(false);
  const hasSymptomSupportedPrimary = statusText === "prediction"
    && Number(confidenceText || 0) >= 0.01
    && (explanation?.predictedDiseases || []).some((item) =>
      item.disease === diseaseText && hasReportedSymptomSupport(item.features));
  const displayedDisease = hasSymptomSupportedPrimary ? diseaseText : "Insufficient evidence";
  const resultAccent = isPrimaryHealthcare ? "emerald" : displayedDisease === "Insufficient evidence" ? "amber" : "teal";
  const resultTitle = displayedDisease === "Insufficient evidence"
    ? (isPrimaryHealthcare ? "No confident match" : "Insufficient evidence")
    : "Possible match";
  const resultMessage = displayedDisease === "Insufficient evidence"
    ? (isPrimaryHealthcare
      ? "The reported symptoms do not support a confident disease match. Please review the encounter details and consider the broader clinical context."
      : "No disease match has sufficient support from the reported symptoms. Record specific symptoms and review the case with a qualified healthcare professional.")
    : `${displayedDisease}${confidenceText ? ` (${Math.round(Number(confidenceText) * 100)}% confidence)` : ""}`;

  useEffect(() => {
    if (!diseaseText || !symptomText || !temperature) return;

    let isActive = true;
    setIsLoadingExplanation(true);
    setExplanationError(false);
    explainAssessment({ symptoms: symptomText, temperature: Number(temperature), bloodPressure: bloodPressure as string })
      .then((result) => {
        if (isActive) setExplanation(result);
      })
      .catch(() => {
        if (isActive) setExplanationError(true);
      })
      .finally(() => {
        if (isActive) setIsLoadingExplanation(false);
      });

    return () => {
      isActive = false;
    };
  }, [bloodPressure, diseaseText, symptomText, temperature]);
  return (
    <SafeAreaView style={tw`flex-1 bg-[#F4F8F7]`}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" monitorSync={false} showSyncStatus={false} />

        <Pressable onPress={() => router.replace("/Assess")} style={tw`mb-5 mt-3 flex-row items-center`}>
          <Ionicons name="arrow-back" size={20} color="#0F766E" />
          <Text style={tw`ml-2 text-sm font-bold text-teal-700`}>Back</Text>
        </Pressable>

        <View style={tw`rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Text style={tw`text-2xl font-black text-slate-900`}>Assessment result</Text>
            <View style={tw`${isPrimaryHealthcare ? "bg-emerald-100" : "bg-teal-100"} rounded-full px-3 py-1.5`}>
              <Text style={tw`${isPrimaryHealthcare ? "text-emerald-700" : "text-teal-700"} text-[10px] font-bold uppercase tracking-[1.5px]`}>
                {isPrimaryHealthcare ? "Primary care" : "Clinical review"}
              </Text>
            </View>
          </View>

          <View style={tw`mt-5 flex-row items-center justify-between rounded-2xl bg-slate-50 p-4`}>
            <View>
              <Text style={tw`text-[10px] font-bold uppercase tracking-[1.6px] text-slate-500`}>Patient</Text>
              <Text style={tw`mt-1 text-xl font-bold text-slate-900`}>{name}</Text>
            </View>
            <View style={tw`${isPrimaryHealthcare ? "bg-emerald-50" : "bg-teal-50"} h-12 w-12 items-center justify-center rounded-2xl`}>
              <Ionicons name="person-outline" size={22} color={isPrimaryHealthcare ? "#047857" : "#0F766E"} />
            </View>
          </View>

          <View style={tw`mt-4 flex-row gap-3`}>
            <Vital label="Age" value={`${age} years`} />
            <Vital label="Temp" value={`${temperature} °C`} />
            <Vital label="BP" value={bloodPressure} />
          </View>

          <View style={tw`mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4`}>
            <Text style={tw`text-[10px] font-bold uppercase tracking-[1.6px] text-slate-500`}>Reported symptoms</Text>
            <Text style={tw`mt-2 text-sm leading-5 text-slate-800`}>{symptomText || "No symptoms provided"}</Text>
          </View>
        </View>

        {diseaseText ? (
          <>
            {!isPrimaryHealthcare && triageResult ? <TriageCard triage={triageResult} /> : null}
            <ResultCard
              icon="medkit-outline"
              accent={resultAccent}
              title={resultTitle}
              message={resultMessage}
            />
            {modelSymptoms.length ? <ModelSymptoms symptoms={modelSymptoms} /> : null}
            {!isPrimaryHealthcare && explanationError ? <ResultCard icon="list-outline" accent="amber" title="Recommendation" message={recommendationText || "Review this result with a qualified healthcare professional."} /> : null}
            <DiseaseExplanations
              explanation={explanation}
              isLoading={isLoadingExplanation}
              hasError={explanationError}
              showClinicalDetails={!isPrimaryHealthcare}
            />
          </>
        ) : (
          <ResultPlaceholder
            icon="medkit-outline"
            title="Prediction unavailable"
            message="The assessment could not be processed. Check the FastAPI server and try again."
            waitingLabel="Waiting for API response"
          />
        )}

        <Pressable onPress={() => router.replace("/Assess")} style={({ pressed }) => [tw`mt-7 items-center rounded-2xl bg-teal-700 py-4 shadow-sm`, pressed && tw`opacity-80`]}>
          <Text style={tw`text-base font-bold text-white`}>Assess again</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function parseTriage(value: string): TriageRecommendation | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && ["emergency", "urgent", "routine"].includes(parsed.level) ? parsed : null;
  } catch {
    return null;
  }
}

function parseSymptoms(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function ModelSymptoms({ symptoms }: { symptoms: string[] }) {
  return (
    <View style={tw`mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`}>
      <View style={tw`flex-row items-center`}>
        <View style={tw`h-9 w-9 items-center justify-center rounded-xl bg-emerald-50`}>
          <Ionicons name="sparkles-outline" size={18} color="#047857" />
        </View>
        <Text style={tw`ml-3 text-base font-bold text-slate-900`}>Matched symptoms</Text>
      </View>
      <View style={tw`mt-4 flex-row flex-wrap`}>
        {symptoms.map((symptom) => (
          <View key={symptom} style={tw`mb-2 mr-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5`}>
            <Text style={tw`text-xs font-semibold text-emerald-700`}>{symptom}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <View style={tw`flex-1 rounded-xl bg-slate-50 p-3`}>
      <Text style={tw`text-[10px] font-bold uppercase tracking-wide text-slate-500`}>{label}</Text>
      <Text style={tw`mt-1 text-xs font-bold text-slate-900`}>{value || "Not recorded"}</Text>
    </View>
  );
}

function DiseaseExplanations({ explanation, isLoading, hasError, showClinicalDetails }: { explanation: AssessmentExplanation | null; isLoading: boolean; hasError: boolean; showClinicalDetails: boolean }) {
  const diseaseExplanations = explanation?.predictedDiseases ?? [];

  if (isLoading) {
    return (
      <View style={tw`mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
        <Text style={tw`text-base font-bold text-slate-900`}>{showClinicalDetails ? "Disease explanations" : "Possible disease predictions"}</Text>
        <Text style={tw`mt-2 text-sm text-slate-500`}>{showClinicalDetails ? "Loading disease explanations..." : "Loading additional disease predictions..."}</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={tw`mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5`}>
        <Text style={tw`text-base font-bold text-amber-900`}>{showClinicalDetails ? "Disease explanations unavailable" : "Additional predictions unavailable"}</Text>
        <Text style={tw`mt-2 text-sm leading-5 text-amber-800`}>The primary prediction is available, but additional disease results could not be loaded.</Text>
      </View>
    );
  }

  const details = diseaseExplanations.filter((prediction) =>
    prediction.confidence >= 0.01 && hasReportedSymptomSupport(prediction.features));
  if (!details.length) return null;
  return (
    <View style={tw`mt-7`}>
      <View style={tw`mb-3 flex-row items-center`}>
        <View style={tw`mr-2 h-2 w-2 rounded-full bg-teal-500`} />
        <Text style={tw`text-xs font-bold uppercase tracking-widest text-slate-500`}>{showClinicalDetails ? "Disease explanations" : "Possible disease predictions"}</Text>
      </View>
      <View style={tw`gap-4`}>
      {details.map((item) => <DiseaseExplanation key={item.disease} explanation={item} showClinicalDetails={showClinicalDetails} />)}
      </View>
    </View>
  );
}

function DiseaseExplanation({ explanation, showClinicalDetails }: { explanation: AssessmentExplanation["predictedDiseases"][number]; showClinicalDetails: boolean }) {
  const displayedFeatures = explanation.features.filter((item) =>
    item.direction === "supports" || item.feature.toLowerCase().includes("temperature"));
  const maximumContribution = Math.max(...displayedFeatures.map((item) => Math.abs(item.contribution)), 1);
  return (
    <View style={tw`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`}>
      <View style={tw`flex-row items-center justify-between`}>
        <Text style={tw`flex-1 text-base font-bold text-slate-900`}>{explanation.disease}</Text>
        <View style={tw`rounded-full bg-teal-50 px-3 py-1`}>
          <Text style={tw`text-xs font-bold text-teal-700`}>{Math.round(explanation.confidence * 100)}%</Text>
        </View>
      </View>
        {showClinicalDetails ? (
        <>
        <Text style={tw`mt-1 text-xs leading-4 text-slate-500`}></Text>
        <View style={tw`mt-4 rounded-2xl bg-teal-50 p-3`}>
          <Text style={tw`text-[10px] font-bold uppercase tracking-widest text-teal-700`}>Recommendation</Text>
          <Text style={tw`mt-1 text-sm leading-5 text-slate-700`}>{explanation.recommendation ?? ""}</Text>
      </View>
      <Text style={tw`mt-4 text-xs leading-4 text-slate-500`}>why this disease.</Text>
      <View style={tw`mt-4 gap-3`}>
        {displayedFeatures.map((item) => (
          <View key={`${item.feature}-${item.contribution}`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`flex-1 text-sm font-semibold capitalize text-slate-700`}>{item.feature.replaceAll("_", " ")}</Text>
              <Text style={tw`text-xs font-bold ${item.direction === "supports" ? "text-emerald-700" : "text-rose-700"}`}>{item.direction === "supports" ? "Supports" : "Opposes"}</Text>
            </View>
            <View style={tw`mt-1 h-2 overflow-hidden rounded-full bg-slate-100`}>
              <View style={[tw`h-full rounded-full ${item.direction === "supports" ? "bg-emerald-500" : "bg-rose-400"}`, { width: `${Math.max(8, Math.round((Math.abs(item.contribution) / maximumContribution) * 100))}%` }]} />
            </View>
          </View>
        ))}
      </View>
      </>
      ) : null}
    </View>
  );
}

function hasReportedSymptomSupport(features: AssessmentExplanation["features"]): boolean {
  return features.some((item) =>
    item.direction === "supports" && !item.feature.toLowerCase().includes("temperature"));
}

function TriageCard({ triage }: { triage: TriageRecommendation }) {
  const color = triage.level === "emergency" ? "rose" : triage.level === "urgent" ? "amber" : "teal";
  return (
    <View style={tw`mt-6 rounded-2xl border border-${color}-200 bg-${color}-50 p-5`}>
      <View style={tw`flex-row items-center justify-between`}>
        <Text style={tw`text-xs font-bold tracking-widest text-${color}-700`}>TRIAGE PRIORITY</Text>
        <Ionicons name={triage.level === "emergency" ? "warning-outline" : "time-outline"} size={22} color={triage.level === "emergency" ? "#BE123C" : triage.level === "urgent" ? "#B45309" : "#0F766E"} />
      </View>
      <Text style={tw`mt-2 text-2xl font-bold capitalize text-slate-900`}>{triage.level}</Text>
      <Text style={tw`mt-2 text-sm leading-5 text-slate-700`}>{triage.action}</Text>
      <View style={tw`mt-3 rounded-xl bg-white/70 p-3`}><Text style={tw`text-xs leading-4 text-slate-600`}>{triage.rationale}</Text></View>
    </View>
  );
}

function ResultPlaceholder({ icon, title, message, waitingLabel }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; waitingLabel: string }) {
  return (
    <View style={tw`mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
      <View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-teal-50`}>
        <Ionicons name={icon} size={23} color="#0F766E" />
      </View>
      <Text style={tw`mt-4 text-lg font-bold text-slate-900`}>{title}</Text>
      <Text style={tw`mt-2 text-sm leading-5 text-slate-500`}>{message}</Text>
      <View style={tw`mt-4 flex-row items-center rounded-xl bg-slate-50 px-3 py-3`}>
        <Ionicons name="time-outline" size={17} color="#94A3B8" />
        <Text style={tw`ml-2 text-xs font-medium text-slate-400`}>{waitingLabel}</Text>
      </View>
    </View>
  );
}

function ResultCard({ icon, title, message, accent = "teal" }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; accent?: "teal" | "amber" | "emerald" }) {
  const iconBackground = accent === "amber" ? "bg-amber-50" : accent === "emerald" ? "bg-emerald-50" : "bg-teal-50";
  const iconColor = accent === "amber" ? "#B45309" : accent === "emerald" ? "#047857" : "#0F766E";
  return (
    <View style={tw`mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`}>
      <View style={tw`flex-row items-center`}>
        <View style={tw`h-11 w-11 items-center justify-center rounded-2xl ${iconBackground}`}>
          <Ionicons name={icon} size={23} color={iconColor} />
        </View>
        <Text style={tw`ml-3 text-lg font-bold text-slate-900`}>{title}</Text>
      </View>
      <Text style={tw`mt-4 text-sm leading-5 text-slate-600`}>{message}</Text>
    </View>
  );
}
