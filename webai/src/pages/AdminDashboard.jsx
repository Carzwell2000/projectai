import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiClipboard,
  FiCpu,
  FiHeart,
  FiShield,
  FiUsers,
} from 'react-icons/fi'
import AssessmentActivityChart from '../components/charts/AssessmentActivityChart'
import AssessmentUsageByRoleChart from '../components/charts/AssessmentUsageByRoleChart'
import AssessmentsByNurseChart from '../components/charts/AssessmentsByNurseChart'
import DiseaseDistributionChart from '../components/charts/DiseaseDistributionChart'

function AdminDashboard({ analytics, loading, onNavigate }) {
  const totals = analytics?.totals || {}
  const dailyAssessments = analytics?.dailyAssessments || []
  const assessmentsByNurse = analytics?.assessmentsByNurse || []
  const assessmentUsageByRole = analytics?.assessmentUsageByRole || []
  const topDiseases = analytics?.topDiseases || []
  const assessmentData = dailyAssessments.map((item) => ({ x: item.label, y: item.value || 0 }))
  const diseaseData = topDiseases.map((item) => ({ x: item.label, y: item.value || 0 }))
  const commonResult = topDiseases[0]
  const pendingSync = Number(totals.pendingSync) || 0
  const conflicts = Number(totals.conflicts) || 0

  return (
    <div className="page-stack motion-dashboard admin-dashboard">
      <section className="nurse-dashboard-heading admin-dashboard-heading">
        <div>
          <p className="nurse-dashboard-eyebrow">CLINIC ADMINISTRATION</p>
          <h1>Clinic overview</h1>
          <p>Monitor patient records, staff activity, and clinic-wide assessment trends.</p>
        </div>
        <button className="button button-primary admin-manage-button" type="button" onClick={() => onNavigate('nurses')}>
          <FiUsers aria-hidden="true" /> Manage nurse accounts
        </button>
      </section>

      <section className="nurse-metric-row admin-dashboard-metrics" aria-label="Clinic totals">
        <article className="nurse-metric-card nurse-metric-green">
          <span className="nurse-metric-icon"><FiUsers aria-hidden="true" /></span>
          <div className="nurse-metric-content">
            <span className="nurse-metric-label">Registered patients</span>
            <strong>{loading ? '—' : totals.patients ?? 0}</strong>
            <span className="admin-metric-caption">Clinic-wide patient records</span>
          </div>
        </article>
        <article className="nurse-metric-card nurse-metric-blue">
          <span className="nurse-metric-icon"><FiClipboard aria-hidden="true" /></span>
          <div className="nurse-metric-content">
            <span className="nurse-metric-label">Saved assessments</span>
            <strong>{loading ? '—' : totals.assessments ?? 0}</strong>
            <span className="admin-metric-caption">Clinical reviews recorded</span>
          </div>
        </article>
        <article className="nurse-metric-card nurse-metric-purple">
          <span className="nurse-metric-icon"><FiShield aria-hidden="true" /></span>
          <div className="nurse-metric-content">
            <span className="nurse-metric-label">Nurse accounts</span>
            <strong>{loading ? '—' : totals.nurses ?? 0}</strong>
            <button type="button" onClick={() => onNavigate('nurses')}>Manage staff <FiArrowRight aria-hidden="true" /></button>
          </div>
        </article>
        <article className="nurse-metric-card nurse-metric-orange">
          <span className="nurse-metric-icon"><FiAlertCircle aria-hidden="true" /></span>
          <div className="nurse-metric-content">
            <span className="nurse-metric-label">Needs attention</span>
            <strong>{loading ? '—' : pendingSync + conflicts}</strong>
            <span className="admin-metric-caption">{loading ? 'Updating clinic status' : `${pendingSync} awaiting sync · ${conflicts} conflicts`}</span>
          </div>
        </article>
      </section>

      <section className="nurse-dashboard-panels admin-dashboard-panels">
        <article className="nurse-panel admin-chart-panel">
          <div className="nurse-panel-heading">
            <h2><FiActivity aria-hidden="true" /> Assessment activity</h2>
            <span>Last 7 days</span>
          </div>
          <AssessmentActivityChart data={assessmentData} loading={loading} />
        </article>

        <article className="nurse-panel admin-top-results">
          <div className="nurse-panel-heading">
            <h2><FiActivity aria-hidden="true" /> Common results</h2>
            <span>Saved assessments</span>
          </div>
          <DiseaseDistributionChart data={diseaseData} loading={loading} />
          <p className="admin-clinical-note"><FiAlertCircle aria-hidden="true" /> Results are informational, not diagnoses.</p>
        </article>
      </section>

      <section className="nurse-dashboard-panels admin-role-and-staff">
        <article className="nurse-panel admin-role-usage-panel">
          <div className="nurse-panel-heading">
            <h2><FiActivity aria-hidden="true" /> Assessment usage by role</h2>
            <span>All saved assessments</span>
          </div>
          <AssessmentUsageByRoleChart data={assessmentUsageByRole} loading={loading} />
        </article>

        <article className="nurse-panel admin-chart-panel admin-nurse-chart">
          <div className="nurse-panel-heading">
            <h2><FiUsers aria-hidden="true" /> Assessments by staff member</h2>
            <span>Clinic-wide totals</span>
          </div>
          <AssessmentsByNurseChart data={assessmentsByNurse} loading={loading} />
        </article>
      </section>

      <section className="nurse-insights-banner admin-insights-banner">
        <div className="nurse-insights-symbol"><FiCpu aria-hidden="true" /></div>
        <div className="nurse-insights-copy">
          <h2><FiHeart aria-hidden="true" /> Clinic insights</h2>
          <strong>{loading ? 'Loading clinic insights…' : commonResult ? `Most common result: ${commonResult.label}` : 'No results recorded yet'}</strong>
          <p>{commonResult ? `${commonResult.value} saved ${commonResult.value === 1 ? 'assessment' : 'assessments'} with this result. Review each case clinically.` : 'Results are decision support and are not diagnoses.'}</p>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
