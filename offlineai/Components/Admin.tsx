import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { createNurse, deleteNurse, getApiErrorMessage, listNurses, type RegisteredNurse } from "../services/api";
import { useAuthStore } from "../stores/authStore";
import { useSyncStore } from "../stores/syncStore";

export default function Admin() {
  const logout = useAuthStore((state) => state.logout);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ScrollView contentContainerStyle={tw`px-6 py-8`}>
        <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>ADMINISTRATION</Text>
        <Text style={tw`mt-3 text-4xl font-bold text-slate-900`}>Register a nurse</Text>
        <Text style={tw`mt-3 text-base leading-6 text-slate-500`}>Create accounts for nurses who need access to the clinical workspace.</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Nurse full name" autoCapitalize="words" style={tw`mt-8 rounded-xl bg-white px-4 py-4 text-slate-900`} />
        <TextInput value={email} onChangeText={setEmail} placeholder="Nurse email address" autoCapitalize="none" keyboardType="email-address" style={tw`mt-3 rounded-xl bg-white px-4 py-4 text-slate-900`} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Temporary password" secureTextEntry style={tw`mt-3 rounded-xl bg-white px-4 py-4 text-slate-900`} />
        {message ? <Text style={tw`mt-4 text-sm leading-5 text-amber-700`}>{message}</Text> : null}
        <Pressable disabled={isSubmitting} onPress={submit} style={({ pressed }) => [tw`mt-6 items-center rounded-xl bg-teal-700 px-4 py-4`, pressed && tw`opacity-80`]}>
          <Text style={tw`font-bold text-white`}>{isSubmitting ? "Creating..." : "Create nurse account"}</Text>
        </Pressable>
        <Text style={tw`mt-10 text-xl font-bold text-slate-900`}>Registered nurses</Text>
        {nurses.length === 0 ? <Text style={tw`mt-3 text-sm text-slate-500`}>No nurse accounts registered yet.</Text> : null}
        {nurses.map((nurse) => (
          <View key={nurse.id} style={tw`mt-3 flex-row items-center rounded-xl bg-white p-4`}>
            <View style={tw`flex-1`}>
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
              style={tw`rounded-lg bg-rose-50 px-3 py-2`}
            >
              <Text style={tw`text-xs font-bold text-rose-700`}>Delete</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={logout} style={tw`mt-5 items-center py-3`}>
          <Text style={tw`font-semibold text-teal-700`}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
