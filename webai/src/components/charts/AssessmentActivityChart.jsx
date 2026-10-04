import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  LineSeries,
  Tooltip,
  Category,
  DataLabel,
} from '@syncfusion/ej2-react-charts'
import { getIntegerAxisInterval, normalizeCountData } from './chartScale'

function AssessmentActivityChart({ data, loading }) {
  if (!data.length) {
    return <div className="admin-chart-empty">{loading ? 'Loading activity…' : 'No assessment activity yet.'}</div>
  }
  const chartData = normalizeCountData(data)

  return (
    <ChartComponent
      id="assessment-activity-chart"
      background="transparent"
      chartArea={{ border: { width: 0 }, background: 'transparent' }}
      primaryXAxis={{ valueType: 'Category', labelStyle: { color: '#71827a', size: '11px', fontFamily: 'Aptos, Segoe UI, sans-serif' }, majorGridLines: { width: 0 }, majorTickLines: { width: 0 }, axisLineStyle: { width: 0 } }}
      primaryYAxis={{ minimum: 0, interval: getIntegerAxisInterval(chartData), rangePadding: 'Round', labelFormat: 'N0', labelStyle: { color: '#71827a', size: '11px', fontFamily: 'Aptos, Segoe UI, sans-serif' }, majorGridLines: { width: 1, color: '#e8efeb', dashArray: '4,4' }, majorTickLines: { width: 0 }, axisLineStyle: { width: 0 } }}
      tooltip={{ enable: true, shared: true, fill: '#183b34', textStyle: { color: '#ffffff' }, border: { color: '#183b34', width: 1 } }}
      width="100%"
      height="260"
      legendSettings={{ visible: false }}
    >
      <Inject services={[LineSeries, Tooltip, Category, DataLabel]} />
      <SeriesCollectionDirective>
        <SeriesDirective dataSource={chartData} xName="x" yName="y" type="Line" name="All nurses" width={3} marker={{ visible: true, width: 8, height: 8, shape: 'Circle', fill: '#167663', border: { color: '#ffffff', width: 2 } }} fill="#167663" />
      </SeriesCollectionDirective>
    </ChartComponent>
  )
}

export default AssessmentActivityChart