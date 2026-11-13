import {
  AccumulationChartComponent,
  AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective,
  Inject,
  PieSeries,
  AccumulationTooltip,
  AccumulationDataLabel,
} from '@syncfusion/ej2-react-charts'

function AssessmentUsageByRoleChart({ data, loading }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (!total) {
    return <div className="admin-chart-empty">{loading ? 'Loading staff usage…' : 'No staff assessments recorded yet.'}</div>
  }

  const chartData = data.map((item) => ({
    ...item,
    percentage: `${Math.round((item.value / total) * 100)}%`,
    chartLabel: `${item.role === 'primary_healthcare' ? 'PHW' : 'Nurse'} ${Math.round((item.value / total) * 100)}%`,
    color: item.role === 'nurse' ? '#11b98c' : '#8255d5',
  }))

  return (
    <div className="admin-role-usage">
      <AccumulationChartComponent
        id="assessment-usage-by-role-chart"
        background="transparent"
        width="100%"
        height="230"
        tooltip={{ enable: true, textStyle: { color: '#ffffff' }, fill: '#183b34' }}
        legendSettings={{ visible: false }}
      >
        <Inject services={[PieSeries, AccumulationTooltip, AccumulationDataLabel]} />
        <AccumulationSeriesCollectionDirective>
          <AccumulationSeriesDirective
            dataSource={chartData}
            xName="label"
            yName="value"
            pointColorMapping="color"
            innerRadius="0%"
            border={{ color: '#ffffff', width: 3 }}
            dataLabel={{
              visible: true,
              name: 'chartLabel',
              position: 'Inside',
              font: { color: '#ffffff', fontWeight: '700', size: '11px' },
            }}
          />
        </AccumulationSeriesCollectionDirective>
      </AccumulationChartComponent>
      <div className="admin-role-usage-legend" aria-label="Assessment usage percentages by staff role">
        {chartData.map((item) => (
          <div className="admin-role-usage-item" key={item.role}>
            <span className="admin-role-usage-dot" style={{ backgroundColor: item.color }} />
            <span className="admin-role-usage-name">{item.label}</span>
            <strong>{item.percentage}</strong>
            <small>{item.value} {item.value === 1 ? 'assessment' : 'assessments'}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AssessmentUsageByRoleChart
