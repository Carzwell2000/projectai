import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { getModelCatalog, healthCheck } from "../services/api";
import { useAuthStore } from "../stores/authStore";
import Login from "./Login";
import Admin from "../Components/Admin";


export default function RootLayout() {
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (!session) return;
    getModelCatalog().catch(() => undefined);
    const checkBackend = async () => {
      try {
        await healthCheck();
      } catch {
        clearSession();
      }
    };
    void checkBackend();
    const interval = setInterval(() => void checkBackend(), 5 * 60_000);
    return () => clearInterval(interval);
  }, [clearSession, session]);

  if (!session) return <Login />;
  if (session.nurse.role === "admin") return <Admin />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F766E",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarItemStyle: {
          flexGrow: 1,
          flexBasis: 0,
          alignItems: "center",
          justifyContent: "center",
        },
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          height: 72,
          paddingHorizontal: 0,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopColor: "#E2E8F0",
          borderTopWidth: 1,
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Tabs.Screen
        name="Login"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="Home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Assess"
        options={{
          title: "Assess",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Patientrecords"
        options={{
          title: "Patients",
          tabBarBadgeStyle: { backgroundColor: "#E11D48", color: "#FFFFFF" },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="RegisterPatient"
        options={{
          title: "Register",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Analysis"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="Settings"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="ChangePassword"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="Results"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="RegisteredPatients"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
