import { useState } from "react";
import { PieChart as GiftedPieChart } from "react-native-gifted-charts";
import { Text, View } from "react-native";
import tw from "twrnc";

export type PieChartPoint = { label: string; value: number };

const chartColors = ["#0F766E", "#2563EB", "#F59E0B", "#DB2777", "#65A30D"];

export default function Pie({
  data,
  colors = chartColors,
  showPercentages = false,
  emptyMessage = "No prediction data yet.",
}: {
  data: PieChartPoint[];
  colors?: string[];
  showPercentages?: boolean;
  emptyMessage?: string;
}) {
  const [width, setWidth] = useState(0);
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const radius = Math.min(94, Math.max(60, (width - 36) / 2));

  if (data.length === 0 || total === 0) {
    return <Text style={tw`py-8 text-center text-sm text-slate-500`}>{emptyMessage}</Text>;
  }

  return (
    <View style={tw`w-full items-center`} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <GiftedPieChart
        data={data.map((point, index) => ({
          value: point.value,
          color: colors[index % colors.length],
          text: `${Math.round((point.value / total) * 100)}%`,
          textColor: "#FFFFFF",
          textSize: 11,
          fontWeight: "700",
        }))}
        radius={radius}
        showText
        textColor="#FFFFFF"
        textSize={11}
        fontWeight="700"
        isAnimated
        animationDuration={450}
      />
      <View style={tw`mt-3 w-full`}>
        {data.map((point, index) => (
          <View key={point.label} style={tw`mb-2 flex-row items-center`}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors[index % colors.length] }} />
            <Text numberOfLines={1} style={tw`ml-2 flex-1 text-xs text-slate-600`}>{point.label}</Text>
            {showPercentages ? (
              <Text style={tw`ml-2 text-xs font-bold text-slate-800`}>
                {Math.round((point.value / total) * 100)}%
              </Text>
            ) : null}
            <Text style={tw`ml-2 text-xs font-bold text-slate-800`}>{point.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
