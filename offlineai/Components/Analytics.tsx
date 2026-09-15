import { Text, View } from "react-native";
import tw from "twrnc";

export type SymptomTrendPoint = { label: string; value: number };

export default function Analytics({ data }: { data: SymptomTrendPoint[] }) {
  const maximum = Math.max(...data.map((point) => point.value), 1);

  return (
    <View style={tw`flex-row items-end justify-between`}>
      {data.map((point) => (
        <View key={point.label} style={tw`items-center`}>
          <View style={tw`h-32 w-6 justify-end rounded-t-lg bg-slate-100`}>
            <View style={[tw`w-full rounded-t-lg bg-teal-600`, { height: `${(point.value / maximum) * 100}%` }]} />
          </View>
          <Text style={tw`mt-2 text-[10px] text-slate-500`}>{point.label}</Text>
        </View>
      ))}
    </View>
  );
}

