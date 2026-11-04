import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import Bar from "../Components/Charts/Bar";
import { getApiErrorMessage, listAssessments, listPatients, type LocalAssessment } from "../services/api";

type WeeklyAssessmentPoint = {
  day: string;
  count: number;
};

export default function Home() {
  const [assessments, setAssessments] = useState<LocalAssessment[]>([]);
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(true);
  const [assessmentError, setAssessmentError] = useState("");
  const [patientError, setPatientError] = useState("");
  const todayCount = useMemo(() => getTodayAssessmentCount(assessments), [assessments]);
  const pendingCount = useMemo(
    () => assessments.filter((assessment) => assessment.sync_status !== "synced").length,
    [assessments],
  );
  const weeklyAssessments = useMemo(
    () => getWeeklyAssessmentCounts(assessments),
    [assessments],
  );
  const chartData = useMemo(
    () => weeklyAssessments.map((point) => ({ value: point.count, label: point.day })),
    [weeklyAssessments],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoadingAssessments(true);
      setAssessmentError("");
      setPatientError("");
      Promise.allSettled([listAssessments(), listPatients()])
        .then(([assessmentResult, patientResult]) => {
          if (!isActive) return;
          if (assessmentResult.status === "fulfilled") {
            setAssessments(assessmentResult.value);
          } else {
            setAssessmentError(getApiErrorMessage(assessmentResult.reason));
          }
          if (patientResult.status === "fulfilled") {
            setPatientCount(patientResult.value.length);
          } else {
            setPatientCount(null);
            setPatientError(getApiErrorMessage(patientResult.reason));
          }
        })
        .finally(() => {
          if (isActive) setIsLoadingAssessments(false);
        });
      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ScrollView contentContainerStyle={tw`pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <View style={tw`px-5 pt-5`}>
          <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>CLINICAL WORKSPACE</Text>
          <Text style={tw`mt-2 text-2xl font-bold text-slate-900`}>Your care overview</Text>
          <Text style={tw`mt-1 text-sm leading-5 text-slate-600`}>
            Review your activity or start a patient assessment.
          </Text>

          <View style={tw`mt-5 flex-row gap-2`}>
            <MetricCard label="Registered patients" value={isLoadingAssessments ? "—" : patientCount === null ? "—" : String(patientCount)} />
            <MetricCard label="Assessments today" value={isLoadingAssessments ? "—" : assessmentError ? "—" : String(todayCount)} />
            <MetricCard
              label="Saved assessments"
              value={isLoadingAssessments ? "—" : assessmentError ? "—" : String(assessments.length)}
              foot={isLoadingAssessments ? "Loading…" : assessmentError ? "Unavailable" : `${pendingCount} awaiting sync`}
            />
          </View>
          {assessmentError ? (
            <Text accessibilityRole="alert" style={tw`mt-2 text-xs leading-5 text-rose-700`}>
              Assessment activity could not be loaded: {assessmentError}
            </Text>
          ) : null}
          {patientError ? (
            <Text accessibilityRole="alert" style={tw`mt-2 text-xs leading-5 text-rose-700`}>
              Patient count could not be loaded: {patientError}
            </Text>
          ) : null}

          <View style={tw`mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}>
            <Text style={tw`text-xs font-bold tracking-widest text-slate-500`}>RECENT ACTIVITY</Text>
            <Text style={tw`mt-1 text-lg font-bold text-slate-900`}>Assessments this week</Text>
            {assessmentError ? (
              <Text style={tw`py-10 text-center text-sm text-slate-500`}>Weekly activity is unavailable.</Text>
            ) : isLoadingAssessments ? (
              <Text style={tw`py-10 text-center text-sm text-slate-500`}>Loading assessment activity...</Text>
            ) : (
              <View style={tw`mt-2`}>
                <Bar data={chartData} />
              </View>
            )}
          </View>

          <View style={tw`mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4`}>
            <View style={tw`flex-row items-start`}>
              <Ionicons name="shield-checkmark-outline" size={19} color="#0F766E" />
              <View style={tw`ml-2 flex-1`}>
                <Text style={tw`text-sm font-bold text-emerald-950`}>What to do next</Text>
                <Text style={tw`mt-1 text-sm leading-5 text-emerald-900`}>
                  Assess a patient, then review the result and clinical context. This tool provides decision support only; it does not diagnose or replace clinical judgment.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, foot }: { label: string; value: string; foot?: string }) {
  return (
    <View style={tw`min-h-28 flex-1 rounded-xl border border-slate-200 bg-white p-3 shadow-sm`}>
      <Text style={tw`text-[11px] font-semibold leading-4 text-slate-600`}>{label}</Text>
      <Text style={tw`mt-2 text-2xl font-bold text-slate-900`}>{value}</Text>
      {foot ? <Text style={tw`mt-1 text-[10px] leading-4 text-slate-500`}>{foot}</Text> : null}
    </View>
  );
}

function getWeeklyAssessmentCounts(assessments: LocalAssessment[]): WeeklyAssessmentPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 6 + index);
    return {
      key: getDateKey(date),
      day: String(date.getDate()),
      count: 0,
    };
  });
  const countsByDate = new Map(days.map((day) => [day.key, day]));

  assessments.forEach((assessment) => {
    const createdAt = new Date(assessment.created_at);
    if (Number.isNaN(createdAt.getTime())) return;
    const day = countsByDate.get(getDateKey(createdAt));
    if (day) day.count += 1;
  });

  return days.map(({ day, count }) => ({ day, count }));
}

function getTodayAssessmentCount(assessments: LocalAssessment[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getDateKey(today);
  return assessments.filter((assessment) => {
    const createdAt = new Date(assessment.created_at);
    return !Number.isNaN(createdAt.getTime()) && getDateKey(createdAt) === todayKey;
  }).length;
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
