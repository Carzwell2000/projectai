import { Text, View } from "react-native";
import tw from "twrnc";

export type SymptomTrendPoint = {
  label: string;
  value: number;
};

type SymptomTrendChartProps = {
  data: SymptomTrendPoint[];
  color?: string;
};

export default function SymptomTrendChart({ data, color = "#0F766E" }: SymptomTrendChartProps) {
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const chartHeight = 160;
  const chartWidth = 300;
  const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  return (
    <View>
      <View style={tw`flex-row`}>
        <View style={tw`h-40 w-8 justify-between pb-5 pt-1`}>
          <Text style={tw`text-[10px] text-slate-400`}>{maxValue}</Text>
          <Text style={tw`text-[10px] text-slate-400`}>{Math.round(maxValue / 2)}</Text>
          <Text style={tw`text-[10px] text-slate-400`}>0</Text>
        </View>
        <View style={tw`h-40 flex-1 overflow-visible`}>
          <View style={tw`absolute inset-x-0 top-0 border-t border-slate-100`} />
          <View style={tw`absolute inset-x-0 top-1/2 border-t border-slate-100`} />
          <View style={tw`absolute inset-x-0 bottom-5 border-t border-slate-100`} />
          {data.map((point, index) => {
            const x = data.length > 1 ? (index / (data.length - 1)) * 100 : 50;
            const y = chartHeight - 20 - (point.value / maxValue) * (chartHeight - 36);
            return (
              <View key={`${point.label}-${index}`} style={[tw`absolute`, { left: `${x}%`, top: y - 5 }]}>
                {index > 0 ? (
                  <View style={[tw`absolute h-[2px] rounded-full`, { backgroundColor: color, width: step, left: -step, transform: [{ rotate: `${getSegmentAngle(data[index - 1].value, point.value, step, chartHeight - 36, maxValue)}deg` }] }]} />
                ) : null}
                <View style={[tw`h-3 w-3 rounded-full border-2 border-white`, { backgroundColor: color }]} />
              </View>
            );
          })}
          <View style={tw`absolute inset-x-0 bottom-0 flex-row justify-between`}>
            {data.map((point) => <Text key={point.label} style={tw`text-[10px] text-slate-400`}>{point.label}</Text>)}
          </View>
        </View>
      </View>
    </View>
  );
}

function getSegmentAngle(previousValue: number, currentValue: number, width: number, height: number, maxValue: number) {
  const rise = ((previousValue - currentValue) / maxValue) * height;
  return Math.atan2(rise, width) * (180 / Math.PI);
}
