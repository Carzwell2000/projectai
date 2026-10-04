import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  ColumnSeries,
  Tooltip,
  Category,
  DataLabel,
} from '@syncfusion/ej2-react-charts'
import { getIntegerAxisInterval, normalizeCountData } from './chartScale'

function AssessmentsByNurseChart({ data, loading }) {
  if (!data.length) {
    return <div className="admin-chart-empty">{loading ? 'Loading nurse totals…' : 'No nurse assessments recorded yet.'}</div>
  }
  const chartData = normalizeCountData(data.map((item) => ({ x: item.label, y: item.value })))

  return (
    <ChartComponent
      id="assessments-by-nurse-chart"
      background="transparent"
      chartArea={{ border: { width: 0 }, background: 'transparent' }}
      primaryXAxis={{ valueType: 'Category', labelStyle: { color: '#71827a', size: '11px', fontFamily: 'Aptos, Segoe UI, sans-serif' }, majorGridLines: { width: 0 }, majorTickLines: { width: 0 }, axisLineStyle: { width: 0 } }}
      primaryYAxis={{ minimum: 0, interval: getIntegerAxisInterval(chartData), rangePadding: 'Round', labelFormat: 'N0', labelStyle: { color: '#71827a', size: '11px', fontFamily: 'Aptos, Segoe UI, sans-serif' }, majorGridLines: { width: 1, color: '#e8efeb', dashArray: '4,4' }, majorTickLines: { width: 0 }, axisLineStyle: { width: 0 } }}
      tooltip={{ enable: true, fill: '#183b34', textStyle: { color: '#ffffff' }, border: { color: '#183b34', width: 1 } }}
      width="100%"
      height="280"
      legendSettings={{ visible: false }}
    >
      <Inject services={[ColumnSeries, Tooltip, Category, DataLabel]} />
      <SeriesCollectionDirective>
        <SeriesDirective dataSource={chartData} xName="x" yName="y" type="Column" name="Assessments" fill="#258c73" />
      </SeriesCollectionDirective>
    </ChartComponent>
  )
}

export default AssessmentsByNurseChart