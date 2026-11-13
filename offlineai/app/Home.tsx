import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import Bar from "../Components/Charts/Bar";
import { getApiErrorMessage, listAssessments, listPatients, type LocalAssessment, type PatientRecord } from "../services/api";

type WeeklyAssessmentPoint = {
  day: string;
  count: number;
};

export default function Home() {
  const [assessments, setAssessments] = useState<LocalAssessment[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
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
  const assessedPatientCount = useMemo(() => {
    const patientNameCounts = patients.reduce((counts, patient) => {
      const name = patient.name.trim().toLowerCase();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
    const assessedPatientNames = new Set(
      assessments
        .map((assessment) => assessment.patient_name.trim().toLowerCase())
        .filter((name) => name && patientNameCounts.get(name) === 1),
    );
    return patients.filter((patient) => {
      const name = patient.name.trim().toLowerCase();
      return name && patientNameCounts.get(name) === 1 && assessedPatientNames.has(name);
    }).length;
  }, [assessments, patients]);

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
            setPatients(patientResult.value);
          } else {
            setPatients([]);
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
    <SafeAreaView style={tw`flex-1 bg-[#F3F7F5]`}>
      <ScrollView contentContainerStyle={tw`pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <View style={tw`px-5 pt-5`}>
          <Text style={tw`text-[10px] font-bold tracking-[1.7px] text-teal-700`}>TODAY AT A GLANCE</Text>
          <Text style={tw`mt-1 text-2xl font-bold text-[#143B4F]`}>Your care overview</Text>
          <Text style={tw`mt-1 text-sm leading-5 text-slate-600`}>
            Review your activity or start a patient assessment.
          </Text>

          <View style={tw`mt-4 flex-row gap-3`}>
            <MetricCard icon="people-outline" tone="green" label="Registered patients" value={isLoadingAssessments || patientError ? "—" : String(patients.length)} />
            <MetricCard icon="clipboard-outline" tone="blue" label="Assessments today" value={isLoadingAssessments || assessmentError ? "—" : String(todayCount)} />
          </View>
          <View style={tw`mt-3 flex-row gap-3`}>
            <MetricCard icon="pulse-outline" tone="purple" label="Saved assessments" value={isLoadingAssessments || assessmentError ? "—" : String(assessments.length)} foot={assessmentError ? "Unavailable" : "All saved records"} />
            <MetricCard icon="cloud-upload-outline" tone="orange" label="Awaiting sync" value={isLoadingAssessments || assessmentError ? "—" : String(pendingCount)} foot={pendingCount === 0 ? "Records are up to date" : "Waiting for connection"} />
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

          <View style={tw`mt-5 rounded-[20px] border border-[#E1ECE7] bg-white p-4 shadow-sm`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View>
                <Text style={tw`text-[10px] font-bold tracking-[1.5px] text-teal-700`}>RECENT ACTIVITY</Text>
                <Text style={tw`mt-1 text-lg font-bold text-[#143B4F]`}>Assessments this week</Text>
              </View>
              <View style={tw`h-9 w-9 items-center justify-center rounded-xl bg-[#E4F6F0]`}>
                <Ionicons name="analytics-outline" size={19} color="#087C70" />
              </View>
            </View>
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

          <PatientOverview
            patientCount={patientError ? null : patients.length}
            assessedCount={patientError || assessmentError ? null : assessedPatientCount}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PatientOverview({ patientCount, assessedCount }: { patientCount: number | null; assessedCount: number | null }) {
  const [contentWidth, setContentWidth] = useState(0);
  const chartSize = Math.min(158, Math.max(116, contentWidth * 0.44));
  const strokeWidth = Math.max(20, chartSize * 0.17);
  const radius = (chartSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const coverage = patientCount && assessedCount !== null
    ? Math.max(0, Math.min(1, assessedCount / patientCount))
    : 0;
  const dashLength = circumference * coverage;

  return (
    <View
      style={tw`mt-4 rounded-[20px] border border-[#E1ECE7] bg-white p-4 shadow-sm`}
      onLayout={(event) => setContentWidth(event.nativeEvent.layout.width - 32)}
    >
      <View style={tw`flex-row items-center`}>
        <Ionicons name="pulse-outline" size={20} color="#08A88A" />
        <Text style={tw`ml-2 text-base font-bold text-[#143B4F]`}>Patient overview</Text>
      </View>
      <View style={tw`mt-4 flex-row items-center justify-between`}>
        <View style={{ width: chartSize, height: chartSize, alignItems: "center", justifyContent: "center" }}>
          {contentWidth > 0 ? (
            <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
              <Circle
                cx={chartSize / 2}
                cy={chartSize / 2}
                r={radius}
                fill="none"
                stroke={assessedCount === null || patientCount === 0 ? "#E5EBE7" : "#FFA92E"}
                strokeWidth={strokeWidth}
              />
              {dashLength > 0 ? (
                <Circle
                  cx={chartSize / 2}
                  cy={chartSize / 2}
                  r={radius}
                  fill="none"
                  stroke="#09AD8B"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeLinecap="butt"
                  rotation={-90}
                  origin={`${chartSize / 2}, ${chartSize / 2}`}
                />
              ) : null}
            </Svg>
          ) : null}
          <View style={tw`absolute items-center`}>
            <Text style={tw`text-2xl font-extrabold text-[#143B4F]`}>{patientCount === null ? "—" : patientCount}</Text>
            <Text style={tw`mt-0.5 text-[10px] font-bold text-[#527182]`}>Patients</Text>
          </View>
        </View>
        <View style={tw`ml-3 flex-1 gap-4`}>
          <OverviewLegend color="#09AD8B" label="With assessment" value={assessedCount === null ? "—" : assessedCount} />
          <OverviewLegend color="#FFA92E" label="Not yet assessed" value={patientCount === null || assessedCount === null ? "—" : Math.max(0, patientCount - assessedCount)} />
        </View>
      </View>
      <Text style={tw`mt-3 text-center text-[10px] leading-4 text-[#84969D]`}>
        Based on saved records in your patient list.
      </Text>
    </View>
  );
}

function OverviewLegend({ color, label, value }: { color: string; label: string; value: number | string }) {
  return (
    <View style={tw`flex-row items-center`}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={tw`ml-2 flex-1 text-[11px] text-[#456174]`}>{label}</Text>
      <Text style={tw`ml-2 text-xs font-bold text-[#27435A]`}>{value}</Text>
    </View>
  );
}

function MetricCard({ icon, tone, label, value, foot }: { icon: keyof typeof Ionicons.glyphMap; tone: "green" | "blue" | "purple" | "orange"; label: string; value: string; foot?: string }) {
  const toneStyles = {
    green: { card: "border-[#B0EBDC] bg-[#EBFBF5]", icon: "bg-[#0BB58A]", text: "text-[#117C68]" },
    blue: { card: "border-[#C3DFFF] bg-[#EFF7FF]", icon: "bg-[#358FDA]", text: "text-[#2774AE]" },
    purple: { card: "border-[#E0D0FF] bg-[#F7F2FF]", icon: "bg-[#8255D5]", text: "text-[#7046B8]" },
    orange: { card: "border-[#FFE0C4] bg-[#FFF6ED]", icon: "bg-[#F18A38]", text: "text-[#B96A27]" },
  }[tone];

  return (
    <View style={tw`min-h-[122px] flex-1 overflow-hidden rounded-[18px] border p-3 shadow-sm ${toneStyles.card}`}>
      <View style={tw`flex-row items-center justify-between`}>
        <Text numberOfLines={2} style={tw`flex-1 pr-1 text-[10px] font-bold leading-4 text-[#25475A]`}>{label}</Text>
        <View style={tw`h-9 w-9 items-center justify-center rounded-full ${toneStyles.icon}`}>
          <Ionicons name={icon} size={18} color="white" />
        </View>
      </View>
      <Text style={tw`mt-1 text-2xl font-extrabold text-[#143B4F]`}>{value}</Text>
      {foot ? <Text numberOfLines={1} style={tw`mt-auto pt-1 text-[9px] font-medium ${toneStyles.text}`}>{foot}</Text> : null}
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
