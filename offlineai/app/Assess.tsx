import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

import Navbar from "../Components/Navbar";
import { createAssessment, parseAssessment } from "../services/api";

export default function Assess() {
  const router = useRouter();

  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [temperature, setTemperature] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [symptomsText, setSymptomsText] = useState("");

  const [validationMessage, setValidationMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submitAssessment = async () => {
    setValidationMessage("");

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

    try {
      const assessmentRequest = {
        ...parsedAssessment.data,
        id: `assessment-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      const prediction = await createAssessment(assessmentRequest);

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

          predictions: prediction
            ? JSON.stringify(prediction.predictions)
            : "[]",

          assessmentId: assessmentRequest.id,
          offline: "false",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "FastAPI is unavailable.";

      setValidationMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ScrollView
        contentContainerStyle={tw`px-5 pb-8`}
        showsVerticalScrollIndicator={false}
      >
        {/* Navbar */}
        <Navbar variant="hero" />

        {/* Header */}
        <View style={tw`pt-3`}>
          <Text
            style={tw`text-xs font-bold tracking-widest text-teal-700`}
          >
            CLINICAL WORKSPACE
          </Text>

          <Text
            style={tw`mt-2 text-3xl font-bold text-slate-900`}
          >
            Assess a patient
          </Text>

          <Text
            style={tw`mt-2 text-sm leading-5 text-slate-500`}
          >
            Capture key information to generate decision support.
          </Text>
        </View>

        {/* Patient Details */}
        <View
          style={tw`mt-7 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm`}
        >
          <View
            style={tw`mb-2 flex-row items-center justify-between`}
          >
            <Text
              style={tw`text-sm font-bold text-slate-700`}
            >
              Patient details
            </Text>

            <Text
              style={tw`text-xs font-medium text-teal-700`}
            >
              Required
            </Text>
          </View>

          <View style={tw`flex-row gap-3`}>
            {/* Patient Name */}
            <View style={tw`flex-1`}>
              <Text
                style={tw`mb-2 text-xs font-semibold text-slate-500`}
              >
                Patient name
              </Text>

              <View
                style={tw`flex-row items-center rounded-xl border border-slate-200 px-3`}
              >
                <Ionicons
                  name="person-outline"
                  size={19}
                  color="#94A3B8"
                />

                <TextInput
                  value={patientName}
                  onChangeText={(value) => {
                    setPatientName(value);
                    setValidationMessage("");
                  }}
                  placeholder="Full name"
                  placeholderTextColor="#94A3B8"
                  style={tw`ml-2 flex-1 py-3 text-sm text-slate-900`}
                />
              </View>
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
          <Text
            style={tw`text-lg font-bold text-slate-900`}
          >
            Reported symptoms
          </Text>

          <Text
            style={tw`text-xs font-medium text-teal-700`}
          >
            Required
          </Text>
        </View>

        <View
          style={tw`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm`}
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
            style={tw`min-h-28 rounded-xl border border-slate-200 px-4 py-3 text-sm leading-5 text-slate-900`}
          />
        </View>

        {/* Vital Signs */}
        <Text
          style={tw`mb-3 mt-8 text-lg font-bold text-slate-900`}
        >
          Vital signs
        </Text>

        <View style={tw`flex-row gap-3`}>
          {/* Temperature */}
          <View
            style={tw`flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm`}
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
            style={tw`flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm`}
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
              tw`items-center rounded-xl bg-teal-700 py-4`,
              (pressed || isSaving) && tw`opacity-80`,
            ]}
          >
            <Text
              style={tw`font-bold text-white`}
            >
              {isSaving ? "Assessing..." : "Assess"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}