import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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
  const tableScrollRef = useRef<ScrollView>(null);
  const [tableOffset, setTableOffset] = useState(0);
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
    setLoadError("");
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
          <Text style={tw`text-lg font-bold text-slate-900`}>All patients</Text>
          <Text style={tw`text-sm font-medium text-slate-500`}>{patients.length} registered</Text>
        </View>
        {loadError ? <Text style={tw`mt-2 text-sm font-medium text-rose-600`}>{loadError}</Text> : null}
        <View style={tw`mt-2 flex-row items-center justify-between`}>
          <Text style={tw`text-xs text-slate-400`}>Swipe to view all patient details.</Text>
          <View style={tw`rounded-full bg-teal-50 px-2 py-1`}>
            <Text style={tw`text-[10px] font-bold text-teal-700`}>PATIENT TABLE</Text>
          </View>
        </View>
        <View style={tw`mt-3 flex-row justify-end gap-2`}>
          <Pressable
            accessibilityLabel="Move patient table left"
            accessibilityRole="button"
            onPress={() => {
              const nextOffset = Math.max(tableOffset - 240, 0);
              setTableOffset(nextOffset);
              tableScrollRef.current?.scrollTo({ x: nextOffset, animated: true });
            }}
            style={({ pressed }) => [tw`h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm`, pressed && tw`opacity-70`]}
          >
            <Ionicons name="arrow-back" size={20} color="#0F766E" />
          </Pressable>
          <Pressable
            accessibilityLabel="Move patient table right"
            accessibilityRole="button"
            onPress={() => {
              const nextOffset = Math.min(tableOffset + 240, PATIENT_TABLE_WIDTH);
              setTableOffset(nextOffset);
              tableScrollRef.current?.scrollTo({ x: nextOffset, animated: true });
            }}
            style={({ pressed }) => [tw`h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm`, pressed && tw`opacity-70`]}
          >
            <Ionicons name="arrow-forward" size={20} color="#0F766E" />
          </Pressable>
        </View>
        <ScrollView
          ref={tableScrollRef}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator
          onScroll={(event) => setTableOffset(event.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
          contentContainerStyle={{ minWidth: PATIENT_TABLE_WIDTH }}
          style={tw`mt-3`}
        >
          <View style={[tw`overflow-hidden rounded-2xl bg-white`, { width: PATIENT_TABLE_WIDTH }]}>
            <View style={tw`flex-row bg-teal-700`}>
              {patientTableHeaders.map((header) => (
                <Text key={header.label} style={[tw`px-3 py-3 text-xs font-bold text-white`, { width: header.width }]}>
                  {header.label}
                </Text>
              ))}
            </View>
            {visiblePatients.map((patient, index) => (
              <PatientRow key={patient.id} patient={patient} shaded={index % 2 === 1} />
            ))}
            {visiblePatients.length === 0 ? (
              <Text style={tw`w-[820px] px-4 py-8 text-center text-sm text-slate-500`}>No registered patients found.</Text>
            ) : null}
          </View>
        </ScrollView>
      </ScrollView>
      <Modal animationType="slide" transparent visible={isRegistering} onRequestClose={() => setIsRegistering(false)}>
        <View style={tw`flex-1 justify-end bg-slate-900/30`}>
          <RegisterPatient onCancel={() => setIsRegistering(false)} onSave={registerPatient} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const PATIENT_TABLE_WIDTH = 820;

const patientTableHeaders = [
  { label: "Patient name", width: 170 },
  { label: "Phone number", width: 155 },
  { label: "Date of birth", width: 145 },
  { label: "Registered by", width: 120 },
  { label: "Status", width: 115 },
  { label: "Patient ID", width: 115 },
];

function PatientRow({ patient, shaded }: { patient: PatientRecord; shaded: boolean }) {
  return (
    <View style={[tw`flex-row border-b border-slate-100`, shaded && tw`bg-slate-50`]}>
      <Text style={[tw`px-3 py-4 text-xs font-bold text-slate-800`, { width: patientTableHeaders[0].width }]}>{patient.name}</Text>
      <Text style={[tw`px-3 py-4 text-xs text-slate-600`, { width: patientTableHeaders[1].width }]}>{patient.phone}</Text>
      <Text style={[tw`px-3 py-4 text-xs text-slate-600`, { width: patientTableHeaders[2].width }]}>{patient.dateOfBirth}</Text>
      <Text style={[tw`px-3 py-4 text-xs font-semibold text-slate-600`, { width: patientTableHeaders[3].width }]}>{patient.registeredBy}</Text>
      <Text style={[tw`px-3 py-4 text-xs font-semibold text-teal-700`, { width: patientTableHeaders[4].width }]}>{patient.syncStatus}</Text>
      <Text style={[tw`px-3 py-4 text-xs text-slate-400`, { width: patientTableHeaders[5].width }]}>{patient.id}</Text>
    </View>
  );
}
