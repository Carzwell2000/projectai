import { useState } from "react";
import { LineChart as GiftedLineChart } from "react-native-gifted-charts";
import { Text, View } from "react-native";
import tw from "twrnc";

export type AreaChartPoint = { label: string; value: number };
export type AreaChartSeries = {
  label: string;
  color: string;
  fillColor: string;
  data: AreaChartPoint[];
};

export default function Area({ series }: { series: AreaChartSeries[] }) {
  const [size, setSize] = useState({ width: 0, height: 220 });
  const yAxisLabelWidth = 32;
  const initialSpacing = 8;
  const endSpacing = 10;
  const chartWidth = Math.max(0, size.width - yAxisLabelWidth - 1);
  const dataLength = series[0]?.data.length ?? 0;
  const spacing = chartWidth > 0 && dataLength > 1
    ? Math.max(12, (chartWidth - initialSpacing - endSpacing) / (dataLength - 1))
    : 40;
  const maximum = Math.max(4, ...series.flatMap((item) => item.data.map((point) => point.value)));
  const step = Math.ceil(maximum / 4);

  return (
    <View
      style={{ width: "100%", height: 220, overflow: "hidden" }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height: Math.max(150, height - 52) });
      }}
    >
      {dataLength === 0 ? (
        <Text style={tw`py-10 text-center text-sm text-slate-500`}>No assessment activity yet.</Text>
      ) : (
        <GiftedLineChart
          dataSet={series.map((item, seriesIndex) => ({
            data: item.data.map((point) => ({
              ...point,
              dataPointText: String(point.value),
              textColor: item.color,
              textFontSize: 9,
              textShiftY: (seriesIndex - 1) * 9,
            })),
            color: item.color,
            thickness: 2.5,
            dataPointsColor: item.color,
            dataPointsRadius: 3,
            areaChart: true,
            curved: true,
            startFillColor: item.fillColor,
            endFillColor: "#FFFFFF",
            startOpacity: 0.25,
            endOpacity: 0.02,
            textColor: item.color,
            textFontSize: 9,
          }))}
          width={chartWidth || undefined}
          height={size.height}
          spacing={spacing}
          initialSpacing={initialSpacing}
          endSpacing={endSpacing}
          disableScroll
          showValuesAsDataPointsText
          maxValue={step * 4}
          noOfSections={4}
          stepValue={step}
          yAxisLabelWidth={yAxisLabelWidth}
          yAxisColor="#CBD5E1"
          yAxisThickness={1}
          yAxisTextStyle={{ color: "#64748B", fontSize: 10 }}
          xAxisColor="#CBD5E1"
          xAxisThickness={1}
          xAxisLabelTextStyle={{ color: "#64748B", fontSize: 10, fontWeight: "600" }}
          rulesColor="#E2E8F0"
          rulesThickness={1}
        />
      )}
      <View style={tw`mt-1 flex-row flex-wrap justify-center gap-x-4 gap-y-2`}>
        {series.map((item) => (
          <View key={item.label} style={tw`flex-row items-center`}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
            <Text style={tw`ml-1.5 text-[10px] font-medium text-slate-600`}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
