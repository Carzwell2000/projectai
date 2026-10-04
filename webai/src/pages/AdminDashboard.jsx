import { FiActivity, FiAlertCircle, FiArrowUpRight, FiUsers } from 'react-icons/fi'
import AssessmentActivityChart from '../components/charts/AssessmentActivityChart'
import AssessmentsByNurseChart from '../components/charts/AssessmentsByNurseChart'
import DiseaseDistributionChart from '../components/charts/DiseaseDistributionChart'

function AdminDashboard({ analytics, loading, onNavigate }) {
  const totals = analytics?.totals || {}
  const dailyAssessments = analytics?.dailyAssessments || []
  const assessmentsByNurse = analytics?.assessmentsByNurse || []
  const topDiseases = analytics?.topDiseases || []
  const assessmentData = dailyAssessments.map((item) => ({ x: item.label, y: item.value || 0 }))
  const diseaseData = topDiseases.map((item) => ({ x: item.label, y: item.value || 0 }))

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><h1>ADMINISTRATOR DASHBOARD</h1></div>
        <button className="button button-secondary" type="button" onClick={() => onNavigate('nurses')}><FiUsers aria-hidden="true" /> Manage nurse accounts</button>
      </section>

      <section className="metric-row admin-metric-row" aria-label="Clinic totals">
        <article className="metric-block metric-green"><span className="metric-label">Registered patients</span><strong>{loading ? '—' : totals.patients ?? 0}</strong><span className="metric-foot">Local patient records</span></article>
        <article className="metric-block metric-peach"><span className="metric-label">Assessments</span><strong>{loading ? '—' : totals.assessments ?? 0}</strong><span className="metric-foot">Saved clinical reviews</span></article>
        <article className="metric-block metric-blue"><span className="metric-label">Nurse accounts</span><strong>{loading ? '—' : totals.nurses ?? 0}</strong><button type="button" onClick={() => onNavigate('nurses')}>Manage accounts <FiArrowUpRight aria-hidden="true" /></button></article>
        <article className="metric-block metric-alert"><span className="metric-label">Needs attention</span><strong>{loading ? '—' : totals.pendingSync ?? 0}</strong><span className="metric-foot">Records awaiting sync</span></article>
      </section>

      <section className="admin-analytics-grid">
        <article className="section-block admin-chart-panel">
          <div className="section-heading"><div><p className="eyebrow">LAST 7 DAYS</p><h2>Assessment activity</h2></div><FiActivity className="admin-panel-icon" aria-hidden="true" /></div>
          <AssessmentActivityChart data={assessmentData} loading={loading} />
        </article>

        <article className="section-block admin-top-results">
          <div className="section-heading"><div><p className="eyebrow">FROM SAVED ASSESSMENTS</p><h2>Common model results</h2></div></div>
          <DiseaseDistributionChart data={diseaseData} loading={loading} />
          <p className="admin-clinical-note"><FiAlertCircle aria-hidden="true" /> Model results are informational, not diagnoses.</p>
        </article>
      </section>

      <section className="section-block admin-chart-panel">
        <div className="section-heading">
          <div><p className="eyebrow">TOTAL ASSESSMENTS</p><h2>Assessments by nurse</h2></div>
          <FiUsers className="admin-panel-icon" aria-hidden="true" />
        </div>
        <AssessmentsByNurseChart data={assessmentsByNurse} loading={loading} />
      </section>
    </div>
  )
}

export default AdminDashboard