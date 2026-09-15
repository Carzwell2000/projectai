import { Stack, useRouter } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import RegisterPatientForm, { NewPatient } from "../Components/RegisterPatient";
import { createPatient } from "../services/api";
import { useSyncStore } from "../stores/syncStore";

export default function RegisterPatientScreen() {
  const router = useRouter();

  const handleSave = async (patient: NewPatient) => {
    await createPatient(patient);
    void useSyncStore.getState().refresh();
    router.replace("/RegisteredPatients");
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={tw`px-5`}>
        <Navbar variant="hero" />
      </View>
      <View style={tw`flex-1 justify-end`}>
        <RegisterPatientForm onCancel={() => router.back()} onSave={handleSave} />
      </View>
    </SafeAreaView>
  );
}
