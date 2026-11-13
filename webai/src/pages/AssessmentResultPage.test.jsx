import React from 'react'
import ReactDOM from 'react-dom'
import { act } from 'react-dom/test-utils'
import AssessmentResultPage from './AssessmentResultPage'

describe('AssessmentResultPage role-specific details', () => {
  const result = {
    patientName: 'Test Patient',
    age: 30,
    temperature: 38,
    bloodPressure: '120/80',
    symptoms: 'headache',
    disease: 'Malaria',
    confidence: 0.4,
    status: 'prediction',
    recommendation: 'Review with a healthcare professional.',
    triage: {
      level: 'urgent',
      action: 'Arrange prompt review.',
      rationale: 'High temperature.',
    },
  }
  const explanation = {
    predictedDiseases: [{
      disease: 'Malaria',
      confidence: 0.4,
      recommendation: 'Review with a healthcare professional.',
      features: [{ feature: 'headache', contribution: 0.5, direction: 'supports' }],
    }],
  }

  function renderResult(isPrimaryHealthcare) {
    const container = document.createElement('div')
    act(() => {
      ReactDOM.render(
        <AssessmentResultPage
          result={result}
          explanation={explanation}
          explanationPending={false}
          explanationError=""
          onNavigate={() => {}}
          isPrimaryHealthcare={isPrimaryHealthcare}
        />,
        container,
      )
    })
    return container
  }

  it('shows triage and SHAP details for village health workers without the clinician-review message', () => {
    const container = renderResult(true)

    expect(container.textContent).toContain('Malaria')
    expect(container.textContent).not.toContain('Model confidence')
    expect(container.querySelector('.disease-confidence').textContent).toBe('40%')
    expect(container.textContent).toContain('Why was this disease predicted?')
    expect(container.textContent).toContain('Supports')
    expect(container.textContent).not.toContain('Pushed toward match')
    expect(container.textContent).not.toContain('These recorded factors influenced the model')
    expect(container.textContent).not.toContain('Decision support for clinician review')
    expect(container.textContent).toContain('TRIAGE PRIORITY')
    expect(container.textContent).toContain('urgent')
    expect(container.querySelector('.disease-feature-list')).not.toBeNull()

    act(() => {
      ReactDOM.unmountComponentAtNode(container)
    })
  })

  it('keeps model details and triage visible for nurses without the clinician-review message', () => {
    const container = renderResult(false)

    expect(container.textContent).not.toContain('Decision support for clinician review')
    expect(container.textContent).toContain('TRIAGE PRIORITY')
    expect(container.textContent).toContain('Why predicted this')
    expect(container.querySelector('.disease-confidence')).not.toBeNull()

    act(() => {
      ReactDOM.unmountComponentAtNode(container)
    })
  })
})
