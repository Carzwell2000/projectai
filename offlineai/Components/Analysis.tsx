import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import tw from "twrnc";

export default function Analysis() {
  return (
    <View style={tw`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm`}>
      <View style={tw`flex-row items-center`}>
        <View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-teal-100`}>
          <Ionicons name="analytics-outline" size={23} color="#0F766E" />
        </View>
        <View style={tw`ml-3`}>
          <Text style={tw`text-lg font-bold text-slate-900`}>Clinical analysis</Text>
          <Text style={tw`mt-1 text-xs text-slate-500`}>Recent decision-support activity</Text>
        </View>
      </View>
      <View style={tw`mt-5 flex-row justify-between border-t border-slate-100 pt-4`}>
        <View>
          <Text style={tw`text-2xl font-bold text-slate-900`}>86%</Text>
          <Text style={tw`mt-1 text-xs text-slate-500`}>Reviewed on time</Text>
        </View>
        <View>
          <Text style={tw`text-2xl font-bold text-slate-900`}>42</Text>
          <Text style={tw`mt-1 text-xs text-slate-500`}>Completed this week</Text>
        </View>
      </View>
    </View>
  );
}
