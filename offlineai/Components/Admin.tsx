import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {Alert,KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

import Area from "../Components/Charts/Area";
import Pie from "../Components/Charts/Pie";
import RankedBars from "../Components/Charts/RankedBars";

import {
  changePassword,
  createNurse,
  deleteNurse,
  downloadAdminAssessmentWorkbook,
  getAdminAnalytics,
  getApiErrorMessage,
  listAdminAssessments,
  listNurses,
  type AdminAnalytics,
  type LocalAssessment,
  type RegisteredNurse,
  type StaffRole,
} from "../services/api";

import { useAuthStore } from "../stores/authStore";
import { useSyncStore } from "../stores/syncStore";

type AdminPage =
  | "overview"
  | "create"
  | "registered"
  | "password"
  | "assessments";

const BLUE = "#087C70";

export default function Admin() {
  /*
  ============================================================
  AUTH
  ============================================================
  */

  const logout = useAuthStore((state) => state.logout);
  const { width: windowWidth } = useWindowDimensions();

  /*
  ============================================================
  PAGE STATE
  ============================================================
  */

  const [activePage, setActivePage] =
    useState<AdminPage>("overview");

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  /*
  ============================================================
  NURSE FORM
  ============================================================
  */

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountRole, setAccountRole] = useState<StaffRole>("nurse");

  /*
  ============================================================
  GENERAL MESSAGE
  ============================================================
  */

  const [message, setMessage] = useState("");

  /*
  ============================================================
  LOADING STATES
  ============================================================
  */

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isChangingPassword, setIsChangingPassword] =
    useState(false);

  /*
  ============================================================
  PASSWORD
  ============================================================
  */

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  /*
  ============================================================
  DATA
  ============================================================
  */

  const [nurses, setNurses] =
    useState<RegisteredNurse[]>([]);

  const [analytics, setAnalytics] =
    useState<AdminAnalytics | null>(null);

  const [isLoadingAnalytics, setIsLoadingAnalytics] =
    useState(true);

  const [analyticsError, setAnalyticsError] =
    useState("");

  const [clinicAssessments, setClinicAssessments] =
    useState<LocalAssessment[]>([]);

  const [assessmentStaffRole, setAssessmentStaffRole] =
    useState<StaffRole | null>(null);

  const [assessmentQuery, setAssessmentQuery] =
    useState("");

  const [isLoadingAssessments, setIsLoadingAssessments] =
    useState(false);

  const [assessmentError, setAssessmentError] =
    useState("");

  const [assessmentExportError, setAssessmentExportError] =
    useState("");

  const [isExportingAssessments, setIsExportingAssessments] =
    useState(false);

  const visibleAssessments = clinicAssessments.filter((assessment) =>
    `${assessment.patient_name} ${assessment.disease || ""} ${assessment.symptoms} ${assessment.nurse_name}`
      .toLowerCase()
      .includes(assessmentQuery.trim().toLowerCase()),
  );
  const primaryHealthcareAssessments = visibleAssessments.filter(
    (assessment) => assessment.staff_role === "primary_healthcare",
  );
  const nurseAssessments = visibleAssessments.filter(
    (assessment) => assessment.staff_role !== "primary_healthcare",
  );
  const selectedAssessments = assessmentStaffRole === "primary_healthcare"
    ? primaryHealthcareAssessments
    : nurseAssessments;
  const selectedGroupCount = clinicAssessments.filter((assessment) =>
    assessmentStaffRole === "primary_healthcare"
      ? assessment.staff_role === "primary_healthcare"
      : assessment.staff_role !== "primary_healthcare",
  ).length;

  const exportClinicAssessments = async () => {
    if (!assessmentStaffRole) return;
    setAssessmentExportError("");
    setIsExportingAssessments(true);
    try {
      await downloadAdminAssessmentWorkbook(assessmentStaffRole);
    } catch (error) {
      setAssessmentExportError(getApiErrorMessage(error));
    } finally {
      setIsExportingAssessments(false);
    }
  };

  /*
  ============================================================
  LOAD NURSES
  ============================================================
  */

  const loadAdminData = useCallback(async () => {
    try {
      const registeredNurses =
        await listNurses();

      setNurses(registeredNurses);
    } catch (error) {
      setMessage(
        getApiErrorMessage(error)
      );
    }
  }, []);

  /*
  ============================================================
  LOAD ANALYTICS
  ============================================================
  */

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    setAnalyticsError("");

    try {
      const data =
        await getAdminAnalytics();

      setAnalytics(data);
    } catch (error) {
      setAnalyticsError(
        getApiErrorMessage(error)
      );
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  /*
  ============================================================
  INITIAL LOAD
  ============================================================
  */

  useEffect(() => {
    void loadAdminData();
    void loadAnalytics();

    void useSyncStore
      .getState()
      .refresh();
  }, [
    loadAdminData,
    loadAnalytics,
  ]);

  useEffect(() => {
    if (activePage !== "assessments") return undefined;
    let active = true;
    setIsLoadingAssessments(true);
    setAssessmentError("");

    listAdminAssessments()
      .then((assessments) => {
        if (active) setClinicAssessments(assessments);
      })
      .catch((error: unknown) => {
        if (active) setAssessmentError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (active) setIsLoadingAssessments(false);
      });

    return () => {
      active = false;
    };
  }, [activePage]);

  /*
  ============================================================
  SYNC MONITORING
  ============================================================
  */

  useEffect(
    () =>
      useSyncStore
        .getState()
        .startMonitoring(),
    []
  );

  /*
  ============================================================
  CREATE NURSE
  ============================================================
  */

  const submit = async () => {
    setMessage("");

    if (
      name.trim().length < 2 ||
      !email.includes("@") ||
      password.length < 8
    ) {
      setMessage(
        "Enter a name, valid email, and password of at least 8 characters."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      await createNurse({
        name,
        email,
        password,
        role: accountRole,
      });

      setName("");
      setEmail("");
      setPassword("");
      setAccountRole("nurse");

      setMessage(
        `${accountRole === "nurse" ? "Nurse" : "Village health worker"} account created successfully.`
      );

      await useSyncStore
        .getState()
        .refresh();

      await loadAdminData();
      await loadAnalytics();
    } catch (error) {
      setMessage(
        getApiErrorMessage(error)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
  ============================================================
  CHANGE ADMIN PASSWORD
  ============================================================
  */

  const updateAdminPassword = async () => {
    setMessage("");

    if (
      currentPassword.length < 8 ||
      newPassword.length < 8
    ) {
      setMessage(
        "Passwords must be at least 8 characters."
      );

      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(
        currentPassword,
        newPassword
      );

      setCurrentPassword("");
      setNewPassword("");

      setMessage(
        "Administrator password changed successfully."
      );
    } catch (error) {
      setMessage(
        getApiErrorMessage(error)
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  /*
  ============================================================
  PAGE TITLES
  ============================================================
  */

  const pageTitle =
    activePage === "overview"
      ? "Clinic overview"
      : activePage === "create"
        ? "Create Staff Account"
        : activePage === "registered"
          ? "Staff Directory"
            : activePage === "assessments"
              ? "Patient assessment records"
              : "Change Password";

  /*
  ============================================================
  MENU ITEMS
  ============================================================
  */

  const navigationItems: {
    page: AdminPage;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      page: "overview",
      label: "Dashboard",
      icon: "grid-outline",
    },
    {
      page: "create",
      label: "Create Staff Account",
      icon: "person-add-outline",
    },
    {
      page: "registered",
      label: "Staff Directory",
      icon: "people-outline",
    },
    {
      page: "assessments",
      label: "Patient assessment records",
      icon: "clipboard-outline",
    },
    {
      page: "password",
      label: "Change Password",
      icon: "lock-closed-outline",
    },
  ];

  /*
  ============================================================
  RETURN
  ============================================================
  */

  return (
    <SafeAreaView
      style={tw`flex-1 bg-[#F3F7F5]`}
    >
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-10`}
        >

          {/* ==================================================
              SIMPLE HEADER
              ONLY ADMINISTRATION DASHBOARD + MENU
          ================================================== */}

          <LinearGradient
            colors={["#075B51", "#06463F", "#063C39"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={tw`rounded-b-[26px] px-5 pb-6 pt-3`}
          >
            <View
              style={tw`mb-5 flex-row items-center justify-between`}
            >

              {/* TITLE */}

              <View style={tw`flex-row items-center`}>
                <View style={tw`h-10 w-10 items-center justify-center rounded-2xl border border-white/25 bg-white/10`}>
                  <Ionicons name="pulse" size={23} color="#A8F5DF" />
                </View>
                <View style={tw`ml-3`}>
                  <Text style={tw`text-base font-extrabold tracking-wide text-white`}>Clinic AI</Text>
                  <Text style={tw`mt-0.5 text-[10px] font-medium text-emerald-100`}>Administration</Text>
                </View>
              </View>

              {/* MENU */}

              <Pressable
                accessibilityLabel="Open admin menu"
                accessibilityRole="button"
                onPress={() =>
                  setIsMenuOpen(true)
                }
                style={({ pressed }) => [
                  tw`ml-3 h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10`,
                  pressed &&
                    tw`opacity-70`,
                ]}
              >
                <Ionicons
                  name="menu-outline"
                  size={25}
                  color="white"
                />
              </Pressable>

            </View>

            <View style={tw`mt-1 flex-row items-end justify-between`}>
                <View>
                  <Text style={tw`text-[10px] font-bold tracking-[1.7px] text-emerald-200`}>CLINICAL WORKSPACE</Text>
                  <Text style={tw`mt-1 text-2xl font-bold text-white`}>{pageTitle}</Text>
                  <Text style={tw`mt-1 text-xs text-emerald-50`}>Monitor staff, patients, and clinical activity.</Text>
                </View>
                <View style={tw`mb-1 h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-100/70 bg-white/10`}>
                  <Ionicons name="shield-checkmark-outline" size={19} color="white" />
                </View>
              </View>
            </LinearGradient>

          {/* ==================================================
              DASHBOARD / OVERVIEW
          ================================================== */}

          {activePage === "overview" ? (
            <View style={tw`px-4 pt-5`}>
              <View style={tw`mb-4 flex-row items-center justify-between`}>
                <View style={tw`mr-3 flex-1`}>
                  <Text style={tw`text-[10px] font-bold tracking-[1.5px] text-teal-700`}>CLINIC ADMINISTRATION</Text>
                  <Text style={tw`mt-1 text-xl font-bold text-[#143B4F]`}>Clinic overview</Text>
                  <Text style={tw`mt-1 text-xs leading-5 text-slate-600`}>
                    Monitor patient records, staff activity, and clinic-wide assessment trends.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActivePage("registered")}
                  style={({ pressed }) => [
                    tw`flex-row items-center rounded-xl bg-[#087C70] px-3 py-2.5`,
                    pressed && tw`opacity-80`,
                  ]}
                >
                  <Ionicons name="people-outline" size={16} color="white" />
                  <Text style={tw`ml-1.5 text-[10px] font-bold text-white`}>Manage staff</Text>
                </Pressable>
              </View>

              {/* ERROR */}

              {analyticsError ? (
                <MessageCard
                  message={analyticsError}
                  type="error"
                />
              ) : null}

              {/* LOADING */}

              {isLoadingAnalytics &&
              !analytics ? (
                <LoadingCard />
              ) : analytics ? (
                <>
                  {/* METRICS */}

                  <View style={tw`flex-row flex-wrap justify-between`}>
                    <AdminMetric
                      width={windowWidth >= 1050 ? "23.8%" : "48.5%"}
                      tone="green"
                      icon="people-outline"
                      label="Registered patients"
                      value={analytics.totals.patients}
                      detail="Clinic-wide patient records"
                    />
                    <AdminMetric
                      width={windowWidth >= 1050 ? "23.8%" : "48.5%"}
                      tone="blue"
                      icon="clipboard-outline"
                      label="Saved assessments"
                      value={analytics.totals.assessments}
                      detail="Clinical reviews recorded"
                    />
                    <AdminMetric
                      width={windowWidth >= 1050 ? "23.8%" : "48.5%"}
                      tone="purple"
                      icon="shield-checkmark-outline"
                      label="Nurse accounts"
                      value={analytics.totals.nurses}
                      detail="Manage staff"
                      onAction={() => setActivePage("registered")}
                    />
                    <AdminMetric
                      width={windowWidth >= 1050 ? "23.8%" : "48.5%"}
                      tone="orange"
                      icon="cloud-upload-outline"
                      label="Needs attention"
                      value={analytics.totals.pendingSync + analytics.totals.conflicts}
                      detail={`${analytics.totals.pendingSync} awaiting sync · ${analytics.totals.conflicts} conflicts`}
                    />
                  </View>

                  <View style={tw`mt-4 flex-row flex-wrap justify-between`}>
                    <DashboardCard
                      width={windowWidth >= 900 ? "48.8%" : "100%"}
                      icon="analytics-outline"
                      title="Assessment activity"
                      subtitle="Assessments added during the past seven days"
                      meta="Last 7 days"
                    >
                      <Area
                        series={[{
                          label: "Assessments",
                          color: "#167663",
                          fillColor: "#9AE6D3",
                          data: analytics.dailyAssessments,
                        }]}
                      />
                    </DashboardCard>

                    <DashboardCard
                      width={windowWidth >= 900 ? "48.8%" : "100%"}
                      icon="pulse-outline"
                      title="Common results"
                      subtitle="Distribution across saved assessments"
                      meta="Saved assessments"
                    >
                      <Pie
                        data={analytics.topDiseases}
                        emptyMessage={isLoadingAnalytics ? "Loading results…" : "No results recorded yet."}
                      />
                      <View style={tw`mt-2 flex-row items-start rounded-xl bg-amber-50 px-3 py-2`}>
                        <Ionicons name="alert-circle-outline" size={15} color="#B45309" />
                        <Text style={tw`ml-2 flex-1 text-[10px] leading-4 text-amber-800`}>
                          Results are informational, not diagnoses.
                        </Text>
                      </View>
                    </DashboardCard>
                  </View>

                  <View style={tw`mt-3 flex-row flex-wrap justify-between`}>
                    <DashboardCard
                      width={windowWidth >= 900 ? "48.8%" : "100%"}
                      icon="pie-chart-outline"
                      title="Assessment usage by role"
                      subtitle="Share of all saved assessments"
                      meta="All saved assessments"
                    >
                      <Pie
                        data={analytics.assessmentUsageByRole}
                        colors={["#11B98C", "#8255D5"]}
                        showPercentages
                        emptyMessage={isLoadingAnalytics ? "Loading staff usage…" : "No staff assessments recorded yet."}
                      />
                    </DashboardCard>

                    <DashboardCard
                      width={windowWidth >= 900 ? "48.8%" : "100%"}
                      icon="people-outline"
                      title="Assessments by staff member"
                      subtitle="Top staff members by assessment count"
                      meta="Clinic-wide totals"
                    >
                      <RankedBars data={analytics.assessmentsByNurse} />
                    </DashboardCard>
                  </View>

                  <LinearGradient
                    colors={["#E7FBF5", "#CCF4E9", "#B5ECDF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={tw`mt-4 flex-row items-center rounded-2xl border border-[#B6EBE0] px-4 py-4`}
                  >
                    <View style={tw`h-11 w-11 items-center justify-center rounded-2xl bg-white/70`}>
                      <Ionicons name="hardware-chip-outline" size={23} color="#087C70" />
                    </View>
                    <View style={tw`ml-3 flex-1`}>
                      <Text style={tw`text-sm font-bold text-[#07575B]`}>Clinic insights</Text>
                      <Text style={tw`mt-1 text-xs font-bold text-[#143B4F]`}>
                        {analytics.topDiseases[0]
                          ? `Most common result: ${analytics.topDiseases[0].label}`
                          : "No results recorded yet"}
                      </Text>
                      <Text style={tw`mt-1 text-[10px] leading-4 text-slate-600`}>
                        {analytics.topDiseases[0]
                          ? `${analytics.topDiseases[0].value} saved ${analytics.topDiseases[0].value === 1 ? "assessment" : "assessments"} with this result. Review each case clinically.`
                          : "Results are decision support and are not diagnoses."}
                      </Text>
                    </View>
                  </LinearGradient>
                </>
              ) : null}
            </View>
          ) : null}

          {/* ==================================================
              CREATE NURSE
          ================================================== */}

          {activePage === "create" ? (
            <View style={tw`px-4 pt-5`}>

              <View
                style={tw`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}
              >

                {/* HEADER */}

                <View
                  style={tw`bg-[#EAF8F2] px-5 py-5`}
                >
                  <View
                    style={tw`h-12 w-12 items-center justify-center rounded-2xl bg-white`}
                  >
                    <Ionicons
                      name="person-add-outline"
                      size={24}
                      color={BLUE}
                    />
                  </View>

                  <Text
                    style={tw`mt-4 text-xl font-bold text-slate-900`}
                  >
                    Create a healthcare staff account
                  </Text>
                  <Text style={tw`mt-1 text-sm leading-5 text-slate-600`}>
                    Add authorized staff to the clinical workspace.
                  </Text>
                </View>

                {/* FORM */}

                <View style={tw`p-5`}>

                  <FormLabel label="FULL NAME" />

                  <InputField
                    icon="person-outline"
                    value={name}
                    onChangeText={setName}
                    placeholder="Nurse full name"
                    autoCapitalize="words"
                  />

                  <FormLabel
                    label="EMAIL ADDRESS"
                  />

                  <InputField
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Nurse email address"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <FormLabel
                    label="TEMPORARY PASSWORD"
                  />

                  <InputField
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 8 characters"
                    secureTextEntry
                  />

                  <FormLabel label="ACCOUNT TYPE" />
                  <View style={tw`mt-2 flex-row gap-2`}>
                    {([
                      ["nurse", "Nurse"],
                      ["primary_healthcare", "Village health worker"],
                    ] as const).map(([role, label]) => (
                      <Pressable
                        key={role}
                        accessibilityRole="button"
                        accessibilityState={{ selected: accountRole === role }}
                        onPress={() => setAccountRole(role)}
                        style={tw`flex-1 items-center rounded-xl border px-3 py-3 ${accountRole === role ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}
                      >
                        <Text style={tw`text-sm font-semibold ${accountRole === role ? "text-teal-800" : "text-slate-600"}`}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* BUTTON */}

                  <Pressable
                    disabled={isSubmitting}
                    onPress={submit}
                    style={({ pressed }) => [
                      tw`mt-5 flex-row items-center justify-center rounded-xl bg-[#087C70] py-4`,
                      (pressed ||
                        isSubmitting) &&
                        tw`opacity-70`,
                    ]}
                  >
                    <Ionicons
                      name={
                        isSubmitting
                          ? "hourglass-outline"
                          : "person-add-outline"
                      }
                      size={19}
                      color="white"
                    />

                    <Text
                      style={tw`ml-2 font-bold text-white`}
                    >
                      {isSubmitting
                        ? "Creating account..."
                        : `Create ${accountRole === "nurse" ? "nurse" : "village health worker"} account`}
                    </Text>
                  </Pressable>

                </View>
              </View>
            </View>
          ) : null}

          {/* ==================================================
              CHANGE PASSWORD
          ================================================== */}

          {activePage === "password" ? (
            <View style={tw`px-4 pt-5`}>

              <View
                style={tw`overflow-hidden rounded-2xl border border-[#D8ECE4] bg-white shadow-sm`}
              >

                {/* HEADER */}

                <View
                  style={tw`bg-[#EAF8F2] px-5 py-5`}
                >
                  <View
                    style={tw`h-12 w-12 items-center justify-center rounded-2xl bg-white`}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={25}
                      color={BLUE}
                    />
                  </View>

                  <Text
                    style={tw`mt-4 text-xl font-bold text-slate-900`}
                  >
                    Change password
                  </Text>

                  <Text
                    style={tw`mt-1 text-sm leading-5 text-slate-600`}
                  >
                    Use a strong password that is unique to your administrator account.
                  </Text>
                </View>

                {/* FORM */}

                <View style={tw`p-5`}>

                  <FormLabel
                    label="CURRENT PASSWORD"
                  />

                  <InputField
                    icon="lock-closed-outline"
                    value={currentPassword}
                    onChangeText={
                      setCurrentPassword
                    }
                    placeholder="Current password"
                    secureTextEntry
                  />

                  <FormLabel
                    label="NEW PASSWORD"
                  />

                  <InputField
                    icon="key-outline"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 8 characters"
                    secureTextEntry
                  />

                  <View
                    style={tw`mt-4 flex-row items-center rounded-xl bg-slate-50 p-3`}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color="#64748B"
                    />

                    <Text style={tw`ml-2 flex-1 text-xs leading-5 text-slate-500`}>
                      Choose a password with at least 8 characters.
                    </Text>
                  </View>

                  <Pressable
                    disabled={
                      isChangingPassword
                    }
                    onPress={
                      updateAdminPassword
                    }
                    style={({ pressed }) => [
                      tw`mt-4 flex-row items-center justify-center rounded-xl bg-[#087C70] py-4`,
                      (pressed ||
                        isChangingPassword) &&
                        tw`opacity-60`,
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={19}
                      color="white"
                    />

                    <Text
                      style={tw`ml-2 font-bold text-white`}
                    >
                      {isChangingPassword
                        ? "Updating password..."
                        : "Update password"}
                    </Text>
                  </Pressable>

                </View>
              </View>
            </View>
          ) : null}

          {activePage === "registered" ? (
            <View style={tw`px-4 pt-5`}>

              <SectionHeading
                eyebrow="Directory"
                title="Healthcare staff accounts"
                subtitle="Manage healthcare staff accounts"
                rightContent={
                  <View
                    style={tw`min-w-10 items-center justify-center rounded-full bg-teal-100 px-3 py-2`}
                  >
                    <Text
                      style={tw`text-sm font-bold text-teal-800`}
                    >
                      {nurses.length}
                    </Text>
                  </View>
                }
              />

              {/* EMPTY STATE */}

              {nurses.length === 0 ? (
                <View
                  style={tw`mt-5 items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10`}
                >
                  <View
                    style={tw`h-14 w-14 items-center justify-center rounded-full bg-slate-100`}
                  >
                    <Ionicons
                      name="people-outline"
                      size={27}
                      color="#94A3B8"
                    />
                  </View>

                  <Text style={tw`mt-4 text-base font-bold text-slate-700`}>No staff accounts yet</Text>
                  <Text style={tw`mt-1 text-center text-sm text-slate-500`}>Create a staff account to see it listed here.</Text>
                </View>
              ) : null}

             

              {nurses.map((nurse) => (
                <View
                  key={nurse.id}
                  style={tw`mt-3 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}
                >

                

                  <View
                    style={tw`h-12 w-12 items-center justify-center rounded-2xl bg-teal-50`}
                  >
                    <Ionicons
                      name="person-outline"
                      size={22}
                      color={BLUE}
                    />
                  </View>

      

                  <View
                    style={tw`ml-3 flex-1`}
                  >
                    <Text
                      numberOfLines={1}
                      style={tw`text-base font-bold text-slate-900`}
                    >
                      {nurse.name}
                    </Text>

                    <View
                      style={tw`mt-1 flex-row items-center`}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={13}
                        color="#94A3B8"
                      />

                      <Text
                        numberOfLines={1}
                        style={tw`ml-1 flex-1 text-xs text-slate-500`}
                      >
                        {nurse.email}
                      </Text>
                    </View>

                    <View
                      style={tw`mt-2 self-start rounded-full bg-emerald-50 px-2.5 py-1`}
                    >
                      <Text
                        style={tw`text-[10px] font-bold text-emerald-700`}
                      >
                        {nurse.role === "primary_healthcare" ? "VILLAGE HEALTH WORKER" : "REGISTERED NURSE"}
                      </Text>
                    </View>
                  </View>

                  {/* DELETE */}

                  <Pressable
                    accessibilityLabel={`Delete ${nurse.name}`}
                    onPress={() =>
                      Alert.alert(
                        "Delete nurse",
                        `Are you sure you want to delete ${nurse.name}'s account?`,
                        [
                          {
                            text: "Cancel",
                            style: "cancel",
                          },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress:
                              async () => {
                                try {
                                  await deleteNurse(
                                    nurse.id
                                  );

                                  await loadAdminData();
                                  await loadAnalytics();
                                } catch (
                                  error
                                ) {
                                  setMessage(
                                    getApiErrorMessage(
                                      error
                                    )
                                  );
                                }
                              },
                          },
                        ]
                      )
                    }
                    style={({ pressed }) => [
                      tw`h-10 w-10 items-center justify-center rounded-xl bg-rose-50`,
                      pressed &&
                        tw`opacity-60`,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="#BE123C"
                    />
                  </Pressable>

                </View>
              ))}
            </View>
          ) : null}

          {activePage === "assessments" ? (
            <View style={tw`px-4 pt-5`}>
              <SectionHeading
                eyebrow="Clinic-wide records"
                title={assessmentStaffRole === "primary_healthcare" ? "Village health worker assessments" : assessmentStaffRole === "nurse" ? "Nurse assessments" : "Patient assessments"}
                subtitle={assessmentStaffRole ? "Records for this staff group." : "Choose a staff group to view its records."}
                rightContent={
                  assessmentStaffRole ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setAssessmentStaffRole(null);
                        setAssessmentQuery("");
                        setAssessmentExportError("");
                      }}
                      style={tw`rounded-lg border border-slate-200 bg-white px-3 py-2`}
                    >
                      <Text style={tw`text-xs font-bold text-[#087C70]`}>All staff groups</Text>
                    </Pressable>
                  ) : (
                    <View style={tw`min-w-10 items-center justify-center rounded-full bg-teal-100 px-3 py-2`}>
                      <Text style={tw`text-sm font-bold text-teal-800`}>{clinicAssessments.length}</Text>
                    </View>
                  )
                }
              />

              {assessmentStaffRole ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isExportingAssessments || selectedGroupCount === 0}
                  onPress={() => void exportClinicAssessments()}
                  style={({ pressed }) => [
                    tw`mt-3 self-end flex-row items-center rounded-xl bg-[#087C70] px-4 py-3`,
                    (pressed || isExportingAssessments || selectedGroupCount === 0) && tw`opacity-60`,
                  ]}
                >
                  <Ionicons name={isExportingAssessments ? "hourglass-outline" : "download-outline"} size={17} color="white" />
                  <Text style={tw`ml-2 text-xs font-bold text-white`}>
                    {isExportingAssessments ? "Preparing Excel…" : `Download ${assessmentStaffRole === "nurse" ? "nurse" : "village health worker"} Excel`}
                  </Text>
                </Pressable>
              ) : null}

              {assessmentExportError ? (
                <View style={tw`mt-3`}>
                  <MessageCard message={assessmentExportError} type="error" />
                </View>
              ) : null}

              {assessmentStaffRole ? (
                <View style={tw`mt-4 flex-row items-center rounded-xl border border-slate-200 bg-white px-3`}>
                  <Ionicons name="search-outline" size={18} color="#94A3B8" />
                  <TextInput
                    accessibilityLabel="Search patient assessment records"
                    value={assessmentQuery}
                    onChangeText={setAssessmentQuery}
                    placeholder="Search patient, result, symptoms, or staff"
                    placeholderTextColor="#94A3B8"
                    style={tw`ml-2 flex-1 py-3 text-xs text-slate-900`}
                  />
                </View>
              ) : null}

              {assessmentError ? (
                <MessageCard message={assessmentError} type="error" />
              ) : null}

              {isLoadingAssessments ? (
                <View style={tw`mt-4 rounded-xl border border-slate-200 bg-white px-4 py-6`}>
                  <Text style={tw`text-center text-sm font-medium text-slate-500`}>Loading clinic assessments…</Text>
                </View>
              ) : assessmentStaffRole ? (
                <AdminAssessmentTable
                  title={assessmentStaffRole === "primary_healthcare" ? "Village health worker assessments" : "Nurse assessments"}
                  assessments={selectedAssessments}
                  hasSearch={Boolean(assessmentQuery.trim())}
                />
              ) : (
                <View style={tw`mt-4`}>
                  <AssessmentGroupButton
                    title="Village health worker assessments"
                    count={primaryHealthcareAssessments.length}
                    onPress={() => setAssessmentStaffRole("primary_healthcare")}
                  />
                  <AssessmentGroupButton
                    title="Nurse assessments"
                    count={nurseAssessments.length}
                    onPress={() => setAssessmentStaffRole("nurse")}
                  />
                </View>
              )}
            </View>
          ) : null}

          {/* ==================================================
              MESSAGE
          ================================================== */}

          {message ? (
            <View style={tw`px-4 pt-4`}>
              <MessageCard
                message={message}
                type={
                  message
                    .toLowerCase()
                    .includes("success")
                    ? "success"
                    : "warning"
                }
              />
            </View>
          ) : null}

          {/* ==================================================
              LOGOUT
          ================================================== */}

          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              tw`mx-4 mt-6 flex-row items-center justify-center rounded-xl border border-slate-200 bg-white py-4`,
              pressed &&
                tw`bg-slate-50`,
            ]}
          >
            <View
              style={tw`h-8 w-8 items-center justify-center rounded-lg bg-slate-100`}
            >
              <Ionicons
                name="log-out-outline"
                size={17}
                color={BLUE}
              />
            </View>

            <Text
              style={tw`ml-2 font-bold text-teal-700`}
            >
              Sign out
            </Text>
          </Pressable>
        </ScrollView>

        {/* ==================================================
            ADMIN MENU
        ================================================== */}

        <Modal
          animationType="fade"
          transparent
          visible={isMenuOpen}
          onRequestClose={() =>
            setIsMenuOpen(false)
          }
        >
          {/* BACKGROUND */}

          <Pressable
            style={tw`flex-1 bg-slate-900/40`}
            onPress={() =>
              setIsMenuOpen(false)
            }
          >

            {/* MENU */}

            <Pressable
              style={tw`absolute right-4 top-14 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg`}
              onPress={(event) =>
                event.stopPropagation()
              }
            >

              {/* MENU HEADER */}

              <LinearGradient
                colors={["#075B51", "#06463F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tw`px-5 py-5`}
              >
                <View
                  style={tw`flex-row items-center`}
                >
                  <View
                    style={tw`h-11 w-11 items-center justify-center rounded-xl bg-white/15`}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={22}
                      color="white"
                    />
                  </View>

                  <View
                    style={tw`ml-3`}
                  >
                    <Text
                      style={tw`text-lg font-bold text-white`}
                    >
                      Administration
                    </Text>

                    <Text
                      style={tw`mt-0.5 text-xs text-emerald-100`}
                    >
                      Dashboard menu
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* MENU ITEMS */}

              <View style={tw`p-3`}>
                {navigationItems.map(
                  ({
                    page,
                    label,
                    icon,
                  }) => {
                    const isActive =
                      activePage === page;

                    return (
                      <Pressable
                        key={page}
                        accessibilityRole="button"
                        onPress={() => {
                          setActivePage(
                            page
                          );

                          setIsMenuOpen(
                            false
                          );
                        }}
                        style={({
                          pressed,
                        }) => [
                          tw`mb-1 flex-row items-center rounded-xl px-3 py-3.5`,
                          isActive &&
                            tw`bg-teal-50`,
                          pressed &&
                            tw`opacity-70`,
                        ]}
                      >

                        {/* ICON */}

                        <View
                          style={[
                            tw`h-9 w-9 items-center justify-center rounded-xl`,
                            isActive
                              ? tw`bg-teal-100`
                              : tw`bg-slate-100`,
                          ]}
                        >
                          <Ionicons
                            name={icon}
                            size={19}
                            color={
                              isActive
                                ? BLUE
                                : "#64748B"
                            }
                          />
                        </View>

                        {/* LABEL */}

                        <Text
                          style={[
                            tw`ml-3 text-sm font-semibold`,
                            isActive
                              ? tw`text-teal-800`
                              : tw`text-slate-700`,
                          ]}
                        >
                          {label}
                        </Text>

                        {/* ACTIVE ARROW */}

                        {isActive ? (
                          <Ionicons
                            name="chevron-forward-outline"
                            size={17}
                            color={BLUE}
                            style={tw`ml-auto`}
                          />
                        ) : null}

                      </Pressable>
                    );
                  }
                )}
              </View>

              {/* MENU FOOTER */}

              <View
                style={tw`border-t border-slate-100 px-5 py-4`}
              >
                <Text
                  style={tw`text-center text-[10px] font-medium uppercase tracking-widest text-slate-400`}
                >
                  Administration Dashboard
                </Text>
              </View>

            </Pressable>
          </Pressable>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AdminAssessmentCell({
  width,
  header,
  strong,
  children,
}: {
  width: number;
  header?: boolean;
  strong?: boolean;
  children: ReactNode;
}) {
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

function AdminAssessmentTable({
  title,
  assessments,
  hasSearch,
}: {
  title: string;
  assessments: LocalAssessment[];
  hasSearch: boolean;
}) {
  return (
    <View style={tw`mt-5`}>
      <View style={tw`mb-2 flex-row items-center justify-between`}>
        <Text style={tw`text-sm font-bold text-[#143B4F]`}>{title}</Text>
        <Text style={tw`text-xs font-medium text-slate-500`}>{assessments.length} records</Text>
      </View>
      {assessments.length ? (
        <View style={tw`overflow-hidden rounded-xl border border-[#E1ECE7] bg-white`}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={tw`h-11 flex-row items-center bg-[#EAF8F2]`}>
                <AdminAssessmentCell width={160} header>Patient</AdminAssessmentCell>
                <AdminAssessmentCell width={100} header>Date</AdminAssessmentCell>
                <AdminAssessmentCell width={60} header>Age</AdminAssessmentCell>
                <AdminAssessmentCell width={95} header>Gender</AdminAssessmentCell>
                <AdminAssessmentCell width={80} header>Temp.</AdminAssessmentCell>
                <AdminAssessmentCell width={105} header>Blood pressure</AdminAssessmentCell>
                <AdminAssessmentCell width={200} header>Symptoms</AdminAssessmentCell>
                <AdminAssessmentCell width={150} header>Result</AdminAssessmentCell>
                <AdminAssessmentCell width={90} header>Confidence</AdminAssessmentCell>
                <AdminAssessmentCell width={220} header>Recommendation</AdminAssessmentCell>
                <AdminAssessmentCell width={140} header>Assessed by</AdminAssessmentCell>
                <AdminAssessmentCell width={95} header>Sync</AdminAssessmentCell>
              </View>
              {assessments.map((assessment) => (
                <View key={assessment.id} style={tw`min-h-[64px] flex-row items-center border-t border-[#EDF2EF]`}>
                  <AdminAssessmentCell width={160} strong>{assessment.patient_name || "Patient record"}</AdminAssessmentCell>
                  <AdminAssessmentCell width={100}>{formatAdminAssessmentDate(assessment.created_at)}</AdminAssessmentCell>
                  <AdminAssessmentCell width={60}>{`${assessment.age} yrs`}</AdminAssessmentCell>
                  <AdminAssessmentCell width={95}>{assessment.gender || "—"}</AdminAssessmentCell>
                  <AdminAssessmentCell width={80}>{`${assessment.temperature} °C`}</AdminAssessmentCell>
                  <AdminAssessmentCell width={105}>{assessment.blood_pressure || "—"}</AdminAssessmentCell>
                  <AdminAssessmentCell width={200}>{assessment.symptoms || "—"}</AdminAssessmentCell>
                  <AdminAssessmentCell width={150} strong>{assessment.disease || "Review recommended"}</AdminAssessmentCell>
                  <AdminAssessmentCell width={90}>{assessment.confidence == null ? "—" : `${Math.round(assessment.confidence * 100)}%`}</AdminAssessmentCell>
                  <AdminAssessmentCell width={220}>{assessment.recommendation || "—"}</AdminAssessmentCell>
                  <AdminAssessmentCell width={140}>{assessment.nurse_name || "Unknown staff"}</AdminAssessmentCell>
                  <View style={tw`w-[95px] px-3`}>
                    <View style={tw`self-start rounded-full ${assessment.sync_status === "synced" ? "bg-[#EAF8F2]" : assessment.sync_status === "conflict" ? "bg-rose-50" : "bg-amber-50"} px-2 py-1`}>
                      <Text style={tw`text-[9px] font-bold ${assessment.sync_status === "synced" ? "text-[#087C70]" : assessment.sync_status === "conflict" ? "text-rose-700" : "text-amber-700"}`}>
                        {assessment.sync_status === "synced" ? "SYNCED" : assessment.sync_status === "conflict" ? "CONFLICT" : "PENDING"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={tw`items-center rounded-xl border border-dashed border-[#C8DCD2] bg-white px-5 py-7`}>
          <Text style={tw`text-xs font-medium text-slate-500`}>
            {hasSearch ? "No matching records in this table." : "No assessments recorded for this staff group yet."}
          </Text>
        </View>
      )}
    </View>
  );
}

function AssessmentGroupButton({
  title,
  count,
  onPress,
}: {
  title: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        tw`mb-3 flex-row items-center rounded-xl border border-[#E1ECE7] bg-white px-4 py-4`,
        pressed && tw`opacity-70`,
      ]}
    >
      <View style={tw`h-10 w-10 items-center justify-center rounded-xl bg-teal-50`}>
        <Ionicons name="file-tray-outline" size={20} color="#087C70" />
      </View>
      <View style={tw`ml-3 flex-1`}>
        <Text style={tw`text-sm font-bold text-[#143B4F]`}>{title}</Text>
        <Text style={tw`mt-1 text-xs text-slate-500`}>{count} assessment records</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#64748B" />
    </Pressable>
  );
}

function formatAdminAssessmentDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

/*
============================================================
SECTION HEADING
============================================================
*/

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  rightContent,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  rightContent?: ReactNode;
}) {
  return (
    <View
      style={tw`flex-row items-end justify-between`}
    >
      <View style={tw`flex-1`}>

        <Text
          style={tw`text-[10px] font-bold uppercase tracking-widest text-teal-700`}
        >
          {eyebrow}
        </Text>

        <Text
          style={tw`mt-1 text-xl font-bold text-[#143B4F]`}
        >
          {title}
        </Text>

        <Text
          style={tw`mt-1 text-sm text-slate-500`}
        >
          {subtitle}
        </Text>

      </View>

      {rightContent ? (
        <View style={tw`ml-3`}>
          {rightContent}
        </View>
      ) : null}
    </View>
  );
}

/*
============================================================
DASHBOARD CARD
============================================================
*/

function DashboardCard({
  icon,
  title,
  subtitle,
  meta,
  width = "100%",
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  meta?: string;
  width?: `${number}%`;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        tw`overflow-hidden rounded-2xl border border-[#E0EDF1] bg-white shadow-sm`,
        { width },
      ]}
    >

      {/* CARD HEADER */}

      <View style={tw`px-4 pt-4`}>
        <View
          style={tw`flex-row items-center justify-between`}
        >

          <View style={tw`flex-1 flex-row items-center`}>
            <View style={tw`h-9 w-9 items-center justify-center rounded-xl bg-[#E4F6F0]`}>
              <Ionicons name={icon} size={18} color={BLUE} />
            </View>
            <View style={tw`ml-3 flex-1`}>
              <Text style={tw`text-sm font-bold text-[#07575B]`}>{title}</Text>
              <Text style={tw`mt-0.5 text-[10px] leading-4 text-slate-500`}>{subtitle}</Text>
            </View>
          </View>

          {meta ? <Text style={tw`ml-2 text-[9px] text-slate-400`}>{meta}</Text> : null}
        </View>
      </View>

      {/* CONTENT */}

      <View style={tw`px-3 pb-3 pt-2`}>
        {children}
      </View>
    </View>
  );
}

/*
============================================================
ADMIN METRIC
============================================================
*/

function AdminMetric({
  icon,
  label,
  value,
  detail,
  tone,
  width,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  detail?: string;
  tone: "green" | "blue" | "purple" | "orange";
  width: `${number}%`;
  onAction?: () => void;
}) {
  const toneStyles = {
    green: { backgroundColor: "#EAF7F0", borderColor: "#D8EDE2", iconBackgroundColor: "#D5F1E5", color: "#167663" },
    blue: { backgroundColor: "#EFF6FC", borderColor: "#DBEAF5", iconBackgroundColor: "#DCEEFF", color: "#3979B5" },
    purple: { backgroundColor: "#F5F0FB", borderColor: "#E9DDF7", iconBackgroundColor: "#E9DDF7", color: "#8052C8" },
    orange: { backgroundColor: "#FFF6EA", borderColor: "#F4E4CE", iconBackgroundColor: "#FCE8C7", color: "#C27824" },
  }[tone];

  return (
    <View
      style={[
        tw`mb-3 min-w-0 flex-row items-center rounded-2xl border p-3 shadow-sm`,
        { width, backgroundColor: toneStyles.backgroundColor, borderColor: toneStyles.borderColor },
      ]}
    >

      <View
        style={[tw`h-10 w-10 items-center justify-center rounded-xl`, { backgroundColor: toneStyles.iconBackgroundColor }]}
      >
        <Ionicons name={icon} size={20} color={toneStyles.color} />
      </View>

      <View style={tw`ml-3 min-w-0 flex-1`}>
        <Text numberOfLines={1} style={tw`text-[10px] font-semibold text-[#52718A]`}>{label}</Text>
        <Text style={tw`mt-0.5 text-xl font-bold text-[#143B4F]`}>{value}</Text>
        {detail ? onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} style={tw`mt-1 flex-row items-center`}>
            <Text style={[tw`text-[9px] font-bold`, { color: toneStyles.color }]}>{detail}</Text>
            <Ionicons name="arrow-forward" size={11} color={toneStyles.color} style={tw`ml-1`} />
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={tw`mt-1 text-[9px] leading-3 text-slate-500`}>{detail}</Text>
        ) : null}
      </View>

    </View>
  );
}

/*
============================================================
FORM LABEL
============================================================
*/

function FormLabel({
  label,
}: {
  label: string;
}) {
  return (
    <Text
      style={tw`mt-5 text-[10px] font-bold tracking-widest text-slate-500`}
    >
      {label}
    </Text>
  );
}

/*
============================================================
INPUT FIELD
============================================================
*/

function InputField({
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (
    value: string
  ) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?:
    | "none"
    | "sentences"
    | "words"
    | "characters";
  keyboardType?: any;
}) {
  return (
    <View
      style={tw`mt-2 flex-row items-center rounded-xl border border-slate-200 bg-[#F8FAFA] px-3`}
    >

      <Ionicons
        name={icon}
        size={18}
        color="#94A3B8"
      />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        secureTextEntry={
          secureTextEntry
        }
        autoCapitalize={
          autoCapitalize
        }
        keyboardType={
          keyboardType
        }
        style={tw`flex-1 px-3 py-4 text-sm text-slate-900`}
      />

    </View>
  );
}

/*
============================================================
MESSAGE CARD
============================================================
*/

function MessageCard({
  message,
  type,
}: {
  message: string;
  type:
    | "success"
    | "error"
    | "warning";
}) {
  const config = {
    success: {
      icon: "checkmark-circle-outline" as const,
      container:
        "border-emerald-200 bg-emerald-50",
      iconColor: "#047857",
      text: "text-emerald-800",
    },

    error: {
      icon: "close-circle-outline" as const,
      container:
        "border-rose-200 bg-rose-50",
      iconColor: "#BE123C",
      text: "text-rose-800",
    },

    warning: {
      icon: "information-circle-outline" as const,
      container:
        "border-amber-200 bg-amber-50",
      iconColor: "#B45309",
      text: "text-amber-800",
    },
  };

  const current =
    config[type];

  return (
    <View
      style={tw`flex-row items-center rounded-xl border px-4 py-3 ${current.container}`}
    >

      <Ionicons
        name={current.icon}
        size={19}
        color={current.iconColor}
      />

      <Text
        style={tw`ml-2 flex-1 text-sm leading-5 ${current.text}`}
      >
        {message}
      </Text>

    </View>
  );
}

/*
============================================================
LOADING CARD
============================================================
*/

function LoadingCard() {
  return (
    <View
      style={tw`mt-3 items-center rounded-2xl border border-slate-200 bg-white px-5 py-12 shadow-sm`}
    >

      <View
        style={tw`h-14 w-14 items-center justify-center rounded-full bg-teal-50`}
      >
        <Ionicons
          name="analytics-outline"
          size={27}
          color={BLUE}
        />
      </View>

      <Text
        style={tw`mt-4 text-base font-bold text-slate-700`}
      >
        Loading dashboard
      </Text>

      <Text
        style={tw`mt-1 text-sm text-slate-500`}
      >
        Fetching the latest clinical analytics...
      </Text>

    </View>
  );
}
