import { FiArrowUpRight, FiClock, FiPlus, FiUsers } from 'react-icons/fi'
import WeeklyAssessmentsChart from '../components/charts/WeeklyAssessmentsChart'

function field(record, camel, snake) {
	return record?.[camel] ?? record?.[snake] ?? ''
}

function formatDate(value) {
	if (!value) return 'Date unavailable'
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function Dashboard({ assessments, patients, loading, onNavigate, onRefresh, nurseId }) {
	const latest = assessments.slice(0, 5)
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
		<div className="page-stack">
			<section className="page-heading dashboard-heading">
				<div>
					
					<h1>NURSE DASHBOARD</h1>
				
				</div>
				<button className="button button-secondary" type="button" onClick={onRefresh} disabled={loading}>
					<FiClock aria-hidden="true" /> 
				</button>
			</section>

			<section className="metric-row" aria-label="Workspace summary">
				<article className="metric-block metric-green">
					<span className="metric-label">Registered patients</span>
					<strong>{loading ? '—' : patients.length}</strong>
					<button type="button" onClick={() => onNavigate('patients')}>See <FiArrowUpRight aria-hidden="true" /></button>
				</article>
				<article className="metric-block metric-peach">
					<span className="metric-label">Your Assessments today</span>
					<strong>{loading ? '—' : todayCount}</strong>
					<button type="button" onClick={() => onNavigate('records')}>See <FiArrowUpRight aria-hidden="true" /></button>
				</article>
				<article className="metric-block metric-blue">
					<span className="metric-label">Your Saved assessments</span>
					<strong>{loading ? '—' : assessments.length}</strong>
					<span className="metric-foot">{pendingCount} awaiting sync</span>
				</article>
			</section>

			<section className="dashboard-lower">
			

				<div className="section-block recent-block">
					<div className="section-heading">
						<div><h2>Your weekly Assessments</h2></div>
					</div>
					<WeeklyAssessmentsChart data={weeklyAssessmentData} />
				</div>
				
			</section>
		</div>
	)
}

export default Dashboard
