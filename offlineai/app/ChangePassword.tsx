import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput } from "react-native";
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
    <SafeAreaView style={tw`flex-1 bg-[#F3F7F5]`}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={tw`flex-1`} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={tw`px-5 pb-8`}>
        <Navbar variant="hero" />
        <Pressable onPress={() => router.replace("/Home")} style={tw`mb-8 mt-3`}>
          <Text style={tw`font-bold text-teal-700`}>Back</Text>
        </Pressable>
        <Text style={tw`text-[10px] font-bold tracking-[1.7px] text-teal-700`}>ACCOUNT SECURITY</Text>
        <Text style={tw`mt-1 text-2xl font-bold text-[#143B4F]`}>Reset password</Text>
        <TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor="#94A3A0" secureTextEntry style={tw`mt-6 rounded-2xl border border-[#E1ECE7] bg-white px-4 py-4`} />
        <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="New password" placeholderTextColor="#94A3A0" secureTextEntry style={tw`mt-3 rounded-2xl border border-[#E1ECE7] bg-white px-4 py-4`} />
        {message ? <Text style={tw`mt-4 text-sm text-amber-700`}>{message}</Text> : null}
        <Pressable onPress={submit} style={tw`mt-6 items-center rounded-2xl bg-[#087C70] px-4 py-4`}>
          <Text style={tw`font-bold text-white`}>Update password</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
