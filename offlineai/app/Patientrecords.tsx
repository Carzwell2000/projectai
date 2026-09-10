import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import RegisterPatient, { NewPatient } from "../Components/RegisterPatient";
import { createPatient, listAssessments, listPatients, type LocalAssessment, type PatientRecord } from "../services/api";

type Patient = NewPatient & {
  id: string;
  age: string;
  temperature: string;
  symptoms: string;
  bloodPressure: string;
  recommendations: string;
};

export default function Patientrecords() {
  const [patients, setPatients] = useState<Patient[]>([]);
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
      Promise.all([listPatients(), listAssessments()]).then(([serverPatients, assessments]) => {
        if (!isActive) return;
        setLoadError("");
        const assessmentPatients = assessments.map(assessmentToPatient);
        setPatients([...serverPatients.map(patientToRow), ...assessmentPatients]);
      }).catch((error) => {
        if (!isActive) return;
        setLoadError(error instanceof Error ? error.message : "FastAPI is unavailable.");
      });
      return () => { isActive = false; };
    }, []),
  );

  const registerPatient = async (newPatient: NewPatient) => {
    const patient = await createPatient(newPatient);
    setPatients((currentPatients) => [patientToRow(patient), ...currentPatients]);
    setIsRegistering(false);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <View style={tw`flex-row items-end justify-between pt-3`}>
          <View>
            <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>PATIENT CARE</Text>
            <Text style={tw`mt-2 text-3xl font-bold text-slate-900`}>Patient records</Text>
          </View>
          <Pressable accessibilityLabel="Register patient" onPress={() => setIsRegistering(true)} style={tw`h-11 w-11 items-center justify-center rounded-full bg-teal-600`}>
            <Ionicons name="person-add-outline" size={21} color="white" />
          </Pressable>
        </View>

        <View style={tw`mt-6 flex-row items-center rounded-xl bg-white px-3`}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or ID" placeholderTextColor="#94A3B8" style={tw`ml-2 flex-1 py-4 text-sm text-slate-900`} />
          <Ionicons name="options-outline" size={20} color="#0F766E" />
        </View>

        <View style={tw`mt-6 flex-row items-center justify-between`}>
          <Text style={tw`text-lg font-bold text-slate-900`}>All patients</Text>
          <Text style={tw`text-sm font-medium text-slate-500`}>{patients.length} records</Text>
        </View>
        {loadError ? <Text style={tw`mt-2 text-sm font-medium text-rose-600`}>{loadError}</Text> : null}
        <View style={tw`mt-2 flex-row items-center justify-between`}><Text style={tw`text-xs text-slate-400`}>Swipe or use arrows to view all fields.</Text><View style={tw`rounded-full bg-teal-50 px-2 py-1`}><Text style={tw`text-[10px] font-bold text-teal-700`}>CLINICAL TABLE</Text></View></View>
        <View style={tw`mt-3 flex-row justify-end gap-2`}>
          <Pressable
            accessibilityLabel="Move table left"
            accessibilityRole="button"
            onPress={() => {
              const nextOffset = Math.max(tableOffset - 260, 0);
              setTableOffset(nextOffset);
              tableScrollRef.current?.scrollTo({ x: nextOffset, animated: true });
            }}
            style={({ pressed }) => [tw`h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm`, pressed && tw`opacity-70`]}
          >
            <Ionicons name="arrow-back" size={20} color="#0F766E" />
          </Pressable>
          <Pressable
            accessibilityLabel="Move table right"
            accessibilityRole="button"
            onPress={() => {
              const nextOffset = Math.min(tableOffset + 260, TABLE_WIDTH);
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
          contentContainerStyle={{ minWidth: TABLE_WIDTH }}
          style={tw`mt-3`}
        >
          <View style={[tw`overflow-hidden rounded-2xl bg-white`, { width: TABLE_WIDTH }]}>
            <View style={tw`flex-row bg-teal-700`}>
              {tableHeaders.map((header) => <Text key={header.label} style={[tw`px-3 py-3 text-xs font-bold text-white`, { width: header.width }]}>{header.label}</Text>)}
            </View>
            {visiblePatients.map((patient, index) => <PatientRow key={patient.id} patient={patient} shaded={index % 2 === 1} />)}
            {visiblePatients.length === 0 ? <Text style={tw`w-[760px] px-4 py-8 text-center text-sm text-slate-500`}>No patients match your search.</Text> : null}
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

function patientToRow(patient: PatientRecord): Patient {
  return {
    ...patient,
    age: "--",
    temperature: "--",
    symptoms: patient.condition,
    bloodPressure: "--",
    recommendations: "Await assessment",
  };
}

function assessmentToPatient(assessment: LocalAssessment): Patient {
  return {
    name: assessment.patient_name,
    id: assessment.id,
    phone: "",
    dateOfBirth: "",
    condition: assessment.disease || "Clinical assessment",
    age: String(assessment.age),
    temperature: `${assessment.temperature} °C`,
    symptoms: assessment.symptoms,
    bloodPressure: assessment.blood_pressure,
    recommendations: assessment.recommendation || "Await assessment",
  };
}

const TABLE_WIDTH = 774;

const tableHeaders = [
  { label: "Patient name", width: 150 },
  { label: "Age", width: 64 },
  { label: "Temperature", width: 110 },
  { label: "Symptoms", width: 180 },
  { label: "BP", width: 100 },
  { label: "Recommendations", width: 170 },
];

function PatientRow({ patient, shaded }: { patient: Patient; shaded: boolean }) {
  return (
    <View style={[tw`flex-row border-b border-slate-100`, shaded && tw`bg-slate-50`]}>
      <Text style={[tw`px-3 py-4 text-xs font-bold text-slate-800`, { width: tableHeaders[0].width }]}>{patient.name}</Text>
      <Text style={[tw`px-3 py-4 text-xs text-slate-600`, { width: tableHeaders[1].width }]}>{patient.age}</Text>
      <Text style={[tw`px-3 py-4 text-xs text-slate-600`, { width: tableHeaders[2].width }]}>{patient.temperature}</Text>
      <Text style={[tw`px-3 py-4 text-xs text-slate-600`, { width: tableHeaders[3].width }]}>{patient.symptoms}</Text>
      <Text style={[tw`px-3 py-4 text-xs text-slate-600`, { width: tableHeaders[4].width }]}>{patient.bloodPressure}</Text>
      <Text style={[tw`px-3 py-4 text-xs font-semibold text-teal-700`, { width: tableHeaders[5].width }]}>{patient.recommendations}</Text>
    </View>
  );
}
