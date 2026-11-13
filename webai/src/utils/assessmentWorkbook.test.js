import ExcelJS from 'exceljs'
import { createAssessmentWorkbook } from './assessmentWorkbook'

describe('assessment workbook', () => {
  it('exports complete assessment and symptom details in an Excel worksheet', async () => {
    const workbook = createAssessmentWorkbook(ExcelJS, [{
      id: 'assessment-1',
      patient_name: 'Patient One',
      created_at: '2026-11-11T12:00:00Z',
      age: 34,
      gender: 'Female',
      pregnant: false,
      temperature: 38.2,
      blood_pressure: '120/80',
      symptoms: 'chills, vomiting, fatigue, high fever, headache, nausea, constipation',
      disease: 'Example result',
      confidence: 0.875,
      recommendation: 'Review with a healthcare professional.',
      nurse_name: 'Nurse One',
      model_version: 'model-v1',
      sync_status: 'synced',
    }])

    const buffer = await workbook.xlsx.writeBuffer()
    const exportedWorkbook = await new ExcelJS.Workbook().xlsx.load(buffer)
    const worksheet = exportedWorkbook.getWorksheet('Assessment records')
    const headers = worksheet.getRow(1).values
    const values = worksheet.getRow(2).values

    expect(headers).toContain('Symptoms')
    expect(headers).toContain('Assessed by')
    expect(values[1]).toBe('Patient One')
    expect(values[8]).toBe('chills, vomiting, fatigue, high fever, headache, nausea, constipation')
    expect(values[12]).toBe('Nurse One')
    expect(headers).not.toContain('Model version')
    expect(worksheet.getRow(2).getCell(13).value).toBe('synced')
    expect(worksheet.autoFilter).toBe('A1:M1')
    expect(worksheet.views[0].ySplit).toBe(1)
  })

  it('keeps symptom strings as text instead of spreadsheet formulas', () => {
    const workbook = createAssessmentWorkbook(ExcelJS, [{
      symptoms: '=HYPERLINK("https://example.test","open")',
    }])

    const symptomCell = workbook.getWorksheet('Assessment records').getRow(2).getCell(8)
    expect(symptomCell.value).toBe('=HYPERLINK("https://example.test","open")')
    expect(symptomCell.type).toBe(ExcelJS.ValueType.String)
    expect(symptomCell.formula).toBeUndefined()
  })

  it('omits recommendations from village health worker workbooks', () => {
    const workbook = createAssessmentWorkbook(ExcelJS, [{
      patient_name: 'Primary patient',
      recommendation: 'Nurse-only recommendation',
      nurse_name: 'Health Worker One',
      sync_status: 'synced',
    }], 'primary_healthcare')
    const worksheet = workbook.getWorksheet('Assessment records')
    const headers = worksheet.getRow(1).values
    const values = worksheet.getRow(2).values

    expect(headers).not.toContain('Recommendation')
    expect(values).not.toContain('Nurse-only recommendation')
    expect(values[11]).toBe('Health Worker One')
    expect(values[12]).toBe('synced')
    expect(worksheet.autoFilter.to).toEqual({ row: 1, column: 12 })
  })
})
