import { FiActivity, FiArrowRight, FiArrowUpRight, FiClock, FiShield, FiUsers } from 'react-icons/fi'
import WeeklyAssessmentsChart from '../components/charts/WeeklyAssessmentsChart'

function field(record, camel, snake) {
	return record?.[camel] ?? record?.[snake] ?? ''
}

function Dashboard({ assessments, patients, loading, onNavigate, onRefresh, nurseId, isPrimaryHealthcare }) {
	const today = new Date().toDateString()
	const todayCount = assessments.filter((item) => {
		const date = new Date(field(item, 'createdAt', 'created_at'))
		return !Number.isNaN(date.getTime()) && date.toDateString() === today
	}).length
	const pendingCount = assessments.filter((item) => field(item, 'syncStatus', 'sync_status') !== 'synced').length

	const weeklyAssessmentData = Array.from({ length: 7 }, (_, index) => {
		const date = new Date()
		date.setDate(date.getDate() - (6 - index))
		const key = date.toISOString().slice(0, 10)
		const count = assessments.filter((item) => {
			const itemNurse = field(item, 'nurseId', 'nurse_id')
			if (nurseId && itemNurse && itemNurse !== nurseId) return false
			const createdAt = field(item, 'createdAt', 'created_at')
			if (!createdAt) return false
			return createdAt.slice(0, 10) === key
		}).length
		return { x: date.toLocaleDateString([], { weekday: 'short' }), y: count }
	})

	return (
		<div className="page-stack motion-dashboard">
			<section className="page-heading dashboard-heading">
				<div>
					<p className="eyebrow">{isPrimaryHealthcare ? 'PRIMARY HEALTHCARE WORKSPACE' : 'NURSING WORKSPACE'}</p>
					<h1>{isPrimaryHealthcare ? 'Primary health overview' : 'Your care overview'}</h1>
					<p className="muted">Review your activity or start a patient assessment.</p>
				</div>
				<button className="button button-secondary" type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh overview">
					<FiClock aria-hidden="true" /> Refresh
				</button>
			</section>

			<section className="metric-row" aria-label="Workspace summary">
				<article className="metric-block metric-green">
					<span className="metric-label">Registered patients</span>
					<strong>{loading ? '—' : patients.length}</strong>
					<button type="button" onClick={() => onNavigate('patients')}>View patients <FiArrowUpRight aria-hidden="true" /></button>
				</article>
				<article className="metric-block metric-peach">
					<span className="metric-label">Assessments today</span>
					<strong>{loading ? '—' : todayCount}</strong>
					<button type="button" onClick={() => onNavigate('records')}>View records <FiArrowUpRight aria-hidden="true" /></button>
				</article>
				<article className="metric-block metric-blue">
					<span className="metric-label">Saved assessments</span>
					<strong>{loading ? '—' : assessments.length}</strong>
					<span className="metric-foot">{pendingCount} awaiting sync</span>
				</article>
			</section>

			<section className="dashboard-lower">
				<div className="section-block recent-block">
					<div className="section-heading">
						<div>
							<p className="eyebrow">RECENT ACTIVITY</p>
							<h2>Assessments this week</h2>
						</div>
					</div>
					<WeeklyAssessmentsChart data={weeklyAssessmentData} />
				</div>

				<aside className="quick-actions dashboard-guide" aria-labelledby="dashboard-guide-title">
					<p className="eyebrow">GETTING STARTED</p>
					<h2 id="dashboard-guide-title">What to do next</h2>
					<button className="quick-action" type="button" onClick={() => onNavigate('assessment')}>
						<span className="quick-icon"><FiActivity aria-hidden="true" /></span>
						<span><strong>1. Assess a patient</strong><small>Enter symptoms and vital signs.</small></span>
						<FiArrowRight aria-hidden="true" />
					</button>
					<button className="quick-action" type="button" onClick={() => onNavigate('records')}>
						<span className="quick-icon"><FiUsers aria-hidden="true" /></span>
						<span><strong>2. Review the record</strong><small>Check the result and clinical context.</small></span>
						<FiArrowRight aria-hidden="true" />
					</button>
					<p className="privacy-note"><FiShield aria-hidden="true" /> Decision support only. Review results in context; do not use them as a substitute for clinical judgment.</p>
				</aside>
			</section>
		</div>
	)
}

export default Dashboard
