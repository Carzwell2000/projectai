import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import tw from "twrnc";

export default function Settings() {
  return (
    <View style={tw`rounded-2xl bg-white p-5`}>
      <View style={tw`flex-row items-center`}>
        <View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-slate-100`}>
          <Ionicons name="settings-outline" size={23} color="#475569" />
        </View>
        <View style={tw`ml-3`}>
          <Text style={tw`text-lg font-bold text-slate-900`}>Workspace settings</Text>
          <Text style={tw`mt-1 text-xs text-slate-500`}>Manage your clinical workspace</Text>
        </View>
      </View>
      <View style={tw`mt-5 gap-2 border-t border-slate-100 pt-4`}>
        <SettingRow icon="notifications-outline" label="Notifications" />
        <SettingRow icon="shield-checkmark-outline" label="Profile and security" />
        <SettingRow icon="lock-closed-outline" label="Data and privacy" />
      </View>
    </View>
  );
}

function SettingRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return <View style={tw`flex-row items-center rounded-xl bg-slate-50 px-3 py-3`}><Ionicons name={icon} size={19} color="#0F766E" /><Text style={tw`ml-3 flex-1 text-sm font-semibold text-slate-700`}>{label}</Text><Ionicons name="chevron-forward" size={17} color="#94A3B8" /></View>;
}
