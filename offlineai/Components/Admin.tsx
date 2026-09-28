import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { changePassword, createNurse, deleteNurse, getApiErrorMessage, listNurses, type RegisteredNurse } from "../services/api";
import { useAuthStore } from "../stores/authStore";
import { useSyncStore } from "../stores/syncStore";

type AdminPage = "create" | "registered" | "password";

export default function Admin() {
  const logout = useAuthStore((state) => state.logout);
  const [activePage, setActivePage] = useState<AdminPage>("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [nurses, setNurses] = useState<RegisteredNurse[]>([]);

  const loadAdminData = useCallback(async () => {
    try {
      const registeredNurses = await listNurses();
      setNurses(registeredNurses);
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    void loadAdminData();
    void useSyncStore.getState().refresh();
  }, [loadAdminData]);

  useEffect(() => useSyncStore.getState().startMonitoring(), []);

  const submit = async () => {
    setMessage("");
    if (name.trim().length < 2 || !email.includes("@") || password.length < 8) {
      setMessage("Enter a name, valid email, and password of at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createNurse({ name, email, password });
      setName("");
      setEmail("");
      setPassword("");
      setMessage("Nurse account created successfully.");
      await useSyncStore.getState().refresh();
      await loadAdminData();
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAdminPassword = async () => {
    setMessage("");
    if (currentPassword.length < 8 || newPassword.length < 8) {
      setMessage("Passwords must be at least 8 characters.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Administrator password changed successfully.");
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const pageTitle = activePage === "create" ? "Create nurse" : activePage === "registered" ? "Nurse directory" : "Change password";
  const pageDescription = activePage === "create"
    ? "Add a trusted member to the clinical workspace."
    : activePage === "registered"
      ? "Review and manage every nurse account."
      : "Keep administrator access secure with a new password.";

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F5F8F8]`}>
      <KeyboardAvoidingView style={tw`flex-1`} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={tw`pb-8`}>
        <View style={tw`bg-[#0F766E] px-6 pb-7 pt-5`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center`}>
              <View style={tw`h-11 w-11 items-center justify-center rounded-2xl bg-white/15`}>
                <Ionicons name="shield-checkmark-outline" size={23} color="white" />
              </View>
              <View style={tw`ml-3`}>
                <Text style={tw`text-[10px] font-bold uppercase tracking-widest text-teal-100`}>Administration</Text>
                <Text style={tw`mt-1 text-xl font-bold text-white`}>Control centre</Text>
              </View>
            </View>
            <View style={tw`rounded-full bg-emerald-300/20 px-3 py-2`}>
              <Text style={tw`text-[10px] font-bold uppercase tracking-widest text-emerald-100`}>Admin</Text>
            </View>
          </View>
          <View style={tw`mt-7 flex-row items-end justify-between`}>
            <View>
              <Text style={tw`text-3xl font-bold text-white`}>{pageTitle}</Text>
              <Text style={tw`mt-2 text-sm leading-5 text-teal-100`}>{pageDescription}</Text>
            </View>
            <View style={tw`items-center rounded-2xl bg-white/15 px-3 py-2`}>
              <Text style={tw`text-lg font-bold text-white`}>{nurses.length}</Text>
              <Text style={tw`text-[9px] font-bold uppercase tracking-wide text-teal-100`}>Nurses</Text>
            </View>
          </View>
        </View>
        <View style={tw`mx-5 mt-5 flex-row rounded-2xl border border-slate-200 bg-white p-1 shadow-sm`}>
          {([
            ["create", "Create nurse", "person-add-outline"],
            ["registered", "Registered nurses", "people-outline"],
            ["password", "Change password", "key-outline"],
          ] as const).map(([page, label, icon]) => (
            <Pressable key={page} onPress={() => setActivePage(page)} style={({ pressed }) => [tw`flex-1 items-center rounded-xl px-1 py-3`, activePage === page && tw`bg-teal-700`, pressed && tw`opacity-70`]}>
              <Ionicons name={icon} size={19} color={activePage === page ? "#FFFFFF" : "#0F766E"} />
              <Text numberOfLines={1} style={tw`mt-1 text-center text-[10px] font-bold ${activePage === page ? "text-white" : "text-slate-600"}`}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {activePage === "create" ? (
          <View style={tw`mx-5 mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`}>
            <View style={tw`h-1 w-12 rounded-full bg-teal-600`} />
            <Text style={tw`mt-4 text-xs font-bold uppercase tracking-widest text-teal-700`}>Team access</Text>
            <Text style={tw`mt-3 text-xl font-bold text-slate-900`}>Create a nurse account</Text>
            <Text style={tw`mt-1 text-sm leading-5 text-slate-500`}>Create an account for a nurse joining the clinical workspace.</Text>
            <Text style={tw`mt-5 text-xs font-bold text-slate-600`}>FULL NAME</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Nurse full name" placeholderTextColor="#94A3B8" autoCapitalize="words" style={tw`mt-2 rounded-xl border border-slate-200 bg-[#F5F8F8] px-4 py-4 text-slate-900`} />
            <Text style={tw`mt-4 text-xs font-bold text-slate-600`}>EMAIL ADDRESS</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="Nurse email address" placeholderTextColor="#94A3B8" autoCapitalize="none" keyboardType="email-address" style={tw`mt-2 rounded-xl border border-slate-200 bg-[#F5F8F8] px-4 py-4 text-slate-900`} />
            <Text style={tw`mt-4 text-xs font-bold text-slate-600`}>TEMPORARY PASSWORD</Text>
            <TextInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#94A3B8" secureTextEntry style={tw`mt-2 rounded-xl border border-slate-200 bg-[#F5F8F8] px-4 py-4 text-slate-900`} />
            <Pressable disabled={isSubmitting} onPress={submit} style={({ pressed }) => [tw`mt-4 items-center rounded-xl bg-slate-900 px-4 py-4`, (pressed || isSubmitting) && tw`opacity-70`]}>
              <Text style={tw`font-bold text-white`}>{isSubmitting ? "Creating..." : "Create nurse account"}</Text>
            </Pressable>
          </View>
        ) : null}
        {activePage === "password" ? (
          <View style={tw`mx-5 mt-5 rounded-3xl border border-teal-100 bg-[#E6F4F2] p-5`}>
            <View style={tw`h-1 w-12 rounded-full bg-teal-600`} />
            <Text style={tw`mt-4 text-xs font-bold uppercase tracking-widest text-teal-700`}>Account security</Text>
            <Text style={tw`mt-3 text-xl font-bold text-slate-900`}>Change administrator password</Text>
            <Text style={tw`mt-1 text-sm leading-5 text-slate-600`}>Use your current password to set a new one.</Text>
            <Text style={tw`mt-5 text-xs font-bold text-slate-600`}>CURRENT PASSWORD</Text>
            <TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor="#94A3B8" secureTextEntry style={tw`mt-2 rounded-xl border border-white bg-white px-4 py-4 text-slate-900`} />
            <Text style={tw`mt-4 text-xs font-bold text-slate-600`}>NEW PASSWORD</Text>
            <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" placeholderTextColor="#94A3B8" secureTextEntry style={tw`mt-2 rounded-xl border border-white bg-white px-4 py-4 text-slate-900`} />
            <Pressable disabled={isChangingPassword} onPress={updateAdminPassword} style={({ pressed }) => [tw`mt-3 items-center rounded-xl bg-teal-700 px-4 py-4`, (pressed || isChangingPassword) && tw`opacity-60`]}>
              <Text style={tw`font-bold text-white`}>{isChangingPassword ? "Updating..." : "Update administrator password"}</Text>
            </Pressable>
          </View>
        ) : null}
        {activePage === "registered" ? (
          <View style={tw`mx-5 mt-5`}>
            <View style={tw`flex-row items-end justify-between`}>
              <View>
                <Text style={tw`text-xs font-bold uppercase tracking-widest text-slate-400`}>Directory</Text>
                <Text style={tw`mt-1 text-xl font-bold text-slate-900`}>Registered nurses</Text>
              </View>
              <View style={tw`rounded-full bg-teal-100 px-3 py-2`}>
                <Text style={tw`text-xs font-bold text-slate-600`}>{nurses.length}</Text>
              </View>
            </View>
            {nurses.length === 0 ? <Text style={tw`mt-3 text-sm text-slate-500`}>No nurse accounts registered yet.</Text> : null}
            {nurses.map((nurse) => (
              <View key={nurse.id} style={tw`mt-3 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}>
                <View style={tw`h-10 w-10 items-center justify-center rounded-xl bg-teal-50`}>
                  <Ionicons name="person-outline" size={20} color="#0F766E" />
                </View>
                <View style={tw`ml-3 flex-1`}>
                  <Text style={tw`font-bold text-slate-900`}>{nurse.name}</Text>
                  <Text style={tw`mt-1 text-xs text-slate-500`}>{nurse.email}</Text>
                </View>
                <Pressable
                  onPress={() => Alert.alert("Delete nurse", `Delete ${nurse.name}'s account?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: async () => {
                      try {
                        await deleteNurse(nurse.id);
                        await loadAdminData();
                      } catch (error) {
                        setMessage(getApiErrorMessage(error));
                      }
                    } },
                  ])}
                  style={tw`h-9 w-9 items-center justify-center rounded-xl bg-rose-50`}
                >
                  <Ionicons name="trash-outline" size={17} color="#BE123C" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {message ? <View style={tw`mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3`}><Text style={tw`text-sm leading-5 text-amber-800`}>{message}</Text></View> : null}
        <Pressable onPress={logout} style={({ pressed }) => [tw`mx-5 mt-6 flex-row items-center justify-center rounded-xl border border-slate-200 bg-white py-3`, pressed && tw`opacity-70`]}>
          <Ionicons name="log-out-outline" size={18} color="#0F766E" />
          <Text style={tw`ml-2 font-semibold text-teal-700`}>Sign out</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
