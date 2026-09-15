import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import { useSyncStore } from "../stores/syncStore";


export default function Home() {
  const router = useRouter();
  const pending = useSyncStore((state) => state.pendingSyncCount);
  const isOnline = useSyncStore((state) => state.isOnline);

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ScrollView contentContainerStyle={tw`pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <View style={tw`px-5 pt-6`}>
          <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>TODAY&apos;S WORKSPACE</Text>
          <Text style={tw`mt-2 text-3xl font-bold text-slate-900`}>Ready for the next patient</Text>
          <Text style={tw`mt-2 text-sm leading-5 text-slate-500`}>Capture symptoms and vital signs to receive model-supported decision guidance.</Text>

          <Pressable onPress={() => router.push("/Assess")} style={({ pressed }) => [tw`mt-6 flex-row items-center rounded-2xl bg-teal-700 p-5`, pressed && tw`opacity-80`]}>
            <View style={tw`h-12 w-12 items-center justify-center rounded-xl bg-teal-600`}><Ionicons name="pulse-outline" size={26} color="white" /></View>
            <View style={tw`ml-4 flex-1`}><Text style={tw`text-lg font-bold text-white`}>Start assessment</Text><Text style={tw`mt-1 text-sm text-teal-100`}>Record a patient encounter</Text></View>
            <Ionicons name="arrow-forward" size={22} color="white" />
          </Pressable>

          <View style={tw`mt-5 flex-row gap-3`}>
            <StatusCard icon="cloud-outline" label="Connection" value={isOnline ? "Online" : "Offline"} color={isOnline ? "text-emerald-700" : "text-amber-700"} />
            <StatusCard icon="sync-outline" label="Pending sync" value={String(pending)} color="text-slate-900" />
          </View>

          <Text style={tw`mb-3 mt-8 text-lg font-bold text-slate-900`}>Quick access</Text>
          <View style={tw`gap-3`}>
            <QuickAction icon="people-outline" title="Registered patients" detail="Manage patient records" onPress={() => router.push("/RegisteredPatients")} />
            <QuickAction icon="analytics-outline" title="Model knowledge base" detail="View diseases and symptoms loaded from the model" onPress={() => router.push("/Analysis")} />
          </View>
          <View style={tw`mt-6 flex-row items-start rounded-2xl bg-amber-50 p-4`}>
            <Ionicons name="information-circle-outline" size={21} color="#B45309" />
            <Text style={tw`ml-3 flex-1 text-sm leading-5 text-amber-900`}>Recommendations support clinical judgment. Refer urgently when danger signs are present.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusCard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  return <View style={tw`flex-1 rounded-2xl bg-white p-4`}><Ionicons name={icon} size={21} color="#0F766E" /><Text style={tw`mt-3 text-xs text-slate-500`}>{label}</Text><Text style={tw`mt-1 text-lg font-bold ${color}`}>{value}</Text></View>;
}

function QuickAction({ icon, title, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [tw`flex-row items-center rounded-2xl bg-white p-4`, pressed && tw`bg-teal-50`]}><View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-teal-50`}><Ionicons name={icon} size={22} color="#0F766E" /></View><View style={tw`ml-3 flex-1`}><Text style={tw`font-bold text-slate-900`}>{title}</Text><Text style={tw`mt-1 text-xs text-slate-500`}>{detail}</Text></View><Ionicons name="chevron-forward" size={19} color="#94A3B8" /></Pressable>;
}

