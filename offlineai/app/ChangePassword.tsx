import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import { changePassword, getApiErrorMessage } from "../services/api";

export default function ChangePassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    setMessage("");
    if (currentPassword.length < 8 || newPassword.length < 8) {
      setMessage("Passwords must be at least 8 characters.");
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed successfully.");
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={tw`px-5 pb-8`}>
        <Navbar variant="hero" />
        <Pressable onPress={() => router.replace("/Home")} style={tw`mb-8 mt-3`}>
          <Text style={tw`font-bold text-teal-700`}>Back</Text>
        </Pressable>
        <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>ACCOUNT SECURITY</Text>
        <Text style={tw`mt-2 text-3xl font-bold text-slate-900`}>Reset password</Text>
        <TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry style={tw`mt-8 rounded-xl bg-white px-4 py-4`} />
        <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="New password" secureTextEntry style={tw`mt-3 rounded-xl bg-white px-4 py-4`} />
        {message ? <Text style={tw`mt-4 text-sm text-amber-700`}>{message}</Text> : null}
        <Pressable onPress={submit} style={tw`mt-6 items-center rounded-xl bg-teal-700 px-4 py-4`}>
          <Text style={tw`font-bold text-white`}>Update password</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
