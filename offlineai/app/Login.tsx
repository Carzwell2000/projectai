import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import tw from "twrnc";
import { getApiErrorMessage, requestPasswordReset, resetPassword } from "../services/api";
import { useAuthStore } from "../stores/authStore";

export default function Login() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [hasRequestedCode, setHasRequestedCode] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setMessage("");
    if (!email.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (isForgotPassword && hasRequestedCode && (resetCode.trim().length < 1 || password.length < 8)) {
      setMessage("Enter the reset code and a new password of at least 8 characters.");
      return;
    }
    if (!isForgotPassword && password.length < 8) {
      setMessage("Enter a password of at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (isForgotPassword) {
        if (!hasRequestedCode) {
          await requestPasswordReset(email);
          setHasRequestedCode(true);
          setMessage("A reset code was sent to your email.");
        } else {
          await resetPassword(email, resetCode, password);
          setIsForgotPassword(false);
          setHasRequestedCode(false);
          setResetCode("");
          setPassword("");
          setMessage("Password reset. You can now sign in.");
        }
      } else {
        await login({ email, password });
        router.replace("/Home");
      }
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <View style={tw`flex-1 justify-center px-6`}>
        <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>CLINICAL WORKSPACE</Text>
        <Text style={tw`mt-3 text-4xl font-bold text-slate-900`}>{isForgotPassword ? "Forgot password" : "Welcome back"}</Text>
        <Text style={tw`mt-3 text-base leading-6 text-slate-500`}>{isForgotPassword ? "Request a code by email, then use it to choose a new password." : "Sign in with an administrator-created account."}</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" style={tw`mt-8 rounded-xl bg-white px-4 py-4 text-slate-900`} />
        {isForgotPassword && hasRequestedCode ? <TextInput value={resetCode} onChangeText={setResetCode} placeholder="Email reset code" style={tw`mt-3 rounded-xl bg-white px-4 py-4 text-slate-900`} /> : null}
        {(!isForgotPassword || hasRequestedCode) ? <TextInput value={password} onChangeText={setPassword} placeholder={isForgotPassword ? "New password" : "Password"} secureTextEntry style={tw`mt-3 rounded-xl bg-white px-4 py-4 text-slate-900`} /> : null}
        {message ? <Text style={tw`mt-4 text-sm leading-5 text-amber-700`}>{message}</Text> : null}
        <Pressable disabled={isSubmitting} onPress={submit} style={({ pressed }) => [tw`mt-6 items-center rounded-xl bg-teal-700 px-4 py-4`, pressed && tw`opacity-80`]}>
          <Text style={tw`font-bold text-white`}>{isSubmitting ? "Please wait..." : isForgotPassword ? (hasRequestedCode ? "Reset password" : "Send reset code") : "Sign in"}</Text>
        </Pressable>
        <Pressable onPress={() => { setIsForgotPassword(!isForgotPassword); setMessage(""); }} style={tw`mt-5 items-center py-3`}>
          <Text style={tw`font-semibold text-teal-700`}>{isForgotPassword ? "Back to sign in" : "Forgot password?"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
