import { useEffect, useState } from 'react'
import { FiActivity, FiAlertCircle } from 'react-icons/fi'
import { apiRequest } from '../api'

function Analysis({ assessments, patientCount }) {
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/api/model/catalog')
      .then((data) => { if (active) setCatalog(data) })
      .catch((loadError) => { if (active) setError(loadError.message) })
    return () => { active = false }
  }, [])

  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - 6)
  const recent = assessments.filter((assessment) => {
    const createdAt = new Date(assessment.createdAt || assessment.created_at)
    return !Number.isNaN(createdAt.getTime()) && createdAt >= cutoff
  })
  const symptomCounts = (catalog?.symptoms || []).map((symptom) => {
    const normalizedSymptom = normalizeText(symptom)
    const count = recent.filter((assessment) => normalizeText(assessment.symptoms).includes(normalizedSymptom)).length
    return { label: symptom, value: count }
  }).filter((item) => item.value > 0).sort((left, right) => right.value - left.value).slice(0, 8)
  const maxCount = Math.max(1, ...symptomCounts.map((item) => item.value))
  const diseaseCounts = recent.reduce((counts, assessment) => {
    if (assessment.disease) counts.set(assessment.disease, (counts.get(assessment.disease) || 0) + 1)
    return counts
  }, new Map())
  const topDiseases = [...diseaseCounts].map(([label, value]) => ({ label, value })).sort((left, right) => right.value - left.value).slice(0, 5)

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><p className="eyebrow">CLINICAL ACTIVITY</p><h1>Symptom analysis</h1><p className="muted">A view of recent saved assessments and the vocabulary provided by the trained model.</p></div>
      </section>
      {error && <div className="notice-bar" role="alert">Model vocabulary unavailable: {error}</div>}
      <section className="metric-row" aria-label="Analysis summary">
        <article className="metric-block metric-green"><span className="metric-label">Assessments, last 7 days</span><strong>{recent.length}</strong><span className="metric-foot">From saved clinical records</span></article>
        <article className="metric-block metric-peach"><span className="metric-label">Registered patients</span><strong>{patientCount}</strong><span className="metric-foot">Available in this workspace</span></article>
        <article className="metric-block metric-blue"><span className="metric-label">Model vocabulary</span><strong>{catalog ? catalog.symptoms.length : '—'}</strong><span className="metric-foot">Symptoms in model {catalog?.modelVersion || ''}</span></article>
      </section>
      <section className="analysis-grid">
        <article className="section-block admin-chart-panel">
          <div className="section-heading"><div><p className="eyebrow">LAST 7 DAYS</p><h2>Most reported model symptoms</h2></div><FiActivity className="admin-panel-icon" aria-hidden="true" /></div>
          {symptomCounts.length ? <div className="analysis-bars" role="img" aria-label="Most reported symptoms in the last seven days">
            {symptomCounts.map((item) => <div className="analysis-bar-row" key={item.label}>
              <span title={item.label}>{item.label.replaceAll('_', ' ')}</span><div className="analysis-bar-track"><span style={{ width: `${(item.value / maxCount) * 100}%` }} /></div><strong>{item.value}</strong>
            </div>)}
          </div> : <div className="admin-chart-empty">{recent.length ? 'No saved symptom text matched the model vocabulary.' : 'Recent symptom activity will appear here.'}</div>}
          <p className="admin-clinical-note"><FiAlertCircle aria-hidden="true" /> Counts reflect saved assessments and are not population-level estimates.</p>
        </article>
        <article className="section-block admin-top-results">
          <div className="section-heading"><div><p className="eyebrow">SAVED MODEL OUTPUTS</p><h2>Common results</h2></div></div>
          {topDiseases.length ? <ol className="admin-result-list">
            {topDiseases.map((item, index) => <li key={item.label}><span className="result-rank">{String(index + 1).padStart(2, '0')}</span><span className="result-name">{item.label}</span><strong>{item.value}</strong></li>)}
          </ol> : <div className="admin-chart-empty">No model results recorded in this period.</div>}
          <p className="analysis-catalog-note">Model {catalog?.modelVersion || '—'} · {catalog?.diseases.length ?? '—'} trained disease labels</p>
        </article>
      </section>
      <p className="page-disclaimer">These counts are operational summaries, not medical conclusions or diagnostic guidance.</p>
    </div>
  )
}

function normalizeText(value) {
  return String(value || '').toLocaleLowerCase().replaceAll('_', ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export default Analysis
