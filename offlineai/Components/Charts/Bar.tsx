import { useState } from "react";
import { LineChart as GiftedLineChart } from "react-native-gifted-charts";
import { View } from "react-native";

export type BarChartPoint = {
	label: string;
	value: number;
};

export default function Bar({ data }: { data: BarChartPoint[] }) {
	const [chartSize, setChartSize] = useState({ width: 0, height: 220 });
	const yAxisLabelWidth = 36;
	const yAxisThickness = 1;
	const initialSpacing = 10;
	const endInset = 14;
	const lineColor = "#0EA5E9";
	const chartSpacing = chartSize.width > 10 && data.length > 1
		? (chartSize.width - initialSpacing - endInset) / (data.length - 1)
		: 40;
	const chartMaximum = Math.max(4, ...data.map((point) => point.value));
	const chartStep = Math.ceil(chartMaximum / 4);

	return (
		<View
			style={{ flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}
			onLayout={(event) => {
				const { width, height } = event.nativeEvent.layout;
				setChartSize({
					width: Math.max(0, width - yAxisLabelWidth - yAxisThickness),
					height: Math.max(160, height - 56),
				});
			}}
		>
			<GiftedLineChart
				data={data}
				color={lineColor}
				thickness={3}
				dataPointsColor={lineColor}
				dataPointsRadius={4.5}
				curved
				areaChart
				startFillColor="#7DD3FC"
				endFillColor="#FFFFFF"
				startOpacity={0.24}
				endOpacity={0.02}
				width={chartSize.width || undefined}
				height={chartSize.height}
				disableScroll
				spacing={chartSpacing}
				maxValue={chartStep * 4}
				noOfSections={4}
				stepValue={chartStep}
				xAxisColor="#E2E8F0"
				xAxisThickness={1}
				yAxisColor="#E2E8F0"
				yAxisThickness={yAxisThickness}
				yAxisLabelWidth={yAxisLabelWidth}
				yAxisTextStyle={{ color: "#475569", fontSize: 11 }}
				xAxisLabelTextStyle={{ color: "#475569", fontSize: 11, fontWeight: "600" }}
				rulesColor="#E2E8F0"
				rulesThickness={1}
				rulesType="solid"
				initialSpacing={initialSpacing}
				endSpacing={0}
			/>
		</View>
	);
}
