import React from 'react'
import ReactDOM from 'react-dom'
import { act } from 'react-dom/test-utils'
import { downloadAssessmentWorkbook } from '../utils/assessmentWorkbook'
import Assesmentrecords from './Assesmentrecords'

jest.mock('../utils/assessmentWorkbook', () => ({
  downloadAssessmentWorkbook: jest.fn().mockResolvedValue(undefined),
}))

describe('Assesmentrecords', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container)
    })
    container.remove()
  })

  it('shows a table directly for nurse and village health worker records', () => {
    for (const staffRole of ['nurse', 'primary_healthcare']) {
      const patientName = `${staffRole} patient`
      act(() => {
        ReactDOM.render(
          <Assesmentrecords
            assessments={[{ id: staffRole, patient_name: patientName, staff_role: staffRole }]}
            loading={false}
          />,
          container,
        )
      })

      expect(container.querySelector('table')).not.toBeNull()
      expect(container.querySelector('.assessment-group-list')).toBeNull()
      expect(container.querySelector('tbody').textContent).toContain(patientName)
    }
  })

  it('opens each staff group on its own page and downloads only that group', async () => {
    const assessments = [
      { id: 'primary-1', patient_name: 'Primary patient', staff_role: 'primary_healthcare' },
      { id: 'nurse-1', patient_name: 'Nurse patient', staff_role: 'nurse' },
    ]

    act(() => {
      ReactDOM.render(<Assesmentrecords assessments={assessments} loading={false} isAdmin />, container)
    })

    expect(container.querySelectorAll('table')).toHaveLength(0)
    const primaryPageButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Village health worker assessments'))
    act(() => primaryPageButton.click())

    let table = container.querySelector('table')
    expect(table.textContent).toContain('Primary patient')
    expect(table.textContent).not.toContain('Nurse patient')

    await act(async () => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('Download Excel'))
        .click()
    })
    expect(downloadAssessmentWorkbook).toHaveBeenLastCalledWith([assessments[0]], 'primary_healthcare')

    act(() => container.querySelector('.page-heading .button-quiet').click())
    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('Nurse assessments'))
        .click()
    })

    table = container.querySelector('table')
    expect(table.textContent).toContain('Nurse patient')
    expect(table.textContent).not.toContain('Primary patient')
    await act(async () => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('Download Excel'))
        .click()
    })
    expect(downloadAssessmentWorkbook).toHaveBeenLastCalledWith([assessments[1]], 'nurse')
  })
})
