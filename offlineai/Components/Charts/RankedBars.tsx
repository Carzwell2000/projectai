import { useState } from "react";
import { BarChart } from "react-native-gifted-charts";
import { ScrollView, Text, View } from "react-native";
import tw from "twrnc";

export type RankedBarPoint = { label: string; value: number };

export default function RankedBars({ data }: { data: RankedBarPoint[] }) {
  const [availableWidth, setAvailableWidth] = useState(0);
  const maximum = Math.max(4, ...data.map((point) => point.value));
  const step = Math.ceil(maximum / 4);
  const chartWidth = Math.max(availableWidth, data.length * 56 + 40);
  if (data.length === 0) return <Text style={tw`mt-4 text-sm text-slate-500`}>No data available yet.</Text>;

  return (
    <View
      style={tw`mt-4`}
      onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <BarChart
          data={data.map((point) => ({ ...point, frontColor: "#0F766E" }))}
          width={chartWidth}
          height={240}
          barWidth={24}
          spacing={28}
          initialSpacing={12}
          endSpacing={12}
          maxValue={step * 4}
          noOfSections={4}
          stepValue={step}
          showValuesAsTopLabel
          topLabelTextStyle={{ color: "#334155", fontSize: 10, fontWeight: "600" }}
          yAxisLabelWidth={32}
          yAxisColor="#CBD5E1"
          yAxisThickness={1}
          yAxisTextStyle={{ color: "#64748B", fontSize: 10 }}
          xAxisColor="#CBD5E1"
          xAxisThickness={1}
          xAxisTextNumberOfLines={2}
          xAxisLabelTextStyle={{ color: "#475569", fontSize: 9, fontWeight: "500" }}
          labelWidth={52}
          rulesColor="#E2E8F0"
          rulesThickness={1}
          isAnimated
        />
      </ScrollView>
    </View>
  );
}
