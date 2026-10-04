import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import Bar from "../Components/Charts/Bar";
import { getApiErrorMessage, listAssessments, type LocalAssessment } from "../services/api";

type WeeklyAssessmentPoint = {
  day: string;
  count: number;
};

export default function Home() {
  const [assessments, setAssessments] = useState<LocalAssessment[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(true);
  const [assessmentError, setAssessmentError] = useState("");
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
      listAssessments()
        .then((assessments) => {
          if (isActive) {
            setAssessments(assessments);
          }
        })
        .catch((error) => {
          if (isActive) setAssessmentError(getApiErrorMessage(error));
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
      <Navbar variant="hero" />
      <View style={tw`flex-1 bg-slate-100 px-5 py-4`}>
        <View
          style={{
            flex: 1,
            minHeight: 0,
            padding: 12,
            paddingBottom: 28,
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            shadowColor: "#0F172A",
            shadowOpacity: 0.06,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 2,
          }}
        >
          {isLoadingAssessments ? (
            <Text style={tw`py-12 text-center text-sm text-slate-500`}>Loading assessment activity...</Text>
          ) : assessmentError ? (
            <Text style={tw`py-10 text-center text-sm text-rose-600`}>{assessmentError}</Text>
          ) : (
            <Bar data={chartData} />
          )}
        </View>
      </View>
    </SafeAreaView>
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

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
