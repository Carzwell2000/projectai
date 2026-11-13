import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { act, Simulate } from 'react-dom/test-utils'
import Asses from './Asses'

describe('Asses', () => {
  it('keeps entered assessment values when returning from results', async () => {
    const patients = [{
      id: 'p1',
      name: 'John Smith',
      dateOfBirth: '1990-05-20',
      gender: 'Male',
    }]
    const onSubmit = jest.fn().mockResolvedValue({ disease: 'Malaria' })

    function AssessmentHarness() {
      const [draft, setDraft] = useState({
        patientId: 'p1',
        age: '36',
        gender: 'Male',
        pregnant: '',
        temperature: '38.2',
        bloodPressure: '120/80',
        symptoms: 'fever and chills',
      })
      const [showResults, setShowResults] = useState(false)

      return showResults ? (
        <button type="button" onClick={() => setShowResults(false)}>Back to assessment</button>
      ) : (
        <Asses
          patients={patients}
          draft={draft}
          onDraftChange={(updates) => setDraft((current) => ({ ...current, ...updates }))}
          onSubmit={onSubmit}
          onComplete={() => setShowResults(true)}
        />
      )
    }

    const container = document.createElement('div')
    document.body.appendChild(container)
    act(() => {
      ReactDOM.render(<AssessmentHarness />, container)
    })

    await act(async () => {
      Simulate.submit(container.querySelector('form'))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(container.textContent).toContain('Back to assessment')
    act(() => Simulate.click(container.querySelector('button')))

    expect(container.querySelector('select[name="patientId"]').value).toBe('p1')
    expect(container.querySelector('input[name="age"]').value).toBe('36')
    expect(container.querySelector('input[name="temperature"]').value).toBe('38.2')
    expect(container.querySelector('input[name="bloodPressure"]').value).toBe('120/80')
    expect(container.querySelector('textarea[name="symptoms"]').value).toBe('fever and chills')
    expect(onSubmit).toHaveBeenCalledTimes(1)

    act(() => {
      ReactDOM.unmountComponentAtNode(container)
    })
    container.remove()
  })
})
