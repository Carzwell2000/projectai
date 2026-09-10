import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import SymptomTrendChart, { type SymptomTrendPoint } from "../Components/SymptomTrendChart";
import { listAssessments } from "../services/api";

export default function Home() {
  const router = useRouter();
  const [symptomTrend, setSymptomTrend] = useState<SymptomTrendPoint[]>(() => buildSymptomTrend([]));

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      listAssessments().then((assessments) => {
        if (isActive) setSymptomTrend(buildSymptomTrend(assessments));
      }).catch(() => {
        if (isActive) setSymptomTrend(buildSymptomTrend([]));
      });
      return () => { isActive = false; };
    }, []),
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-sky-500`}>
      <ScrollView contentContainerStyle={tw`pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <View style={tw`rounded-t-3xl bg-slate-50 px-5 pt-6`}>
        <View style={tw`pb-6`}>
          <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>MONDAY, 05 SEPTEMBER</Text>
          <Text style={tw`mt-2 text-2xl font-bold text-slate-900`}>Good morning, Dr. Amina</Text>
          <Text style={tw`mt-1 text-sm text-slate-500`}>Here&apos;s your care overview for today.</Text>
        </View>
        <View style={tw`rounded-3xl bg-teal-800 p-5 shadow-sm`}>
          <View style={tw`flex-row items-start justify-between`}>
            <View style={tw`flex-1 pr-4`}>
              <Text style={tw`text-xs font-bold tracking-widest text-teal-100`}>TODAY&apos;S FOCUS</Text>
              <Text style={tw`mt-2 text-2xl font-bold leading-8 text-white`}>Make every assessment count.</Text>
              <Text style={tw`mt-2 text-sm leading-5 text-teal-100`}>Use clinical insights to support faster, more confident decisions.</Text>
            </View>
            <View style={tw`h-12 w-12 items-center justify-center rounded-2xl bg-teal-600`}><Ionicons name="sparkles-outline" size={25} color="#CCFBF1" /></View>
          </View>
        </View>
        <View style={tw`mt-6 flex-row gap-3`}>
          <View style={tw`flex-1 rounded-2xl bg-white p-4 shadow-sm`}><View style={tw`h-9 w-9 items-center justify-center rounded-xl bg-amber-100`}><Ionicons name="clipboard-outline" size={19} color="#B45309" /></View><Text style={tw`mt-4 text-2xl font-bold text-slate-900`}>12</Text><Text style={tw`mt-1 text-xs font-medium text-slate-500`}>Open assessments</Text></View>
          <View style={tw`flex-1 rounded-2xl bg-white p-4 shadow-sm`}><View style={tw`h-9 w-9 items-center justify-center rounded-xl bg-sky-100`}><Ionicons name="people-outline" size={19} color="#0369A1" /></View><Text style={tw`mt-4 text-2xl font-bold text-slate-900`}>248</Text><Text style={tw`mt-1 text-xs font-medium text-slate-500`}>Active patients</Text></View>
        </View>
        <View style={tw`mt-6 rounded-2xl bg-white p-4`}>
          <View style={tw`flex-row items-start justify-between`}>
            <View>
              <Text style={tw`text-lg font-bold text-slate-900`}>Symptoms asked at home</Text>
              <Text style={tw`mt-1 text-xs text-slate-500`}>Stored assessments from the last 7 days</Text>
            </View>
            <Ionicons name="analytics-outline" size={22} color="#0F766E" />
          </View>
          <View style={tw`mt-5`}><SymptomTrendChart data={symptomTrend} /></View>
        </View>
        <View style={tw`mb-3 mt-8 flex-row items-end justify-between`}>
          <View><Text style={tw`text-lg font-bold text-slate-900`}>Quick actions</Text><Text style={tw`mt-1 text-xs text-slate-500`}>Common tasks for your clinic</Text></View>
        </View>
        <View style={tw`gap-3`}>
          <Pressable onPress={() => router.push("/Assess")} style={({ pressed }) => [tw`flex-row items-center rounded-2xl bg-white p-4`, pressed && tw`opacity-70`]}><View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-teal-100`}><Ionicons name="add-circle-outline" size={23} color="#0F766E" /></View><View style={tw`ml-3 flex-1`}><Text style={tw`font-bold text-slate-900`}>Start an assessment</Text><Text style={tw`mt-1 text-xs text-slate-500`}>Review symptoms and clinical indicators</Text></View><Ionicons name="chevron-forward" size={20} color="#94A3B8" /></Pressable>
          <Pressable onPress={() => router.push("/RegisterPatient")} style={({ pressed }) => [tw`flex-row items-center rounded-2xl bg-white p-4`, pressed && tw`opacity-70`]}><View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-indigo-100`}><Ionicons name="person-add-outline" size={21} color="#4F46E5" /></View><View style={tw`ml-3 flex-1`}><Text style={tw`font-bold text-slate-900`}>Register a patient</Text><Text style={tw`mt-1 text-xs text-slate-500`}>Create a secure patient record</Text></View><Ionicons name="chevron-forward" size={20} color="#94A3B8" /></Pressable>
        </View>
        <View style={tw`mt-8 flex-row items-center justify-between`}><Text style={tw`text-lg font-bold text-slate-900`}>Recent activity</Text><Text onPress={() => router.push("/Patientrecords")} style={tw`text-sm font-bold text-teal-700`}>View all</Text></View>
        <View style={tw`mt-3 rounded-2xl border border-slate-100 bg-white p-4`}><View style={tw`flex-row items-center`}><View style={tw`h-9 w-9 items-center justify-center rounded-xl bg-emerald-50`}><Ionicons name="checkmark" size={19} color="#059669" /></View><View style={tw`ml-3 flex-1`}><Text style={tw`font-bold text-slate-900`}>Assessment completed</Text><Text style={tw`mt-1 text-sm text-slate-500`}>Maya Okafor · Respiratory review</Text></View><Text style={tw`text-xs font-medium text-slate-400`}>09:42</Text></View></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildSymptomTrend(assessments: { created_at: string }[]): SymptomTrendPoint[] {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));
    return date;
  });
  const counts = assessments.reduce<Record<string, number>>((result, assessment) => {
    const date = new Date(assessment.created_at);
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().slice(0, 10);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});

  return days.map((date) => ({
    label: date.toLocaleDateString(undefined, { weekday: "short" }),
    value: counts[date.toISOString().slice(0, 10)] ?? 0,
  }));
}
