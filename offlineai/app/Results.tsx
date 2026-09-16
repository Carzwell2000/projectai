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
        <Navbar variant="hero" />
        <Pressable onPress={() => router.back()} style={tw`mb-7 mt-3 flex-row items-center`}>
          <Ionicons name="arrow-back" size={20} color="#0F766E" />
          <Text style={tw`ml-2 text-sm font-bold text-teal-700`}>Back</Text>
        </Pressable>
        <Text style={tw`mt-2 text-3xl font-bold text-slate-900`}>Assessment result</Text>
    

        <View style={tw`mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
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
          <View style={tw`mt-4 rounded-xl bg-slate-50 p-3`}>
            <Text style={tw`text-xs font-bold uppercase tracking-widest text-slate-500`}>Reported symptoms</Text>
            <Text style={tw`mt-2 text-sm leading-5 text-slate-800`}>{symptomText || "No symptoms provided"}</Text>
          </View>
        </View>

        {diseaseText ? (
          <>
            {triageResult ? <TriageCard triage={triageResult} /> : null}
            {modelSymptoms.length ? <ModelSymptoms symptoms={modelSymptoms} /> : null}
            <SymptomExplanation explanation={explanation} isLoading={isLoadingExplanation} hasError={explanationError} />
            <ResultCard
              icon="medkit-outline"
              title={statusText === "low_confidence" ? "Predicted Disease" : diseaseText === "Insufficient evidence" ? "Insufficient evidence" : "Possible match"}
              message={diseaseText === "Insufficient evidence"
                ? " Add a more specific symptom and review the possibilities with a qualified healthcare professional."
                : statusText === "low_confidence"
                ? topPredictions[0]
                  ? `${topPredictions[0].disease} (${Math.round(topPredictions[0].confidence * 100)}%)`
                  : "No possible disease"
                : `${diseaseText}${confidenceText ? ` (${Math.round(Number(confidenceText) * 100)}% confidence)` : ""}`}
            />
            <ResultCard icon="list-outline" title="Recommendations" message={recommendationText || "Review this result with a qualified healthcare professional."} />
            <Text style={tw`mt-3 text-right text-xs text-slate-400`}></Text>
            <OtherPossibleDiseases predictions={topPredictions.slice(1, )} />
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
      <Text style={tw`text-base font-bold text-slate-900`}>Symptoms recognized by model</Text>
      <Text style={tw`mt-2 text-sm leading-5 text-slate-600`}>{symptoms.join(", ")}</Text>
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

function SymptomExplanation({ explanation, isLoading, hasError }: { explanation: AssessmentExplanation | null; isLoading: boolean; hasError: boolean }) {
  const displayedFeatures = explanation?.features.filter((item) => item.direction === "supports" || item.feature.includes("temperature")) ?? [];
  const clinicalSignals = explanation?.clinicalSignals ?? [];
  if (!isLoading && !displayedFeatures.length && !clinicalSignals.length && !hasError) return null;

  if (isLoading) {
    return (
      <View style={tw`mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
        <Text style={tw`text-base font-bold text-slate-900`}>Symptom contribution</Text>
        <Text style={tw`mt-2 text-sm text-slate-500`}>Loading model explanation...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={tw`mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5`}>
        <Text style={tw`text-base font-bold text-amber-900`}>Symptom contribution unavailable</Text>
        <Text style={tw`mt-2 text-sm leading-5 text-amber-800`}>The prediction is available, but the model explanation could not be loaded. Check that the backend is running and try the assessment again.</Text>
      </View>
    );
  }

  const maximumContribution = Math.max(...displayedFeatures.map((item) => Math.abs(item.contribution)), 1);
  return (
    <View style={tw`mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
      <Text style={tw`text-base font-bold text-slate-900`}>Model contribution</Text>
      <Text style={tw`mt-1 text-xs leading-4 text-slate-500`}>Entered symptoms and temperature used for this prediction.</Text>
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
      {clinicalSignals.length ? <View style={tw`mt-5 border-t border-slate-100 pt-4`}>
        <Text style={tw`text-sm font-bold text-slate-900`}>Clinical vital-sign signals</Text>
        <View style={tw`mt-3 gap-3`}>
          {clinicalSignals.map((signal) => <View key={`${signal.feature}-${signal.value}`} style={tw`rounded-xl ${signal.status === "high" ? "bg-rose-50" : "bg-sky-50"} p-3`}><View style={tw`flex-row items-center justify-between`}><Text style={tw`text-sm font-bold text-slate-800`}>{signal.feature}</Text><Text style={tw`text-sm font-bold ${signal.status === "high" ? "text-rose-700" : "text-sky-700"}`}>{signal.status.toUpperCase()} · {signal.value}</Text></View><Text style={tw`mt-1 text-xs leading-4 text-slate-600`}>{signal.meaning}</Text></View>)}
        </View>
      </View> : null}
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
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.disease === "string" && typeof item.confidence === "number").slice(0, 5) : [];
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
        <Text style={tw`ml-2 text-xs font-medium text-slate-400`}>Waiting for model response</Text>
      </View>
    </View>
  );
}

function ResultCard({ icon, title, message }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }) {
  return (
    <View style={tw`mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm`}>
      <View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-teal-50`}>
        <Ionicons name={icon} size={23} color="#0F766E" />
      </View>
      <Text style={tw`mt-4 text-lg font-bold text-slate-900`}>{title}</Text>
      <Text style={tw`mt-2 text-sm leading-5 text-slate-600`}>{message}</Text>
    </View>
  );
}
