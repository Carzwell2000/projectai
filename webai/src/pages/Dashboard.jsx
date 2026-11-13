import {
	FiActivity,
	FiArrowRight,
	FiCalendar,
	FiClipboard,
	FiCpu,
	FiHeart,
	FiPlus,
	FiRefreshCw,
	FiUsers,
} from 'react-icons/fi'
import WeeklyAssessmentsChart from '../components/charts/WeeklyAssessmentsChart'

function field(record, camel, snake) {
	return record?.[camel] ?? record?.[snake] ?? ''
}

function dateKey(date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function Dashboard({
	assessments,
	patients,
	loading,
	onNavigate,
	onRefresh,
	nurseId,
	isPrimaryHealthcare,
	syncStatus,
}) {
	const today = new Date().toDateString()
	const todayCount = assessments.filter((item) => {
		const date = new Date(field(item, 'createdAt', 'created_at'))
		return !Number.isNaN(date.getTime()) && date.toDateString() === today
	}).length
	const pendingCount = syncStatus
		? (syncStatus.pending || 0) + (syncStatus.conflicts || 0)
		: assessments.filter((item) => field(item, 'syncStatus', 'sync_status') !== 'synced').length

	const weeklyAssessmentData = Array.from({ length: 7 }, (_, index) => {
		const date = new Date()
		date.setDate(date.getDate() - (6 - index))
		const key = dateKey(date)
		const count = assessments.filter((item) => {
			const itemNurse = field(item, 'nurseId', 'nurse_id')
			if (nurseId && itemNurse && itemNurse !== nurseId) return false
			const createdAt = field(item, 'createdAt', 'created_at')
			if (!createdAt) return false
			const createdDate = new Date(createdAt)
			return !Number.isNaN(createdDate.getTime()) && dateKey(createdDate) === key
		}).length
		return { x: date.toLocaleDateString([], { weekday: 'short' }), y: count }
	})

	const patientNameCounts = patients.reduce((counts, patient) => {
		const name = patient.name?.trim().toLowerCase()
		if (name) counts.set(name, (counts.get(name) || 0) + 1)
		return counts
	}, new Map())
	const assessedPatients = new Set(assessments
		.map((item) => field(item, 'patientName', 'patient_name').trim().toLowerCase())
		.filter((name) => name && patientNameCounts.get(name) === 1))
	const coveredPatients = patients.filter((patient) => assessedPatients.has(patient.name?.trim().toLowerCase())).length
	const patientsNeedingAssessment = Math.max(0, patients.length - coveredPatients)
	const coverage = patients.length ? Math.round((coveredPatients / patients.length) * 100) : 0
	const latestAssessment = assessments.reduce((latest, item) => {
		const date = new Date(field(item, 'createdAt', 'created_at'))
		if (Number.isNaN(date.getTime())) return latest
		return !latest || date > latest.date ? { item, date } : latest
	}, null)?.item
	const latestResult = latestAssessment?.disease || 'No saved assessment results yet'
	const dateLabel = new Date().toLocaleDateString([], {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})

	return (
		<div className="page-stack motion-dashboard nurse-dashboard">
			<section className="nurse-dashboard-heading">
				<div>
					<p className="nurse-dashboard-eyebrow">CLINICAL WORKSPACE</p>
					<h1>{isPrimaryHealthcare ? 'Village health worker dashboard' : 'Nurse dashboard'}</h1>
					<p>Monitor patient data and get AI-powered support.</p>
				</div>
				<div className="nurse-dashboard-tools">
					<span className="nurse-date"><FiCalendar aria-hidden="true" />{dateLabel}</span>
				</div>
			</section>

			<section className="nurse-metric-row" aria-label="Workspace summary">
				<article className="nurse-metric-card nurse-metric-green">
					<span className="nurse-metric-icon"><FiUsers aria-hidden="true" /></span>
					<div className="nurse-metric-content">
						<span className="nurse-metric-label">Registered patients</span>
						<strong>{loading ? '—' : patients.length}</strong>
						<button type="button" onClick={() => onNavigate('patients')}>View patients <FiArrowRight aria-hidden="true" /></button>
					</div>
				</article>
				<article className="nurse-metric-card nurse-metric-blue">
					<span className="nurse-metric-icon"><FiClipboard aria-hidden="true" /></span>
					<div className="nurse-metric-content">
						<span className="nurse-metric-label">Assessments today</span>
						<strong>{loading ? '—' : todayCount}</strong>
						<button type="button" onClick={() => onNavigate('records')}>View assessments <FiArrowRight aria-hidden="true" /></button>
					</div>
				</article>
				<article className="nurse-metric-card nurse-metric-purple">
					<span className="nurse-metric-icon"><FiActivity aria-hidden="true" /></span>
					<div className="nurse-metric-content">
						<span className="nurse-metric-label">Saved assessments</span>
						<strong>{loading ? '—' : assessments.length}</strong>
						<button type="button" onClick={() => onNavigate('records')}>View records <FiArrowRight aria-hidden="true" /></button>
					</div>
				</article>
				<article className="nurse-metric-card nurse-metric-orange">
					<span className="nurse-metric-icon"><FiRefreshCw aria-hidden="true" /></span>
					<div className="nurse-metric-content">
						<span className="nurse-metric-label">Awaiting sync</span>
						<strong>{loading ? '—' : pendingCount}</strong>
						<button type="button" onClick={onRefresh} disabled={loading}>Refresh status <FiArrowRight aria-hidden="true" /></button>
					</div>
				</article>
			</section>

			<section className="nurse-dashboard-panels">
				<article className="nurse-panel nurse-weekly-panel">
					<div className="nurse-panel-heading">
						<h2><FiActivity aria-hidden="true" /> Assessments this week</h2>
						<span>Last 7 days</span>
					</div>
					<WeeklyAssessmentsChart data={weeklyAssessmentData} />
				</article>
				<article className="nurse-panel nurse-overview-panel">
					<div className="nurse-panel-heading">
						<h2><FiActivity aria-hidden="true" /> Patient overview</h2>
					</div>
					<div className="nurse-patient-overview">
						<div
							className={`nurse-coverage-donut${patients.length ? '' : ' is-empty'}`}
							style={{ '--coverage': `${coverage}%` }}
							role="img"
							aria-label={`${coveredPatients} of ${patients.length} patients have a saved assessment`}
						>
							<div><strong>{loading ? '—' : patients.length}</strong><span>Patients</span></div>
						</div>
						<div className="nurse-coverage-legend">
							<div><span className="nurse-legend-dot is-assessed" /><span>With assessment</span><strong>{loading ? '—' : coveredPatients}</strong></div>
							<div><span className="nurse-legend-dot is-pending" /><span>Not yet assessed</span><strong>{loading ? '—' : patientsNeedingAssessment}</strong></div>
						</div>
					</div>
					<p className="nurse-overview-note">Based on saved records in your patient list.</p>
				</article>
			</section>

			{latestAssessment && (
				<section className="nurse-insights-banner">
					<div className="nurse-insights-symbol"><FiCpu aria-hidden="true" /></div>
					<div className="nurse-insights-copy">
						<h2><FiHeart aria-hidden="true" /> AI health insights</h2>
						<strong>Latest result: {latestResult}</strong>
						<p>AI results support clinical review and are not a diagnosis.</p>
					</div>
					<div className="nurse-insights-art" aria-hidden="true"><FiHeart /><FiPlus /></div>
				</section>
			)}
		</div>
	)
}

export default Dashboard
