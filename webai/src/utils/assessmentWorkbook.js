const columns = [
  { header: 'Patient', key: 'patient', width: 26 },
  { header: 'Assessment date', key: 'date', width: 23 },
  { header: 'Age', key: 'age', width: 10 },
  { header: 'Gender', key: 'gender', width: 18 },
  { header: 'Pregnancy', key: 'pregnancy', width: 18 },
  { header: 'Temperature (°C)', key: 'temperature', width: 19 },
  { header: 'Blood pressure', key: 'bloodPressure', width: 18 },
  { header: 'Symptoms', key: 'symptoms', width: 48 },
  { header: 'Result', key: 'result', width: 30 },
  { header: 'Confidence', key: 'confidence', width: 15 },
  { header: 'Recommendation', key: 'recommendation', width: 48 },
  { header: 'Assessed by', key: 'nurse', width: 26 },
  { header: 'Sync status', key: 'syncStatus', width: 18 },
]

function getValue(record, camel, snake) {
  return record?.[snake] ?? record?.[camel] ?? ''
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function formatPregnancy(value) {
  if (value === true || value === 1) return 'Yes'
  if (value === false || value === 0) return 'No'
  return value == null ? 'Not applicable' : String(value)
}

export function createAssessmentWorkbook(ExcelJS, assessments, staffGroup) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Clinic AI'
  workbook.created = new Date()
  const worksheet = workbook.addWorksheet('Assessment records')
  const workbookColumns = staffGroup === 'primary_healthcare'
    ? columns.filter((column) => column.key !== 'recommendation')
    : columns
  worksheet.columns = workbookColumns
  worksheet.addRows(assessments.map((assessment) => ({
    patient: getValue(assessment, 'patientName', 'patient_name') || 'Patient record',
    date: formatDate(getValue(assessment, 'createdAt', 'created_at')),
    age: assessment.age ?? '',
    gender: assessment.gender || '',
    pregnancy: formatPregnancy(assessment.pregnant),
    temperature: assessment.temperature ?? '',
    bloodPressure: getValue(assessment, 'bloodPressure', 'blood_pressure'),
    symptoms: assessment.symptoms || '',
    result: assessment.disease || 'Review recommended',
    confidence: assessment.confidence ?? '',
    recommendation: assessment.recommendation || '',
    nurse: getValue(assessment, 'nurseName', 'nurse_name') || 'Unknown nurse',
    syncStatus: getValue(assessment, 'syncStatus', 'sync_status'),
  })))

  const header = worksheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF087C70' } }
  header.height = 24
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: workbookColumns.length },
  }
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.getColumn('confidence').numFmt = '0.0%'

  return workbook
}

export async function downloadAssessmentWorkbook(assessments, staffGroup) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = createAssessmentWorkbook(ExcelJS, assessments, staffGroup)
  const buffer = await workbook.xlsx.writeBuffer()
  const file = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `clinic-assessments-${staffGroup}-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
