import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect,useState, type ReactNode,} from "react";
import {Alert,KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

import Area from "./Charts/Area";
import Pie from "./Charts/Pie";
import RankedBars from "./Charts/RankedBars";

import {
  changePassword,
  createNurse,
  deleteNurse,
  getAdminAnalytics,
  getApiErrorMessage,
  listNurses,
  type AdminAnalytics,
  type RegisteredNurse,
} from "../services/api";

import { useAuthStore } from "../stores/authStore";
import { useSyncStore } from "../stores/syncStore";

type AdminPage =
  | "overview"
  | "create"
  | "registered"
  | "password";

const BLUE = "#0EA5E9";

export default function Admin() {
  /*
  ============================================================
  AUTH
  ============================================================
  */

  const logout = useAuthStore((state) => state.logout);

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
      });

      setName("");
      setEmail("");
      setPassword("");

      setMessage(
        "Nurse account created successfully."
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
      ? "Dashboard"
      : activePage === "create"
        ? "Create Nurse"
        : activePage === "registered"
          ? "Nurse Directory"
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
      label: "Create Nurse",
      icon: "person-add-outline",
    },
    {
      page: "registered",
      label: "Nurse Directory",
      icon: "people-outline",
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
      style={tw`flex-1 bg-[#F4F7F7]`}
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

          <View
            style={tw`bg-sky-500 px-5 pb-7 pt-5`}
          >
            <View
              style={tw`flex-row items-center justify-between`}
            >

              {/* TITLE */}

              <Text
                style={tw`flex-1 text-2xl font-bold text-white`}
              >
                Administration Dashboard
              </Text>

              {/* MENU */}

              <Pressable
                accessibilityLabel="Open admin menu"
                accessibilityRole="button"
                onPress={() =>
                  setIsMenuOpen(true)
                }
                style={({ pressed }) => [
                  tw`ml-3 h-11 w-11 items-center justify-center rounded-xl bg-white/15`,
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
          </View>

          {/* ==================================================
              DASHBOARD / OVERVIEW
          ================================================== */}

          {activePage === "overview" ? (
            <View style={tw`px-4 pt-5`}>

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

                  <View
                    style={tw`mt-4 flex-row gap-3`}
                  >
                    <AdminMetric
                      icon="pulse-outline"
                      label="Assessments"
                      value={
                        analytics.totals
                          .assessments
                      }
                    />

                    <AdminMetric
                      icon="people-outline"
                      label="Patients"
                      value={
                        analytics.totals
                          .patients
                      }
                    />
                  </View>

                  <View
                    style={tw`mt-3 flex-row gap-3`}
                  >
                    <AdminMetric
                      icon="medkit-outline"
                      label="Nurses"
                      value={
                        analytics.totals
                          .nurses
                      }
                    />

                    <AdminMetric
                      icon="cloud-upload-outline"
                      label="Pending Sync"
                      value={
                        analytics.totals
                          .pendingSync
                      }
                      detail={`${analytics.totals.conflicts} conflicts`}
                    />
                  </View>

                  {/* DAILY ASSESSMENTS */}

                  <DashboardCard
                    icon="analytics-outline"
                    title="Daily activity"
                    subtitle="Assessments added during the past seven days"
                  >
                    <Area
                      series={[
                        {
                          label:
                            "Assessments",
                          color:
                            "#0EA5E9",
                          fillColor:
                            "#7DD3FC",
                          data:
                            analytics.dailyAssessments,
                        },
                      ]}
                    />
                  </DashboardCard>

                  {/* NURSE ASSESSMENTS */}

                  <DashboardCard
                    icon="people-outline"
                    title="Assessments by nurse"
                    subtitle="Top ten nurses by total assessments"
                  >
                    <RankedBars
                      data={
                        analytics.assessmentsByNurse
                      }
                    />
                  </DashboardCard>

                  {/* DISEASES */}

                  <DashboardCard
                    icon="pulse-outline"
                    title="Most predicted diseases"
                    subtitle="Distribution of predicted conditions"
                  >
                    <Pie
                      data={
                        analytics.topDiseases
                      }
                    />
                  </DashboardCard>
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
                  style={tw`bg-[#F0F9FF] px-5 py-5`}
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
                    Create a nurse account
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

                  {/* BUTTON */}

                  <Pressable
                    disabled={isSubmitting}
                    onPress={submit}
                    style={({ pressed }) => [
                      tw`mt-5 flex-row items-center justify-center rounded-xl bg-[#0EA5E9] py-4`,
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
                        : "Create nurse account"}
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
                style={tw`overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm`}
              >

                {/* HEADER */}

                <View
                  style={tw`bg-[#F0F9FF] px-5 py-5`}
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

                    <Text
                      style={tw`ml-2 flex-1 text-xs leading-5 text-slate-500`}
                    >
            
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
                      tw`mt-4 flex-row items-center justify-center rounded-xl bg-[#0EA5E9] py-4`,
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
                title="Registered nurses"
                subtitle="Manage healthcare staff accounts"
                rightContent={
                  <View
                    style={tw`min-w-10 items-center justify-center rounded-full bg-sky-100 px-3 py-2`}
                  >
                    <Text
                      style={tw`text-sm font-bold text-sky-800`}
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

                  <Text
                    style={tw`mt-4 text-base font-bold text-slate-700`}
                  >
                  
                  </Text>

                  <Text
                    style={tw`mt-1 text-center text-sm text-slate-500`}
                  >
          
                  </Text>
                </View>
              ) : null}

             

              {nurses.map((nurse) => (
                <View
                  key={nurse.id}
                  style={tw`mt-3 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}
                >

                

                  <View
                    style={tw`h-12 w-12 items-center justify-center rounded-2xl bg-sky-50`}
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
                        REGISTERED NURSE
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
              style={tw`ml-2 font-bold text-sky-700`}
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

              <View
                style={tw`bg-[#0EA5E9] px-5 py-5`}
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
                      style={tw`mt-0.5 text-xs text-sky-100`}
                    >
                      Dashboard menu
                    </Text>
                  </View>
                </View>
              </View>

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
                            tw`bg-sky-50`,
                          pressed &&
                            tw`opacity-70`,
                        ]}
                      >

                        {/* ICON */}

                        <View
                          style={[
                            tw`h-9 w-9 items-center justify-center rounded-xl`,
                            isActive
                              ? tw`bg-sky-100`
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
                              ? tw`text-sky-800`
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
          style={tw`text-[10px] font-bold uppercase tracking-widest text-sky-600`}
        >
          {eyebrow}
        </Text>

        <Text
          style={tw`mt-1 text-xl font-bold text-slate-900`}
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
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View
      style={tw`mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}
    >

      {/* CARD HEADER */}

      <View style={tw`px-4 pt-4`}>
        <View
          style={tw`flex-row items-center`}
        >

          <View
            style={tw`h-9 w-9 items-center justify-center rounded-xl bg-sky-50`}
          >
            <Ionicons
              name={icon}
              size={18}
              color={BLUE}
            />
          </View>

          <View
            style={tw`ml-3 flex-1`}
          >
            <Text
              style={tw`text-base font-bold text-slate-900`}
            >
              {title}
            </Text>

            <Text
              style={tw`mt-0.5 text-xs text-slate-500`}
            >
              {subtitle}
            </Text>
          </View>

        </View>
      </View>

      {/* CONTENT */}

      <View
        style={tw`px-3 pb-3 pt-2`}
      >
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <View
      style={tw`flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}
    >

      <View
        style={tw`h-11 w-11 items-center justify-center rounded-xl bg-sky-50`}
      >
        <Ionicons
          name={icon}
          size={21}
          color={BLUE}
        />
      </View>

      <Text
        style={tw`mt-4 text-2xl font-bold text-slate-900`}
      >
        {value}
      </Text>

      <Text
        style={tw`mt-1 text-xs font-semibold text-slate-500`}
      >
        {label}
      </Text>

      {detail ? (
        <View
          style={tw`mt-2 self-start rounded-full bg-amber-50 px-2 py-1`}
        >
          <Text
            style={tw`text-[9px] font-bold text-amber-700`}
          >
            {detail}
          </Text>
        </View>
      ) : null}

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
        style={tw`h-14 w-14 items-center justify-center rounded-full bg-sky-50`}
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
