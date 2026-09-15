import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import RegisterPatient, { type NewPatient } from "../Components/RegisterPatient";
import { createPatient, getApiErrorMessage, listPatients, type PatientRecord } from "../services/api";
import { useSyncStore } from "../stores/syncStore";

export default function RegisteredPatients() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loadError, setLoadError] = useState("");
  const visiblePatients = useMemo(
    () => patients.filter((patient) => `${patient.name} ${patient.id}`.toLowerCase().includes(search.toLowerCase())),
    [patients, search],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      listPatients().then((records) => {
        if (!isActive) return;
        setPatients(records);
        setLoadError("");
      }).catch((error) => {
        if (isActive) setLoadError(getApiErrorMessage(error));
      });
      return () => { isActive = false; };
    }, []),
  );

  const registerPatient = async (patient: NewPatient) => {
    const created = await createPatient(patient);
    void useSyncStore.getState().refresh();
    setPatients((current) => [created, ...current]);
    setIsRegistering(false);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <View style={tw`flex-row items-end justify-between pt-3`}>
          <View>
            <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}></Text>
            <Text style={tw`mt-2 text-3xl font-bold text-slate-900`}>Registered patients</Text>
          </View>
          <Pressable accessibilityLabel="Register patient" onPress={() => setIsRegistering(true)} style={tw`h-11 w-11 items-center justify-center rounded-full bg-teal-600`}>
            <Ionicons name="person-add-outline" size={21} color="white" />
          </Pressable>
        </View>

        <View style={tw`mt-6 flex-row items-center rounded-xl bg-white px-3`}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or ID" placeholderTextColor="#94A3B8" style={tw`ml-2 flex-1 py-4 text-sm text-slate-900`} />
        </View>
        <View style={tw`mt-6 flex-row items-center justify-between`}>
          <Text style={tw`text-lg font-bold text-slate-900`}></Text>
          <Text style={tw`text-sm font-medium text-slate-500`}>{patients.length} registered</Text>
        </View>
        {loadError ? <Text style={tw`mt-2 text-sm font-medium text-rose-600`}>{loadError}</Text> : null}
        <View style={tw`mt-3 gap-3`}>
          {visiblePatients.map((patient) => (
            <View key={patient.id} style={tw`rounded-2xl bg-white p-4 shadow-sm`}>
              <View style={tw`flex-row items-center justify-between`}>
                <Text style={tw`text-base font-bold text-slate-900`}>{patient.name}</Text>
                <Text style={tw`text-xs font-semibold text-teal-700`}>{patient.syncStatus}</Text>
              </View>
              <Text style={tw`mt-1 text-xs text-slate-500`}>{patient.phone} · DOB: {patient.dateOfBirth}</Text>
              <Text style={tw`mt-2 text-xs text-slate-400`}>{patient.id}</Text>
            </View>
          ))}
          {visiblePatients.length === 0 ? <Text style={tw`rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-500`}>No registered patients found.</Text> : null}
        </View>
      </ScrollView>
      <Modal animationType="slide" transparent visible={isRegistering} onRequestClose={() => setIsRegistering(false)}>
        <View style={tw`flex-1 justify-end bg-slate-900/30`}>
          <RegisterPatient onCancel={() => setIsRegistering(false)} onSave={registerPatient} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
