import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import tw from "twrnc";
import { useAuthStore } from "../stores/authStore";

export default function Settings() {
  const nurse = useAuthStore((state) => state.session?.nurse);
  const logout = useAuthStore((state) => state.logout);

  return (
    <View style={tw`rounded-2xl bg-white p-5`}>
      <View style={tw`flex-row items-center`}>
        <View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-slate-100`}>
          <Ionicons name="settings-outline" size={23} color="#475569" />
        </View>
        <View style={tw`ml-3`}>
          <Text style={tw`text-lg font-bold text-slate-900`}>{nurse?.name ?? "Workspace settings"}</Text>
          <Text style={tw`mt-1 text-xs text-slate-500`}>{nurse?.email ?? "Manage your clinical workspace"}</Text>
        </View>
      </View>
      <View style={tw`mt-5 gap-2 border-t border-slate-100 pt-4`}>
        <SettingRow icon="notifications-outline" label="Notifications" />
        <SettingRow icon="shield-checkmark-outline" label="Profile and security" />
        <SettingRow icon="lock-closed-outline" label="Data and privacy" />
        <SettingRow icon="log-out-outline" label="Sign out" onPress={logout} />
      </View>
    </View>
  );
}

function SettingRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={tw`flex-row items-center rounded-xl bg-slate-50 px-3 py-3`}><Ionicons name={icon} size={19} color="#0F766E" /><Text style={tw`ml-3 flex-1 text-sm font-semibold text-slate-700`}>{label}</Text><Ionicons name="chevron-forward" size={17} color="#94A3B8" /></Pressable>;
}
