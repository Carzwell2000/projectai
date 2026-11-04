import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { AccessibilityInfo, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import tw from "twrnc";
import PortalIllustration from "../Components/PortalIllustration";
import { getApiErrorMessage, requestPasswordReset, resetPassword } from "../services/api";
import { useAuthStore } from "../stores/authStore";

type PortalRole = "primary_healthcare" | "nurse" | "admin";

const PORTALS: {
  role: PortalRole;
  title: string;
  description: string;
  button: string;
}[] = [
  {
    role: "primary_healthcare",
    title: "Primary Healthcare",
    description: "Access patient assessments and supported results.",
    button: "Enter Primary Healthcare Portal",
  },
  {
    role: "nurse",
    title: "Nursing Staff",
    description: "Manage patient care, assessments, and records.",
    button: "Enter Nursing Portal",
  },
  {
    role: "admin",
    title: "Administrator",
    description: "Manage staff accounts and system activity.",
    button: "Enter Admin Portal",
  },
];

export default function Login() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [hasExplored, setHasExplored] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<PortalRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [hasRequestedCode, setHasRequestedCode] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPortalAccessError = message.startsWith("This account does not have access");
  const headlineAnimations = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    let isActive = true;
    const animation = Animated.stagger(
      140,
      headlineAnimations.map((value) => Animated.timing(value, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })),
    );
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!isActive) return;
      if (reduceMotion) {
        headlineAnimations.forEach((value) => value.setValue(1));
      } else {
        animation.start();
      }
    });
    return () => {
      isActive = false;
      animation.stop();
    };
  }, [headlineAnimations]);

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
        if (!selectedPortal) return;
        await login({ email, password }, selectedPortal);
        router.replace("/Home");
      }
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f5f8f6]`}>
      <KeyboardAvoidingView style={tw`flex-1`} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={tw`flex-1`}
          contentContainerStyle={hasExplored ? tw`pb-8` : tw`flex-grow`}
        >
          {!hasExplored ? (
            <View style={tw`relative flex-1 justify-between px-5 py-6`}>
              <Image
                source={require("../assets/images/doctor.jpg")}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="center"
                transition={250}
                accessibilityLabel="Black doctor speaking with a child in a clinic"
              />
              <LinearGradient
                colors={["rgba(7,27,29,0.48)", "rgba(7,27,29,0.04)", "rgba(7,27,29,0.2)", "rgba(7,27,29,0.84)"]}
                locations={[0, 0.3, 0.52, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={tw`self-start flex-row items-center rounded-full border border-white/30 bg-[#092320]/60 py-2 pl-2 pr-4`}>
                <View style={tw`h-9 w-9 items-center justify-center rounded-full bg-[#D8F1E6]`}>
                  <Ionicons name="pulse" size={19} color="#14594B" />
                </View>
                <Text style={tw`ml-2 text-[10px] font-bold tracking-widest text-white`}>CLINICAL WORKSPACE</Text>
              </View>
              <View style={tw`mb-5 mt-auto`}>
                <Text style={tw`mb-3 text-[10px] font-bold tracking-widest text-emerald-100`}>
                  SMARTER SUPPORT. HUMAN JUDGMENT.
                </Text>
                <Text
                  accessibilityRole="header"
                  accessibilityLabel="AI-assisted clinical care."
                  style={tw`text-5xl font-bold leading-[52px] tracking-tight text-white`}
                >
                  <Animated.Text style={getHeadlineWordStyle(headlineAnimations[0])}>AI-assisted</Animated.Text>
                  {"\n"}
                  <Animated.Text style={getHeadlineWordStyle(headlineAnimations[1])}>clinical</Animated.Text>
                  {" "}
                  <Animated.Text style={getHeadlineWordStyle(headlineAnimations[2])}>care.</Animated.Text>
                </Text>
                <Text style={tw`mt-4 max-w-[360px] text-sm leading-6 text-white`}>
                  Decision support for healthcare teams, always guided by clinicians.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setHasExplored(true)}
                style={({ pressed }) => [
                  tw`h-14 flex-row items-center justify-between rounded-2xl border border-white/30 bg-[#167663] px-5`,
                  pressed && tw`opacity-80`,
                ]}
              >
                <Text style={tw`text-sm font-bold text-white`}>Continue to sign in</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={tw`ml-2`} />
              </Pressable>
            </View>
          ) : !selectedPortal ? (
            <View style={tw`flex-1 bg-[#F5F8F6] px-5 pb-8 pt-7`}>
              <View style={tw`flex-row items-center rounded-2xl border border-[#E1ECE6] bg-[#F0F8F3] p-3`}>
                <View style={tw`h-11 w-11 items-center justify-center rounded-xl border border-[#CFE3D8] bg-white`}>
                  <Ionicons name="pulse" size={21} color="#167663" />
                </View>
                <Text style={tw`ml-3 text-[10px] font-bold tracking-widest text-[#537565]`}>CLINICAL WORKSPACE</Text>
              </View>

              <Text accessibilityRole="header" style={tw`mt-6 text-3xl font-bold leading-9 text-[#18312C]`}>
                Choose your workspace
              </Text>
              <Text style={tw`mb-5 mt-2 text-sm leading-5 text-slate-500`}>
                Select the role linked to your account to continue securely.
              </Text>

              {PORTALS.map((portal) => (
                <Pressable
                  key={portal.role}
                  accessibilityRole="button"
                  accessibilityLabel={portal.button}
                  onPress={() => {
                    setSelectedPortal(portal.role);
                    setMessage("");
                  }}
                  style={({ pressed }) => [
                    tw`mb-3 rounded-2xl border border-[#E0E9E4] bg-white p-4 shadow-sm`,
                    pressed && tw`border-[#8DBBA7] opacity-90`,
                  ]}
                >
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`h-[76px] w-[84px] overflow-hidden rounded-xl`}>
                      <PortalIllustration role={portal.role} />
                    </View>
                    <View style={tw`ml-4 flex-1`}>
                      <Text style={tw`text-sm font-bold text-[#263B33]`}>{portal.title}</Text>
                      <Text style={tw`mt-1 text-xs leading-5 text-slate-500`}>{portal.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={19} color="#809087" />
                  </View>
                  <View style={tw`mt-3 min-h-9 flex-row items-center justify-between rounded-lg bg-[#F2F7F4] px-3`}>
                    <Text style={tw`text-xs font-bold text-[#326754]`}>Continue as {portal.title}</Text>
                    <Ionicons name="arrow-forward" size={15} color="#326754" />
                  </View>
                </Pressable>
              ))}

              {message ? (
                <Text accessibilityRole="alert" style={tw`mb-2 text-sm text-rose-700`}>{message}</Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => setHasExplored(false)}
                style={tw`mt-1 self-center rounded-full px-4 py-2`}
              >
                <Text style={tw`text-xs font-semibold text-teal-700`}>Back to explore</Text>
              </Pressable>
              <View style={tw`mt-2 flex-row items-center justify-center`}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#59816E" />
                <Text style={tw`ml-2 text-[10px] text-slate-500`}>Secure access for authorized clinical staff</Text>
              </View>
            </View>
          ) : (
          <>
          <View style={tw`relative h-80 overflow-hidden bg-teal-950`}>
            <Image
              source={require("../assets/images/doctor.jpg")}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              transition={250}
              accessibilityLabel="Doctor in a medical office"
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7, 27, 29, 0.34)" }]} />
            <View style={tw`absolute inset-x-6 bottom-12`}>
              <View style={tw`flex-row items-center`}>
                
                <Text style={tw`ml-2 text-2xl font-bold tracking-widest text-white`}>HEALTH DECISION SUPPORT SYSTEM</Text>
              </View>
              <Text style={tw`mt-4 max-w-[340px] text-3xl font-bold leading-9 text-white`}>
              
              </Text>
            </View>
          </View>

          <View style={tw`-mt-7 rounded-t-[28px] bg-[#f5f8f6] px-6 pt-7`}>
            <View style={tw`mb-6 flex-row items-center`}>
      
              <View style={tw`ml-3`}>
                <Text style={tw`text-xs font-bold tracking-widest text-[#176B5B]`}></Text>
                <Text style={tw`mt-1 text-sm font-medium text-slate-500`}></Text>
              </View>
            </View>

            <Text style={tw`text-3xl font-bold text-slate-950`}>
              {isForgotPassword ? "Reset password" : "Welcome back"}
            </Text>
            <Text style={tw`mt-2 text-base leading-6 text-slate-600`}>
              {isForgotPassword ? "Reset access to your account." : `Sign in to the ${PORTALS.find((portal) => portal.role === selectedPortal)?.title} portal.`}
            </Text>

            <Text style={tw`mb-2 mt-6 text-sm font-semibold text-slate-800`}>Email address</Text>
            <View style={tw`h-14 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4`}>
              <Ionicons name="mail-outline" size={19} color="#71817D" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@clinic.com"
                placeholderTextColor="#94A3A0"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                accessibilityLabel="Email address"
                style={tw`ml-3 flex-1 py-3 text-base text-slate-900`}
              />
            </View>

            {isForgotPassword && hasRequestedCode ? (
              <>
                <Text style={tw`mb-2 mt-4 text-sm font-semibold text-slate-800`}>Email reset code</Text>
                <View style={tw`h-14 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4`}>
                  <Ionicons name="key-outline" size={19} color="#71817D" />
                  <TextInput
                    value={resetCode}
                    onChangeText={setResetCode}
                    placeholder="Enter reset code"
                    placeholderTextColor="#94A3A0"
                    accessibilityLabel="Email reset code"
                    style={tw`ml-3 flex-1 py-3 text-base text-slate-900`}
                  />
                </View>
              </>
            ) : null}

            {(!isForgotPassword || hasRequestedCode) ? (
              <>
                <Text style={tw`mb-2 mt-4 text-sm font-semibold text-slate-800`}>
                  {isForgotPassword ? "New password" : "Password"}
                </Text>
                <View style={tw`h-14 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4`}>
                  <Ionicons name="lock-closed-outline" size={19} color="#71817D" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={isForgotPassword ? "At least 8 characters" : "Enter your password"}
                    placeholderTextColor="#94A3A0"
                    secureTextEntry
                    textContentType={isForgotPassword ? "newPassword" : "password"}
                    accessibilityLabel={isForgotPassword ? "New password" : "Password"}
                    style={tw`ml-3 flex-1 py-3 text-base text-slate-900`}
                  />
                </View>
              </>
            ) : null}

            {message ? (
              <View style={tw`mt-4 flex-row items-start rounded-xl ${isPortalAccessError ? "bg-rose-50" : "bg-[#e8f3ee]"} px-3 py-3`}>
                <Ionicons
                  name={isPortalAccessError ? "alert-circle-outline" : "information-circle-outline"}
                  size={18}
                  color={isPortalAccessError ? "#BE123C" : "#176B5B"}
                />
                <Text style={tw`ml-2 flex-1 text-sm leading-5 ${isPortalAccessError ? "text-rose-800" : "text-[#24594F]"}`}>{message}</Text>
              </View>
            ) : null}

            {!isForgotPassword ? (
              <Pressable
                onPress={() => { setIsForgotPassword(true); setMessage(""); }}
                style={tw`mt-4 self-end py-1`}
                accessibilityRole="button"
              >
                <Text style={tw`text-sm font-semibold text-[#176B5B]`}>Forgot password?</Text>
              </Pressable>
            ) : null}

            <Pressable
              disabled={isSubmitting}
              onPress={submit}
              style={({ pressed }) => [
                tw`mt-5 h-14 flex-row items-center justify-center rounded-2xl bg-[#102D2B] px-4`,
                pressed && tw`opacity-80`,
                isSubmitting && tw`opacity-60`,
              ]}
              accessibilityRole="button"
            >
              <Text style={tw`font-bold text-white`}>
                {isSubmitting
                  ? "Please wait..."
                  : isForgotPassword
                    ? hasRequestedCode ? "Reset password" : "Send reset code"
                    : "Sign in"}
              </Text>
              {!isSubmitting ? <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={tw`ml-2`} /> : null}
            </Pressable>

            {isForgotPassword ? (
              <Pressable
                onPress={() => { setIsForgotPassword(false); setMessage(""); }}
                style={tw`mt-4 items-center py-2`}
                accessibilityRole="button"
              >
                <Text style={tw`font-semibold text-[#176B5B]`}>Back to sign in</Text>
              </Pressable>
            ) : null}

            {!isForgotPassword ? (
              <Pressable
                onPress={() => {
                  setSelectedPortal(null);
                  setMessage("");
                  setPassword("");
                }}
                style={tw`mt-4 items-center py-2`}
                accessibilityRole="button"
              >
                <Text style={tw`font-semibold text-[#176B5B]`}>Choose a different portal</Text>
              </Pressable>
            ) : null}

            <View style={tw`mt-6 flex-row items-center justify-center`}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#82918D" />
              <Text style={tw`ml-2 text-xs text-slate-500`}>Secure clinical workspace</Text>
            </View>
          </View>
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getHeadlineWordStyle(value: Animated.Value) {
  return {
    opacity: value,
    transform: [{
      translateY: value.interpolate({
        inputRange: [0, 1],
        outputRange: [22, 0],
      }),
    }],
  };
}
