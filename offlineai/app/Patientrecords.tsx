import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import { listAssessments, type LocalAssessment } from "../services/api";

type Patient = {
  name: string;
  id: string;
  age: string;
  temperature: string;
  symptoms: string;
  bloodPressure: string;
  recommendations: string;
  nurseName: string;
  assessedAt: string;
  result: string;
  syncStatus: string;
};

export default function Patientrecords() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const visiblePatients = useMemo(
    () => patients.filter((patient) => `${patient.name} ${patient.id}`.toLowerCase().includes(search.toLowerCase())),
    [patients, search],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      listAssessments().then((assessments) => {
        if (!isActive) return;
        setLoadError("");
        setPatients(assessments.map(assessmentToPatient));
      }).catch(() => {
        if (isActive) setLoadError("FastAPI is unavailable.");
      });
      return () => { isActive = false; };
    }, []),
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F3F7F5]`}>
      <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <View style={tw`flex-row items-end justify-between pt-3`}>
          <View>
            <Text style={tw`text-[10px] font-bold tracking-[1.7px] text-teal-700`}>ASSESSMENT HISTORY</Text>
            <Text style={tw`mt-1 text-2xl font-bold text-[#143B4F]`}>Patient records</Text>
          </View>
        </View>

        <View style={tw`mt-5 flex-row items-center rounded-2xl border border-[#E1ECE7] bg-white px-3`}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or ID" placeholderTextColor="#94A3B8" style={tw`ml-2 flex-1 py-4 text-sm text-slate-900`} />
        </View>

        <View style={tw`mt-6 flex-row items-center justify-between`}>
          <Text style={tw`text-base font-bold text-[#143B4F]`}>Recent assessments</Text>
          <Text style={tw`text-xs font-semibold text-slate-500`}>{patients.length} records</Text>
        </View>
        {loadError ? <Text style={tw`mt-2 text-sm font-medium text-rose-600`}>{loadError}</Text> : null}
        <View style={tw`mt-3 overflow-hidden rounded-2xl border border-[#E1ECE7] bg-white shadow-sm`}>
          {visiblePatients.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={tw`h-11 flex-row items-center bg-[#EAF8F2]`}>
                  <AssessmentTableCell width={170} header>Patient</AssessmentTableCell>
                  <AssessmentTableCell width={112} header>Assessed</AssessmentTableCell>
                  <AssessmentTableCell width={65} header>Age</AssessmentTableCell>
                  <AssessmentTableCell width={84} header>Temp.</AssessmentTableCell>
                  <AssessmentTableCell width={105} header>Blood pressure</AssessmentTableCell>
                  <AssessmentTableCell width={210} header>Symptoms</AssessmentTableCell>
                  <AssessmentTableCell width={155} header>Result</AssessmentTableCell>
                  <AssessmentTableCell width={230} header>Recommendation</AssessmentTableCell>
                  <AssessmentTableCell width={135} header>Staff</AssessmentTableCell>
                  <AssessmentTableCell width={94} header>Sync</AssessmentTableCell>
                </View>
                {visiblePatients.map((patient) => (
                  <View key={patient.id} style={tw`min-h-[64px] flex-row items-center border-t border-[#EDF2EF]`}>
                    <AssessmentTableCell width={170} strong>{patient.name}</AssessmentTableCell>
                    <AssessmentTableCell width={112}>{formatAssessmentDate(patient.assessedAt)}</AssessmentTableCell>
                    <AssessmentTableCell width={65}>{patient.age} yrs</AssessmentTableCell>
                    <AssessmentTableCell width={84}>{patient.temperature}</AssessmentTableCell>
                    <AssessmentTableCell width={105}>{patient.bloodPressure || "—"}</AssessmentTableCell>
                    <AssessmentTableCell width={210}>{patient.symptoms || "—"}</AssessmentTableCell>
                    <AssessmentTableCell width={155} strong>{patient.result}</AssessmentTableCell>
                    <AssessmentTableCell width={230}>{patient.recommendations}</AssessmentTableCell>
                    <AssessmentTableCell width={135}>{patient.nurseName}</AssessmentTableCell>
                    <View style={tw`w-[94px] px-3`}>
                      <View style={tw`self-start rounded-full ${patient.syncStatus === "synced" ? "bg-[#EAF8F2]" : "bg-amber-50"} px-2 py-1`}>
                        <Text style={tw`text-[9px] font-bold ${patient.syncStatus === "synced" ? "text-[#087C70]" : "text-amber-700"}`}>
                          {patient.syncStatus === "synced" ? "SYNCED" : "PENDING"}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={tw`items-center rounded-2xl border border-dashed border-[#C8DCD2] bg-white px-5 py-10`}>
              <Ionicons name="file-tray-outline" size={28} color="#087C70" />
              <Text style={tw`mt-3 text-sm font-bold text-[#143B4F]`}>No matching assessment records</Text>
              <Text style={tw`mt-1 text-center text-xs text-slate-500`}>Try searching for a different patient name or ID.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function assessmentToPatient(assessment: LocalAssessment): Patient {
  return {
    name: assessment.patient_name,
    id: assessment.id,
    age: String(assessment.age),
    temperature: `${assessment.temperature} °C`,
    symptoms: assessment.symptoms,
    bloodPressure: assessment.blood_pressure,
    recommendations: assessment.recommendation || "Await assessment",
    nurseName: assessment.nurse_name,
    assessedAt: assessment.created_at,
    result: assessment.disease || "Pending",
    syncStatus: assessment.sync_status,
  };
}

function AssessmentTableCell({ width, header, strong, children }: { width: number; header?: boolean; strong?: boolean; children: ReactNode }) {
  return (
    <Text
      numberOfLines={2}
      style={[
        tw`${header ? "text-[10px] font-bold uppercase tracking-wide text-[#55746A]" : strong ? "text-[11px] font-bold text-[#143B4F]" : "text-[10px] leading-4 text-slate-600"} px-3`,
        { width },
      ]}
    >
      {children}
    </Text>
  );
}

function formatAssessmentDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}
