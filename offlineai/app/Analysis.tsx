import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import SymptomTrendChart, { SymptomTrendPoint } from "../Components/Analytics";
import { getModelCatalog, type ModelCatalog } from "../services/api";

const posthogSymptomTrend: SymptomTrendPoint[] = [
  { label: "Mon", value: 18 }, { label: "Tue", value: 24 }, { label: "Wed", value: 21 },
  { label: "Thu", value: 32 }, { label: "Fri", value: 28 }, { label: "Sat", value: 36 }, { label: "Sun", value: 31 },
];

export default function AnalysisScreen() {
  const router = useRouter();
  const [modelCatalog, setModelCatalog] = useState<ModelCatalog | null>(null);

  useEffect(() => {
    getModelCatalog()
      .then(setModelCatalog)
      .catch(() => undefined);
  }, []);

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F3F7F5]`}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <Pressable onPress={() => router.back()} style={tw`mb-7 mt-3 flex-row items-center`}>
          <Ionicons name="arrow-back" size={20} color="#0F766E" />
          <Text style={tw`ml-2 text-sm font-bold text-teal-700`}>Back</Text>
        </Pressable>
        <Text style={tw`text-[10px] font-bold tracking-[1.7px] text-teal-700`}>COMMUNITY SIGNALS</Text>
        <Text style={tw`mt-1 text-2xl font-bold text-[#143B4F]`}>Symptom analysis</Text>
        <Text style={tw`mt-2 text-sm leading-5 text-slate-500`}>Understand what patients are reporting across your primary-care service.</Text>

        <View style={tw`mt-4 flex-row items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5`}>
          <Ionicons name="information-circle-outline" size={17} color="#B45309" />
          <Text style={tw`ml-2 flex-1 text-[11px] leading-4 text-amber-800`}>The community trend values on this screen are illustrative sample data, not live clinic analytics.</Text>
        </View>

        <View style={tw`mt-6 flex-row gap-3`}>
          <Metric label="Assessments" value="218" change="+12%" icon="clipboard-outline" />
          <Metric label="Patients seen" value="164" change="+8%" icon="people-outline" />
        </View>

        <View style={tw`mt-5 rounded-[20px] border border-[#E1ECE7] bg-white p-4 shadow-sm`}>
          <View style={tw`flex-row items-start justify-between`}>
            <View>
              <Text style={tw`text-lg font-bold text-slate-900`}>Reported symptoms</Text>
              <Text style={tw`mt-1 text-xs text-slate-500`}>Assessments completed this week</Text>
            </View>
            <View style={tw`rounded-full bg-teal-50 px-3 py-1`}><Text style={tw`text-xs font-bold text-teal-700`}>7 days</Text></View>
          </View>
          <View style={tw`mt-5`}><SymptomTrendChart data={posthogSymptomTrend} /></View>
          <Text style={tw`mt-4 text-[10px] text-slate-400`}>Illustrative sample trend · not connected to live event data</Text>
        </View>

        <View style={tw`mt-4 rounded-[20px] border border-[#E1ECE7] bg-white p-4 shadow-sm`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View>
              <Text style={tw`text-lg font-bold text-slate-900`}>Clinical knowledge base</Text>
              <Text style={tw`mt-1 text-xs text-slate-500`}>Symptom vocabulary used for predictions</Text>
            </View>
            <Ionicons name="bar-chart-outline" size={22} color="#0F766E" />
          </View>
          <View style={tw`mt-5 flex-row gap-3`}>
            <CatalogMetric label="Diseases" value={modelCatalog ? String(modelCatalog.diseases.length) : "--"} />
            <CatalogMetric label="Symptoms" value={modelCatalog ? String(modelCatalog.symptoms.length) : "--"} />
          </View>
          <Text style={tw`mt-4 text-xs leading-5 text-slate-500`}>
            {modelCatalog ? `Version ${modelCatalog.modelVersion} recognizes symptoms such as ${modelCatalog.symptoms.slice(0, 4).join(", ")}.` : "Connect to the API to load the symptom vocabulary."}
          </Text>
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

function CatalogMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={tw`flex-1 rounded-xl bg-[#F1F8F5] p-3`}>
      <Text style={tw`text-2xl font-bold text-[#143B4F]`}>{value}</Text>
      <Text style={tw`mt-1 text-xs font-medium text-slate-500`}>{label}</Text>
    </View>
  );
}

function Metric({ label, value, change, icon }: MetricProps) {
  return (
    <View style={tw`flex-1 rounded-[20px] border border-[#E1ECE7] bg-white p-4 shadow-sm`}>
      <View style={tw`flex-row items-center justify-between`}><View style={tw`h-9 w-9 items-center justify-center rounded-xl bg-teal-50`}><Ionicons name={icon} size={19} color="#0F766E" /></View><Text style={tw`text-xs font-bold text-emerald-600`}>{change}</Text></View>
      <Text style={tw`mt-4 text-2xl font-bold text-[#143B4F]`}>{value}</Text><Text style={tw`mt-1 text-xs font-medium text-slate-500`}>{label} · sample</Text>
    </View>
  );
}
