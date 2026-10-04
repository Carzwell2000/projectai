import { FiAlertCircle, FiClock, FiUser } from 'react-icons/fi'
import DiseaseExplanationCard from './DiseaseExplanationCard'

function AssessmentResult({ result, explanation, explanationPending, explanationError, selectedPatientAge }) {
  if (!result) return null
  const hasSupportedPrediction = result.status === 'prediction' && (result.confidence || 0) >= 0.01
  const explainedDiseases = hasSupportedPrediction
    ? (explanation?.predictedDiseases || []).filter((disease) =>
      (disease.confidence || 0) >= 0.01
      && (disease.features || []).some((feature) =>
        feature.direction === 'supports' && !feature.feature.toLowerCase().includes('temperature')))
    : []
  const hasSymptomSupportedPrediction = explainedDiseases.some((disease) => disease.disease === result.disease)

  return (
    <section className="result-panel" aria-live="polite">
      <div className="result-heading">
        <h2>Assessment result</h2>
      </div>

      <div className="result-card patient-card">
        <div className="patient-card-header">
          <div>
            <p className="eyebrow tiny">PATIENT ENCOUNTER</p>
            <h3>{result.patientName || 'Patient'}</h3>
          </div>
          <span className="patient-avatar"><FiUser aria-hidden="true" /></span>
        </div>
        <div className="vital-row">
          <div className="vital-box"><span>Age</span><strong>{result.age ?? selectedPatientAge ?? '—'} years</strong></div>
          <div className="vital-box"><span>Temperature</span><strong>{result.temperature ?? '—'} °C</strong></div>
          <div className="vital-box"><span>Blood pressure</span><strong>{result.bloodPressure || '—'}</strong></div>
        </div>
        <div className="symptom-box">
          <p className="eyebrow tiny">REPORTED SYMPTOMS</p>
          <p>{result.symptoms || 'No symptoms provided'}</p>
        </div>
      </div>

      {result.triage && (
        <section className={`triage-card triage-${result.triage.level}`} aria-label="Triage priority">
          <div className="triage-heading">
            <p className="eyebrow">TRIAGE PRIORITY</p>
            <span className="triage-icon" aria-hidden="true">
              {result.triage.level === 'routine' ? <FiClock /> : <FiAlertCircle />}
            </span>
          </div>
          <h3>{result.triage.level}</h3>
          <p className="triage-action">{result.triage.action}</p>
          <p className="triage-rationale">{result.triage.rationale}</p>
          {explanation?.clinicalSignals?.length > 0 && (
            <div className="triage-clinical-signals">
              {explanation.clinicalSignals.map((signal) => (
                <div className="triage-clinical-signal" key={`${signal.feature}-${signal.value}`}>
                  <strong>{signal.feature}: {signal.value}</strong>
                  <span>{signal.meaning}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {explanationPending && <p className="explanation-status" role="status">Loading model explanations…</p>}
      {explanationError && <p className="form-error" role="status">Assessment saved. Explanation unavailable: {explanationError}</p>}
      <section className="disease-explanations" aria-label="Model disease explanations">
        {explainedDiseases.length ? (
          explainedDiseases.map((disease) => <DiseaseExplanationCard disease={disease} key={disease.disease} />)
        ) : (
          <DiseaseExplanationCard disease={{
          disease: hasSymptomSupportedPrediction ? result.disease : 'Insufficient evidence',
            confidence: hasSymptomSupportedPrediction ? result.confidence : 0,
            recommendation: hasSymptomSupportedPrediction
              ? result.recommendation || 'Review this result with a qualified healthcare professional.'
              : result.recommendation || 'The reported symptoms do not provide enough evidence for a reliable match. Record more specific symptoms and review the case with a qualified healthcare professional.',
            features: hasSymptomSupportedPrediction ? explanation?.features || [] : [],
          }} />
        )}
        </section>
    </section>
  )
}

export default AssessmentResult
