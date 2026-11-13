import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import RegisterPatient, { type NewPatient } from "../Components/RegisterPatient";
import { createPatient, getApiErrorMessage, updatePatient, type PatientRecord } from "../services/api";
import { listPatients } from "../services/api";
import { useSyncStore } from "../stores/syncStore";

export default function RegisteredPatients() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const pendingPatients = useSyncStore((state) => state.pendingPatients);
  const pending = useSyncStore((state) => state.pending);
  const visiblePatients = useMemo(
    () => patients.filter((patient) =>
      `${patient.name} ${patient.phone} ${patient.email}`.toLowerCase().includes(search.trim().toLowerCase())),
    [patients, search],
  );

  const refreshPatients = useCallback(() => {
    setIsLoading(true);
    listPatients().then((records) => {
      setPatients(records);
      setLoadError("");
    }).catch((error) => {
      setLoadError(getApiErrorMessage(error));
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const load = async () => {
        setIsLoading(true);
        try {
          const records = await listPatients();
          if (!isActive) return;
          setPatients(records);
          setLoadError("");
        } catch (error) {
          if (!isActive) return;
          setLoadError(getApiErrorMessage(error));
        } finally {
          if (isActive) setIsLoading(false);
        }
      };
      void load();
      return () => { isActive = false; };
    }, []),
  );

  useEffect(() => {
    void refreshPatients();
  }, [pendingPatients, pending, refreshPatients]);

  const savePatient = async (patient: NewPatient) => {
    const saved = editingPatient ? await updatePatient(patient) : await createPatient(patient);
    void useSyncStore.getState().refresh();
    setPatients((current) => editingPatient
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...current]);
    setLoadError("");
    setIsRegistering(false);
    setEditingPatient(null);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F3F7F5]`}>
      <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <View style={tw`flex-row items-center justify-between gap-3 pt-5`}>
          <Text style={tw`flex-1 text-[27px] font-semibold text-[#18312C]`}>Registered Patients</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Register patient"
            onPress={() => { setEditingPatient(null); setIsRegistering(true); }}
            style={({ pressed }) => [tw`h-11 flex-row items-center rounded-xl bg-[#167663] px-3`, pressed && tw`opacity-80`]}
          >
            <Ionicons name="add" size={19} color="white" />
            <Text style={tw`ml-1 text-xs font-bold text-white`}>Register</Text>
          </Pressable>
        </View>

        <View style={tw`mt-5 overflow-hidden rounded-[15px] border border-[#E2EBE6] bg-white shadow-sm`}>
          <View style={tw`border-b border-[#EDF0EB] px-4 py-4`}>
            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-sm font-bold text-[#203B34]`}>Patient list</Text>
              <Text style={tw`ml-2 text-[10px] text-[#8C9790]`}>
                {patients.length} {patients.length === 1 ? "record" : "records"}
              </Text>
            </View>
            <View style={tw`mt-3 h-10 flex-row items-center rounded-xl border border-[#DCE8E2] bg-[#FBFDFC] px-3`}>
              <Ionicons name="search-outline" size={16} color="#87938B" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search name or contact"
                placeholderTextColor="#A0AAA3"
                accessibilityLabel="Search patients"
                style={tw`ml-2 flex-1 py-2 text-xs text-[#203B34]`}
              />
              {search ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear patient search" onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={17} color="#87938B" />
                </Pressable>
              ) : null}
            </View>
          </View>
          {loadError ? (
            <View style={tw`border-b border-rose-100 bg-rose-50 px-4 py-3`}>
              <Text accessibilityRole="alert" style={tw`text-xs leading-5 text-rose-700`}>{loadError}</Text>
            </View>
          ) : null}
          {visiblePatients.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={tw`h-11 flex-row items-center bg-[#F3F8F5]`}>
                  <PatientTableCell width={190} header>Patient</PatientTableCell>
                  <PatientTableCell width={135} header>Phone</PatientTableCell>
                  <PatientTableCell width={205} header>Email</PatientTableCell>
                  <PatientTableCell width={155} header>Date of birth / gender</PatientTableCell>
                  <PatientTableCell width={125} header>Added</PatientTableCell>
                  <PatientTableCell width={95} header>Status</PatientTableCell>
                  <PatientTableCell width={76} header>Action</PatientTableCell>
                </View>
                {visiblePatients.map((patient) => (
                  <View key={patient.id} style={tw`h-[62px] flex-row items-center border-t border-[#EDF2EF]`}>
                    <View style={tw`w-[190px] flex-row items-center px-3`}>
                      <View style={tw`h-8 w-8 items-center justify-center rounded-full bg-[#E8F3ED]`}>
                        <Text style={tw`text-xs font-bold uppercase text-[#416B5A]`}>{patient.name.slice(0, 1) || "P"}</Text>
                      </View>
                      <Text style={tw`ml-2 flex-1 text-xs font-bold text-[#31463C]`} numberOfLines={1}>{patient.name}</Text>
                    </View>
                    <PatientTableCell width={135}>{patient.phone || "—"}</PatientTableCell>
                    <PatientTableCell width={205}>{patient.email || "—"}</PatientTableCell>
                    <PatientTableCell width={155}>
                      {patient.dateOfBirth || "—"} · {(patient.gender || "not specified").replaceAll("_", " ")}
                    </PatientTableCell>
                    <PatientTableCell width={125}>{formatAddedDate(patient.createdAt)}</PatientTableCell>
                    <View style={tw`w-[95px] px-2`}>
                      <SyncBadge isSynced={patient.syncStatus === "synced"} />
                    </View>
                    <View style={tw`w-[76px] items-center`}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${patient.name}`}
                        onPress={() => { setEditingPatient(patient); setIsRegistering(true); }}
                        style={({ pressed }) => [tw`h-9 w-9 items-center justify-center rounded-lg border border-[#E2EBE6] bg-white`, pressed && tw`bg-[#F8FBF9]`]}
                      >
                        <Ionicons name="create-outline" size={17} color="#167663" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={tw`min-h-[230px] items-center justify-center px-6 py-8`}>
              <View style={tw`h-12 w-12 items-center justify-center rounded-full bg-[#E8F3ED]`}>
                <Ionicons name={isLoading ? "hourglass-outline" : "people-outline"} size={22} color="#167663" />
              </View>
              <Text style={tw`mt-3 text-xs font-bold text-[#405048]`}>
                {isLoading ? "Loading patient records..." : loadError ? "Unable to load patient records" : search ? "No matching patients" : "Your directory is ready"}
              </Text>
              <Text style={tw`mt-1 text-center text-[10px] leading-4 text-[#8A958E]`}>
                {loadError ? "Try again when your clinic connection is available." : search ? "Try another name or contact detail." : "Register a patient to start building your local directory."}
              </Text>
              {!isLoading && loadError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={refreshPatients}
                  style={({ pressed }) => [tw`mt-4 h-10 flex-row items-center rounded-xl bg-[#E8EEE7] px-3`, pressed && tw`opacity-75`]}
                >
                  <Ionicons name="refresh-outline" size={16} color="#4E6659" />
                  <Text style={tw`ml-1 text-xs font-bold text-[#4E6659]`}>Try again</Text>
                </Pressable>
              ) : null}
              {!isLoading && !search && !loadError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { setEditingPatient(null); setIsRegistering(true); }}
                  style={({ pressed }) => [tw`mt-4 h-10 flex-row items-center rounded-xl bg-[#E8EEE7] px-3`, pressed && tw`opacity-75`]}
                >
                  <Ionicons name="add" size={17} color="#4E6659" />
                  <Text style={tw`ml-1 text-xs font-bold text-[#4E6659]`}>Register first patient</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
      <Modal animationType="slide" transparent visible={isRegistering} onRequestClose={() => { setIsRegistering(false); setEditingPatient(null); }}>
        <KeyboardAvoidingView style={tw`flex-1 justify-end bg-slate-900/30`} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {isRegistering ? (
            <RegisterPatient
              key={editingPatient?.id ?? "new-patient"}
              initialPatient={editingPatient ?? undefined}
              onCancel={() => { setIsRegistering(false); setEditingPatient(null); }}
              onSave={savePatient}
            />
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SyncBadge({ isSynced }: { isSynced: boolean }) {
  return (
    <View style={tw`rounded-full ${isSynced ? "bg-[#E5F1E7]" : "bg-[#F8F0DF]"} px-2 py-1`}>
      <Text style={tw`text-[9px] font-bold ${isSynced ? "text-[#44765C]" : "text-[#8B6841]"}`}>
        {isSynced ? "Synced" : "Local"}
      </Text>
    </View>
  );
}

function PatientTableCell({ width, header, children }: { width: number; header?: boolean; children: ReactNode }) {
  return (
    <Text
      numberOfLines={1}
      style={[
        tw`${header ? "text-[10px] font-bold uppercase tracking-wide text-[#718078]" : "text-[11px] text-[#405048]"} px-3`,
        { width },
      ]}
    >
      {children}
    </Text>
  );
}

function formatAddedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Added date unavailable" : `Added ${date.toLocaleDateString()}`;
}
