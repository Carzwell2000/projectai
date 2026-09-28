import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import { explainAssessment, type AssessmentExplanation, type TriageRecommendation } from "../services/api";

export default function Results() {
  const router = useRouter();
  const { name = "Patient", age = "", symptoms = "", temperature = "", bloodPressure = "", disease = "", confidence = "", recommendation = "", status = "", predictions = "[]", recognizedSymptoms = "[]", triage = "", error = "" } = useLocalSearchParams<{
    name: string;
    age: string;
    symptoms: string;
    temperature: string;
    bloodPressure: string;
    disease: string;
    confidence: string;
    recommendation: string;
    status: string;
    predictions: string;
    recognizedSymptoms: string;
    triage: string;
    error: string;
  }>();
  const symptomText = Array.isArray(symptoms) ? symptoms.join(", ") : symptoms;
  const diseaseText = Array.isArray(disease) ? disease[0] : disease;
  const confidenceText = Array.isArray(confidence) ? confidence[0] : confidence;
  const recommendationText = Array.isArray(recommendation) ? recommendation[0] : recommendation;
  const statusText = Array.isArray(status) ? status[0] : status;
  const predictionText = Array.isArray(predictions) ? predictions[0] : predictions;
  const topPredictions = parsePredictions(predictionText);
  const modelSymptoms = parseSymptoms(Array.isArray(recognizedSymptoms) ? recognizedSymptoms[0] : recognizedSymptoms);
  const triageResult = parseTriage(Array.isArray(triage) ? triage[0] : triage);
  const [explanation, setExplanation] = useState<AssessmentExplanation | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState(false);

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
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" monitorSync={false} showSyncStatus={false} />
        <Pressable onPress={() => router.replace("/Assess")} style={tw`mb-7 mt-3 flex-row items-center`}>
          <Ionicons name="arrow-back" size={20} color="#0F766E" />
          <Text style={tw`ml-2 text-sm font-bold text-teal-700`}>Back</Text>
        </Pressable>
        <Text style={tw`mt-2 text-3xl font-bold text-slate-900`}>Assessment result</Text>
        <Text style={tw`mt-2 text-sm leading-5 text-slate-500`}></Text>
    

        <View style={tw`mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>PATIENT ENCOUNTER</Text>
              <Text style={tw`mt-2 text-xl font-bold text-slate-900`}>{name}</Text>
            </View>
            <View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-teal-50`}>
              <Ionicons name="person-outline" size={22} color="#0F766E" />
            </View>
          </View>
          <View style={tw`mt-5 flex-row gap-3`}>
            <Vital label="Age" value={`${age} years`} />
            <Vital label="Temperature" value={`${temperature} °C`} />
            <Vital label="Blood pressure" value={bloodPressure} />
          </View>
          <View style={tw`mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4`}>
            <Text style={tw`text-xs font-bold uppercase tracking-widest text-slate-500`}>Reported symptoms</Text>
            <Text style={tw`mt-2 text-sm leading-5 text-slate-800`}>{symptomText || "No symptoms provided"}</Text>
          </View>
        </View>

        {diseaseText ? (
          <>
            {triageResult ? <TriageCard triage={triageResult} /> : null}
            {modelSymptoms.length ? <ModelSymptoms symptoms={modelSymptoms} /> : null}
            <ResultCard
              icon="medkit-outline"
              accent={statusText === "low_confidence" ? "amber" : "teal"}
              title={diseaseText === "Insufficient evidence" ? "Insufficient evidence" : statusText === "low_confidence" ? "Possible match" : "Possible match"}
              message={diseaseText === "Insufficient evidence"
                ? "Add a more specific symptom and review the possibilities with a qualified healthcare professional."
                : `${diseaseText}${confidenceText ? ` (${Math.round(Number(confidenceText) * 100)}% confidence)` : ""}`}
            />
            {explanationError ? <ResultCard icon="list-outline" accent="amber" title="Recommendation" message={recommendationText || "Review this result with a qualified healthcare professional."} /> : null}
            <DiseaseExplanations explanation={explanation} isLoading={isLoadingExplanation} hasError={explanationError} predictions={topPredictions} />
          </>
        ) : (
          <ResultPlaceholder
            icon="medkit-outline"
            title="Prediction unavailable"
            message={error || "check server maybe its down."}
          />
        )}

        <Pressable onPress={() => router.replace("/Assess")} style={({ pressed }) => [tw`mt-6 items-center rounded-xl bg-teal-700 py-4`, pressed && tw`opacity-80`]}>
          <Text style={tw`font-bold text-white`}> Assess again</Text>
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
    <View style={tw`mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm`}>
      
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

function DiseaseExplanations({ explanation, isLoading, hasError, predictions }: { explanation: AssessmentExplanation | null; isLoading: boolean; hasError: boolean; predictions: { disease: string; confidence: number }[] }) {
  const diseaseExplanations = explanation?.predictedDiseases ?? [];
  if (!isLoading && !diseaseExplanations.length && !hasError) return null;

  if (isLoading) {
    return (
      <View style={tw`mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
        <Text style={tw`text-base font-bold text-slate-900`}>Disease explanations</Text>
        <Text style={tw`mt-2 text-sm text-slate-500`}>Loading  explanations...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={tw`mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5`}>
        <Text style={tw`text-base font-bold text-amber-900`}>Disease explanations unavailable</Text>
        <Text style={tw`mt-2 text-sm leading-5 text-amber-800`}>The predictions are available, but their  explanations could not be loaded.</Text>
      </View>
    );
  }

  const details = (diseaseExplanations.length ? diseaseExplanations : predictions.map((prediction) => ({ ...prediction, recommendation: "Review this possible match with a qualified healthcare professional.", features: [] }))).filter((prediction) => Math.round(prediction.confidence * 100) >= 1);
  if (!details.length) return null;
  return (
    <View style={tw`mt-7`}>
      <View style={tw`mb-3 flex-row items-center`}>
        <View style={tw`mr-2 h-2 w-2 rounded-full bg-teal-500`} />
        <Text style={tw`text-xs font-bold uppercase tracking-widest text-slate-500`}> explanations</Text>
      </View>
      <View style={tw`gap-4`}>
      {details.map((item) => <DiseaseExplanation key={item.disease} explanation={item} />)}
      </View>
    </View>
  );
}

function DiseaseExplanation({ explanation }: { explanation: AssessmentExplanation["predictedDiseases"][number] }) {
  const displayedFeatures = explanation.features.filter((item) => item.direction === "supports" || item.feature.includes("temperature"));
  const maximumContribution = Math.max(...displayedFeatures.map((item) => Math.abs(item.contribution)), 1);
  return (
    <View style={tw`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`}>
      <View style={tw`flex-row items-center justify-between`}>
        <Text style={tw`flex-1 text-base font-bold text-slate-900`}>{explanation.disease}</Text>
        <View style={tw`rounded-full bg-teal-50 px-3 py-1`}>
          <Text style={tw`text-xs font-bold text-teal-700`}>{Math.round(explanation.confidence * 100)}%</Text>
        </View>
      </View>
      <Text style={tw`mt-1 text-xs leading-4 text-slate-500`}></Text>
      <View style={tw`mt-4 rounded-2xl bg-teal-50 p-3`}>
        <Text style={tw`text-[10px] font-bold uppercase tracking-widest text-teal-700`}>Recommendation</Text>
        <Text style={tw`mt-1 text-sm leading-5 text-slate-700`}>{explanation.recommendation}</Text>
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
    </View>
  );
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

function parsePredictions(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.disease === "string" && typeof item.confidence === "number" && Math.round(item.confidence * 100) >= 1).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function OtherPossibleDiseases({ predictions }: { predictions: { disease: string; confidence: number }[] }) {
  const visiblePredictions = predictions.filter((prediction) => prediction.confidence > 0);
  if (!visiblePredictions.length) return null;

  return (
    <View style={tw`mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
      <Text style={tw`text-base font-bold text-slate-900`}>Other possible diseases</Text>
      <View style={tw`mt-3 gap-3`}>
        {visiblePredictions.map((prediction) => (
          <View key={prediction.disease} style={tw`flex-row items-center`}>
            <Text style={tw`flex-1 text-sm font-semibold text-slate-700`}>{prediction.disease}</Text>
            <Text style={tw`text-xs font-bold text-teal-700`}>{Math.round(prediction.confidence * 100)}%</Text>
            
          </View>
        ))}
      </View>
    </View>
  );
}

function ResultPlaceholder({ icon, title, message }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }) {
  return (
    <View style={tw`mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
      <View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-teal-50`}>
        <Ionicons name={icon} size={23} color="#0F766E" />
      </View>
      <Text style={tw`mt-4 text-lg font-bold text-slate-900`}>{title}</Text>
      <Text style={tw`mt-2 text-sm leading-5 text-slate-500`}>{message}</Text>
      <View style={tw`mt-4 flex-row items-center rounded-xl bg-slate-50 px-3 py-3`}>
        <Ionicons name="time-outline" size={17} color="#94A3B8" />
        <Text style={tw`ml-2 text-xs font-medium text-slate-400`}>Waiting for response</Text>
      </View>
    </View>
  );
}

function ResultCard({ icon, title, message, accent = "teal" }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; accent?: "teal" | "amber" }) {
  const iconBackground = accent === "amber" ? "bg-amber-50" : "bg-teal-50";
  const iconColor = accent === "amber" ? "#B45309" : "#0F766E";
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
