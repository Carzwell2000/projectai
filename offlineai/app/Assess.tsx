import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

import Navbar from "../Components/Navbar";
import { createAssessment, getApiErrorMessage, listPatients, parseAssessment, type AssessmentResult, type PatientRecord } from "../services/api";
import { inferOfflineTriage } from "../services/offlineTriage";
import { saveOfflineAssessment } from "../services/offlineStorage";
import { useSyncStore } from "../stores/syncStore";

export default function Assess() {
  const router = useRouter();

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isPatientPickerOpen, setIsPatientPickerOpen] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [temperature, setTemperature] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [symptomsText, setSymptomsText] = useState("");

  const [validationMessage, setValidationMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
    let isActive = true;
    setIsLoadingPatients(true);
    listPatients()
      .then((records) => {
        if (isActive) setPatients(records);
      })
      .catch(() => {
        if (isActive) setValidationMessage("Unable to load registered patients.");
      })
      .finally(() => {
        if (isActive) setIsLoadingPatients(false);
      });

    return () => {
      isActive = false;
    };
    }, []),
  );

  const selectPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setPatientName(patient.name);
    setAge(getPatientAge(patient.dateOfBirth));
    setIsPatientPickerOpen(false);
    setValidationMessage("");
  };

  const submitAssessment = async () => {
    setValidationMessage("");

    if (!selectedPatient) {
      setValidationMessage("Select a registered patient before starting an assessment.");
      return;
    }

    const parsedAssessment = parseAssessment({
      patientName,
      age,
      temperature,
      bloodPressure,
      symptoms: symptomsText,
    });

    if (!parsedAssessment.success) {
      setValidationMessage(
        parsedAssessment.error.issues[0]?.message ??
          "Please check the assessment details."
      );
      return;
    }

    setIsSaving(true);
    const assessmentRequest = {
      ...parsedAssessment.data,
      id: `assessment-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const prediction = await createAssessment(assessmentRequest);
      void useSyncStore.getState().refresh();

      router.push({
        pathname: "/Results",
        params: {
          name: parsedAssessment.data.patientName,
          age: String(parsedAssessment.data.age),
          symptoms: parsedAssessment.data.symptoms,
          temperature: String(parsedAssessment.data.temperature),
          bloodPressure: parsedAssessment.data.bloodPressure,

          disease: prediction?.disease ?? "",

          confidence: prediction
            ? String(prediction.confidence)
            : "",

          recommendation:
            prediction?.recommendation ?? "",

          modelVersion:
            prediction?.modelVersion ?? "",

          status: prediction?.status ?? "",

          triage: prediction?.triage
            ? JSON.stringify(prediction.triage)
            : "",

          predictions: prediction
            ? JSON.stringify(prediction.predictions)
            : "[]",

          recognizedSymptoms: prediction
            ? JSON.stringify(prediction.recognizedSymptoms)
            : "[]",

          assessmentId: assessmentRequest.id,
          offline: "false",
        },
      });
    } catch (error) {
      if (isNetworkFailure(error)) {
        const triage = inferOfflineTriage(assessmentRequest);
        const offlineResult: AssessmentResult = {
          ...assessmentRequest,
          disease: "Triage assessment",
          confidence: 0,
          predictions: [],
          recognizedSymptoms: [],
          recommendation: triage.action,
          modelVersion: "rule-engine-offline",
          status: "offline_triage",
          triage,
          syncStatus: "pending_sync",
        };
        saveOfflineAssessment(assessmentRequest, offlineResult);
        router.push({
          pathname: "/Results",
          params: {
            name: assessmentRequest.patientName,
            age: String(assessmentRequest.age),
            symptoms: assessmentRequest.symptoms,
            temperature: String(assessmentRequest.temperature),
            bloodPressure: assessmentRequest.bloodPressure,
            disease: offlineResult.disease,
            confidence: "",
            recommendation: offlineResult.recommendation,
            modelVersion: offlineResult.modelVersion,
            status: offlineResult.status,
            predictions: "[]",
            recognizedSymptoms: "[]",
            triage: JSON.stringify(triage),
            assessmentId: assessmentRequest.id,
            offline: "true",
          },
        });
        return;
      }
      setValidationMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F4F8F9}`}>
      <ScrollView
        contentContainerStyle={tw`px-5 pb-8`}
        showsVerticalScrollIndicator={false}
      >
        {/* Navbar */}
        <Navbar variant="hero" />

        {/* Header */}
        <View style={tw`mt-4 overflow-hidden rounded-3xl bg-teal-800 p-5`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`h-10 w-10 items-center justify-center rounded-xl bg-teal-700`}>
              <Ionicons name="pulse-outline" size={23} color="#CCFBF1" />
            </View>
            <Text style={tw`text-xs font-bold tracking-widest text-teal-200`}>CLINICAL WORKSPACE</Text>
          </View>
          <Text style={tw`mt-5 text-3xl font-bold text-white`}>Assess a patient</Text>
          <Text style={tw`mt-2 text-sm leading-5 text-teal-100`}>Capture symptoms and vital signs for decision support.</Text>
        </View>

        {/* Patient Details */}
        <View
          style={tw`mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}
        >
          <View
            style={tw`mb-2 flex-row items-center justify-between`}
          >
            <View style={tw`flex-row items-center`}>
              <View style={tw`h-8 w-8 items-center justify-center rounded-lg bg-teal-50`}><Ionicons name="person-outline" size={17} color="#0F766E" /></View>
              <Text style={tw`ml-2 text-sm font-bold text-slate-800`}>Patient details</Text>
            </View>

            <Text
              style={tw`text-xs font-medium text-teal-700`}
            >
              Required
            </Text>
          </View>

          <View style={tw`flex-row gap-3`}>
            {/* Registered Patient */}
            <View style={tw`flex-1`}>
              <Text
                style={tw`mb-2 text-xs font-semibold text-slate-500`}
              >
                Registered patient
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select a registered patient"
                onPress={() => setIsPatientPickerOpen(true)}
                style={({ pressed }) => [
                  tw`flex-row items-center rounded-xl border border-slate-200 px-3 py-3`,
                  pressed && tw`opacity-70`,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={19}
                  color="#94A3B8"
                />

                <Text style={tw`ml-2 flex-1 text-sm ${selectedPatient ? "text-slate-900" : "text-slate-400"}`}>
                  {selectedPatient?.name ?? (isLoadingPatients ? "Loading patients..." : "Select patient")}
                </Text>
                <Ionicons name="chevron-down-outline" size={18} color="#64748B" />
              </Pressable>
            </View>

            {/* Age */}
            <View style={tw`w-24`}>
              <Text
                style={tw`mb-2 text-xs font-semibold text-slate-500`}
              >
                Age
              </Text>

              <View
                style={tw`flex-row items-center rounded-xl border border-slate-200 px-3`}
              >
                <TextInput
                  value={age}
                  onChangeText={(value) => {
                    setAge(value);
                    setValidationMessage("");
                  }}
                  placeholder="Years"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={tw`flex-1 py-3 text-sm text-slate-900`}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Symptoms */}
        <View
          style={tw`mb-3 mt-8 flex-row items-center justify-between`}
        >
          <View style={tw`flex-row items-center`}>
            <View style={tw`h-8 w-8 items-center justify-center rounded-lg bg-rose-50`}><Ionicons name="chatbubble-ellipses-outline" size={17} color="#E11D48" /></View>
            <Text style={tw`ml-2 text-lg font-bold text-slate-900`}>Reported symptoms</Text>
          </View>

          <Text
            style={tw`text-xs font-medium text-teal-700`}
          >
            Required
          </Text>
        </View>

        <View
          style={tw`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}
        >
          <TextInput
            value={symptomsText}
            onChangeText={(value) => {
              setSymptomsText(value);
              setValidationMessage("");
            }}
            multiline
            placeholder="Type symptoms, separated by commas"
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
            style={tw`min-h-32 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-900`}
          />
        </View>

        {/* Vital Signs */}
        <View style={tw`mb-3 mt-8 flex-row items-center`}>
          <View style={tw`h-8 w-8 items-center justify-center rounded-lg bg-amber-50`}><Ionicons name="heart-outline" size={17} color="#D97706" /></View>
          <Text style={tw`ml-2 text-lg font-bold text-slate-900`}>Vital signs</Text>
        </View>

        <View style={tw`flex-row gap-3`}>
          {/* Temperature */}
          <View
            style={tw`flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}
          >
            <Text
              style={tw`mb-2 text-sm font-bold text-slate-700`}
            >
              Temperature
            </Text>

            <View
              style={tw`flex-row items-center rounded-xl border border-slate-200 px-3`}
            >
              <Ionicons
                name="thermometer-outline"
                size={19}
                color="#E11D48"
              />

              <TextInput
                value={temperature}
                onChangeText={(value) => {
                  setTemperature(value);
                  setValidationMessage("");
                }}
                placeholder="36.8"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                style={tw`ml-2 flex-1 py-3 text-sm text-slate-900`}
              />

              <Text
                style={tw`text-xs font-bold text-slate-400`}
              >
                °C
              </Text>
            </View>
          </View>

          {/* Blood Pressure */}
          <View
            style={tw`flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}
          >
            <Text
              style={tw`mb-2 text-sm font-bold text-slate-700`}
            >
              Blood pressure
            </Text>

            <View
              style={tw`flex-row items-center rounded-xl border border-slate-200 px-3`}
            >
              <Ionicons
                name="heart-outline"
                size={19}
                color="#E11D48"
              />

              <TextInput
                value={bloodPressure}
                onChangeText={(value) => {
                  setBloodPressure(value);
                  setValidationMessage("");
                }}
                placeholder="120/80"
                placeholderTextColor="#94A3B8"
                keyboardType="numbers-and-punctuation"
                style={tw`ml-2 flex-1 py-3 text-sm text-slate-900`}
              />

              <Text
                style={tw`text-xs font-bold text-slate-400`}
              >
                mmHg
              </Text>
            </View>
          </View>
        </View>

        {/* Error Message */}
        <View style={tw`mt-6`}>
          {validationMessage ? (
            <View
              style={tw`mb-3 rounded-xl bg-rose-50 px-3 py-3`}
            >
              <Text
                style={tw`text-sm font-medium text-rose-700`}
              >
                {validationMessage}
              </Text>
            </View>
          ) : null}

          {/* Assess Button */}
          <Pressable
            disabled={isSaving}
            onPress={submitAssessment}
            style={({ pressed }) => [
              tw`items-center rounded-xl bg-teal-700 py-4 shadow-sm`,
              (pressed || isSaving) && tw`opacity-80`,
            ]}
          >
            <Text
              style={tw`font-bold text-white`}
            >
              {isSaving ? "Generating assessment..." : "Generate assessment"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isPatientPickerOpen}
        onRequestClose={() => setIsPatientPickerOpen(false)}
      >
        <Pressable style={tw`flex-1 justify-end bg-slate-900/30`} onPress={() => setIsPatientPickerOpen(false)}>
          <Pressable style={tw`max-h-[70%] rounded-t-3xl bg-white px-5 pb-8 pt-5`} onPress={(event) => event.stopPropagation()}>
            <View style={tw`mb-4 flex-row items-center justify-between`}>
              <View>
                <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>PATIENT SELECTION</Text>
                <Text style={tw`mt-1 text-xl font-bold text-slate-900`}>Choose a registered patient</Text>
              </View>
              <Pressable accessibilityLabel="Close patient selection" onPress={() => setIsPatientPickerOpen(false)} style={tw`h-9 w-9 items-center justify-center rounded-full bg-slate-100`}>
                <Ionicons name="close-outline" size={22} color="#475569" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {patients.map((patient) => (
                <Pressable
                  key={patient.id}
                  onPress={() => selectPatient(patient)}
                  style={({ pressed }) => [tw`mb-2 flex-row items-center rounded-xl border border-slate-200 px-4 py-4`, pressed && tw`bg-teal-50`]}
                >
                  <View style={tw`h-10 w-10 items-center justify-center rounded-full bg-teal-50`}>
                    <Ionicons name="person-outline" size={20} color="#0F766E" />
                  </View>
                  <View style={tw`ml-3 flex-1`}>
                    <Text style={tw`font-bold text-slate-900`}>{patient.name}</Text>
                    <Text style={tw`mt-1 text-xs text-slate-500`}>DOB: {patient.dateOfBirth}</Text>
                  </View>
                  {selectedPatient?.id === patient.id ? <Ionicons name="checkmark-circle" size={22} color="#0F766E" /> : null}
                </Pressable>
              ))}
              {patients.length === 0 ? (
                <View style={tw`items-center rounded-xl bg-slate-50 px-4 py-8`}>
                  <Text style={tw`text-center text-sm text-slate-500`}>No registered patients found.</Text>
                  <Pressable onPress={() => { setIsPatientPickerOpen(false); router.push("/RegisteredPatients"); }} style={tw`mt-4 rounded-xl bg-teal-700 px-4 py-3`}>
                    <Text style={tw`font-bold text-white`}>Register a patient</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function getPatientAge(dateOfBirth: string): string {
  const parts = dateOfBirth.split(/[\s/-]+/).map(Number);
  const date = parts.length === 3
    ? new Date(parts[2], parts[1] - 1, parts[0])
    : new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const birthdayHasNotPassed = today.getMonth() < date.getMonth()
    || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
  if (birthdayHasNotPassed) age -= 1;
  return String(Math.max(0, age));
}

function isNetworkFailure(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "response" in error && !(error as { response?: unknown }).response);
}