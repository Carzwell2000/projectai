import { Stack, useRouter } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import SettingsContent from "../Components/Settings";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F3F7F5]`}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <Pressable onPress={() => router.replace("/Home")} style={tw`mb-8 mt-3 flex-row items-center`}>
          <Text style={tw`text-sm font-bold text-teal-700`}>Back</Text>
        </Pressable>
        <Text style={tw`text-[10px] font-bold tracking-[1.7px] text-teal-700`}>PREFERENCES</Text>
        <Text style={tw`mt-1 text-2xl font-bold text-[#143B4F]`}>Settings</Text>
        <Text style={tw`mt-2 text-sm leading-5 text-slate-500`}>Configure your account and workspace preferences.</Text>
        <SettingsContent />
      </ScrollView>
    </SafeAreaView>
  );
}
