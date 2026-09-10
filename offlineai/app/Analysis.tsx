import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import SymptomTrendChart, { SymptomTrendPoint } from "../Components/SymptomTrendChart";

const posthogSymptomTrend: SymptomTrendPoint[] = [
  { label: "Mon", value: 18 }, { label: "Tue", value: 24 }, { label: "Wed", value: 21 },
  { label: "Thu", value: 32 }, { label: "Fri", value: 28 }, { label: "Sat", value: 36 }, { label: "Sun", value: 31 },
];

const commonSymptoms = [
  { name: "Fever", count: 84, color: "#0F766E" },
  { name: "Cough", count: 71, color: "#0284C7" },
  { name: "Headache", count: 58, color: "#D97706" },
  { name: "Difficulty breathing", count: 32, color: "#E11D48" },
];

export default function AnalysisScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <Pressable onPress={() => router.back()} style={tw`mb-7 mt-3 flex-row items-center`}>
          <Ionicons name="arrow-back" size={20} color="#0F766E" />
          <Text style={tw`ml-2 text-sm font-bold text-teal-700`}>Back</Text>
        </Pressable>
        <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>COMMUNITY SIGNALS</Text>
        <Text style={tw`mt-2 text-3xl font-bold text-slate-900`}>Symptom analysis</Text>
        <Text style={tw`mt-2 text-sm leading-5 text-slate-500`}>Understand what patients are reporting across your primary-care service.</Text>

        <View style={tw`mt-6 flex-row gap-3`}>
          <Metric label="Assessments" value="218" change="+12%" icon="clipboard-outline" />
          <Metric label="Patients seen" value="164" change="+8%" icon="people-outline" />
        </View>

        <View style={tw`mt-6 rounded-2xl bg-white p-4`}>
          <View style={tw`flex-row items-start justify-between`}>
            <View>
              <Text style={tw`text-lg font-bold text-slate-900`}>Reported symptoms</Text>
              <Text style={tw`mt-1 text-xs text-slate-500`}>Assessments completed this week</Text>
            </View>
            <View style={tw`rounded-full bg-teal-50 px-3 py-1`}><Text style={tw`text-xs font-bold text-teal-700`}>7 days</Text></View>
          </View>
          <View style={tw`mt-5`}><SymptomTrendChart data={posthogSymptomTrend} /></View>
          <Text style={tw`mt-4 text-[10px] text-slate-400`}>Data source: PostHog symptom assessment events</Text>
        </View>

        <View style={tw`mt-6 rounded-2xl bg-white p-4`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <Text style={tw`text-lg font-bold text-slate-900`}>Most reported symptoms</Text>
              <Text style={tw`mt-1 text-xs text-slate-500`}>Across current assessments</Text>
            </View>
            <Ionicons name="bar-chart-outline" size={22} color="#0F766E" />
          </View>
          <View style={tw`mt-5 gap-4`}>
            {commonSymptoms.map((symptom, index) => (
              <View key={symptom.name}>
                <View style={tw`mb-2 flex-row items-center justify-between`}>
                  <View style={tw`flex-row items-center`}><Text style={tw`w-6 text-xs font-bold text-slate-400`}>0{index + 1}</Text><Text style={tw`text-sm font-semibold text-slate-700`}>{symptom.name}</Text></View>
                  <Text style={tw`text-sm font-bold text-slate-900`}>{symptom.count}</Text>
                </View>
                <View style={tw`h-2 overflow-hidden rounded-full bg-slate-100`}><View style={[tw`h-full rounded-full`, { width: `${(symptom.count / commonSymptoms[0].count) * 100}%`, backgroundColor: symptom.color }]} /></View>
              </View>
            ))}
          </View>
        </View>

        <View style={tw`mt-6 flex-row items-start rounded-2xl bg-amber-50 p-4`}>
          <Ionicons name="information-circle-outline" size={22} color="#B45309" />
          <Text style={tw`ml-3 flex-1 text-sm leading-5 text-amber-900`}>Use these trends to guide outreach and stock planning. They are decision-support signals, not a diagnosis.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type MetricProps = { label: string; value: string; change: string; icon: keyof typeof Ionicons.glyphMap };

function Metric({ label, value, change, icon }: MetricProps) {
  return (
    <View style={tw`flex-1 rounded-2xl bg-white p-4`}>
      <View style={tw`flex-row items-center justify-between`}><View style={tw`h-9 w-9 items-center justify-center rounded-xl bg-teal-50`}><Ionicons name={icon} size={19} color="#0F766E" /></View><Text style={tw`text-xs font-bold text-emerald-600`}>{change}</Text></View>
      <Text style={tw`mt-4 text-2xl font-bold text-slate-900`}>{value}</Text><Text style={tw`mt-1 text-xs font-medium text-slate-500`}>{label}</Text>
    </View>
  );
}
