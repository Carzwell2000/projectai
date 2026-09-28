import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import { getApiErrorMessage, listAssessments, type LocalAssessment } from "../services/api";

type WeeklyAssessmentPoint = {
  day: string;
  count: number;
};

export default function Home() {
  const [assessments, setAssessments] = useState<LocalAssessment[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(true);
  const [assessmentError, setAssessmentError] = useState("");
  const [chartSize, setChartSize] = useState({ width: 0, height: 220 });
  const weeklyAssessments = useMemo(
    () => getWeeklyAssessmentCounts(assessments),
    [assessments],
  );
  const chartData = useMemo(
    () => weeklyAssessments.map((point) => ({ value: point.count, label: point.day })),
    [weeklyAssessments],
  );
  const chartMaximum = Math.max(4, ...weeklyAssessments.map((point) => point.count));
  const chartStep = Math.ceil(chartMaximum / 4);

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
      <View style={tw`flex-1 px-5`}>
        <View
          style={{ flex: 1, minHeight: 0 }}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setChartSize({ width, height: Math.max(160, height - 24) });
          }}
        >
          {isLoadingAssessments ? (
            <Text style={tw`py-12 text-center text-sm text-slate-500`}>Loading assessment activity...</Text>
          ) : assessmentError ? (
            <Text style={tw`py-10 text-center text-sm text-rose-600`}>{assessmentError}</Text>
          ) : (
            <BarChart
              data={chartData}
              width={chartSize.width || undefined}
              height={chartSize.height}
              adjustToWidth
              maxValue={chartStep * 4}
              noOfSections={4}
              stepValue={chartStep}
              barWidth={24}
              barBorderRadius={4}
              roundedTop
              frontColor="#0F766E"
              xAxisColor="#CBD5E1"
              yAxisColor="transparent"
              yAxisLabelWidth={42}
              yAxisTextStyle={{ color: "#475569", fontSize: 11 }}
              xAxisLabelTextStyle={{ color: "#475569", fontSize: 10, fontWeight: "600" }}
              rulesColor="#DDE6E5"
              rulesThickness={1}
              rulesType="dashed"
              initialSpacing={10}
              endSpacing={10}
            />
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


