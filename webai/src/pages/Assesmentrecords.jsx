import { useMemo, useState } from 'react'
import { FiArrowLeft, FiClipboard, FiDownload, FiSearch } from 'react-icons/fi'
import DataTable from '../components/DataTable'
import { downloadAssessmentWorkbook } from '../utils/assessmentWorkbook'

function value(record, camel, snake) {
	return record?.[camel] ?? record?.[snake] ?? ''
}

function Assesmentrecords({ assessments, loading, isAdmin = false }) {
	const [query, setQuery] = useState('')
	const [activeGroup, setActiveGroup] = useState('')
	const [exporting, setExporting] = useState(false)
	const [exportError, setExportError] = useState('')
	const filtered = useMemo(() => assessments.filter((assessment) => {
		const text = `${value(assessment, 'patientName', 'patient_name')} ${assessment.disease || ''} ${assessment.symptoms || ''} ${assessment.nurse_name || ''}`.toLowerCase()
		return text.includes(query.trim().toLowerCase())
	}), [assessments, query])
	const primaryHealthcareAssessments = filtered.filter((assessment) => assessment.staff_role === 'primary_healthcare')
	const nurseAssessments = filtered.filter((assessment) => assessment.staff_role !== 'primary_healthcare')
	const groups = [
		{ key: 'primary_healthcare', title: 'Village health worker assessments', rows: primaryHealthcareAssessments },
		{ key: 'nurse', title: 'Nurse assessments', rows: nurseAssessments },
	]
	const currentGroup = groups.find((group) => group.key === activeGroup)

	async function handleExport() {
		setExporting(true)
		setExportError('')
		try {
			await downloadAssessmentWorkbook(currentGroup.rows, activeGroup)
		} catch (error) {
			setExportError(error instanceof Error ? error.message : 'Unable to export assessment records.')
		} finally {
			setExporting(false)
		}
	}

	const columns = [
		{ key: 'patient_name', label: 'Patient', render: (assessment) => <strong>{value(assessment, 'patientName', 'patient_name') || 'Patient record'}</strong> },
		{ key: 'disease', label: 'Result', render: (assessment) => assessment.disease || 'Review recommended' },
		{ key: 'confidence', label: 'Percentage', render: (assessment) => assessment.confidence == null ? '—' : `${Math.round(assessment.confidence * 100)}%`, sortValue: (assessment) => assessment.confidence ?? -1 },
		{ key: 'symptoms', label: 'Symptoms', className: 'symptoms-column', render: (assessment) => <span className="symptom-cell">{assessment.symptoms || '—'}</span> },
		{ key: 'nurse_name', label: 'Assessed by', render: (assessment) => assessment.nurse_name || 'Unknown nurse' },
		{ key: 'created_at', label: 'Date of assessment', render: (assessment) => {
			const createdAt = value(assessment, 'createdAt', 'created_at')
			return createdAt ? new Date(createdAt).toLocaleString() : '—'
		} },
		{ key: 'sync_status', label: 'Sync', render: (assessment) => {
			const status = value(assessment, 'syncStatus', 'sync_status')
			return <span className={`sync-state ${status === 'synced' ? 'is-synced' : ''}`}>{status === 'synced' ? 'Synced' : status === 'conflict' ? 'Conflict' : 'Pending Sync'}</span>
		} },
	]

	const staffRecordsSection = (
		<section className="section-block directory-block">
			<div className="table-toolbar">
				<div><h2>Assessment records</h2><span className="count-label">{filtered.length} records</span></div>
				<label className="search-field"><FiSearch aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, result, symptoms, or staff" aria-label="Search assessment records" /></label>
			</div>
			{filtered.length ? (
				<DataTable rows={filtered} columns={columns} />
			) : (
				<div className="empty-state"><span className="empty-icon"><FiClipboard aria-hidden="true" /></span><strong>{loading ? 'Loading assessment history…' : query ? 'No matching records' : 'No saved assessments yet'}</strong><p>{query ? 'Try another patient, result, symptom, or staff name.' : 'Once an assessment is completed, it will be available here.'}</p></div>
			)}
		</section>
	)

	return (
		<div className="page-stack">
			<section className="page-heading">
				<div>
					{currentGroup && <button className="button button-quiet" type="button" onClick={() => { setActiveGroup(''); setQuery('') }}><FiArrowLeft aria-hidden="true" />All staff groups</button>}
					<h1>{currentGroup ? currentGroup.title : 'Assessment records'}</h1>
				</div>
				<div className="assessment-heading-actions">
					<span className="record-total">{isAdmin && currentGroup ? currentGroup.rows.length : assessments.length} total</span>
					{isAdmin && currentGroup && <button className="button button-primary" type="button" onClick={handleExport} disabled={exporting || !currentGroup.rows.length} title={`Download ${currentGroup.title.toLowerCase()} as an Excel workbook`}><FiDownload aria-hidden="true" />{exporting ? 'Preparing Excel…' : 'Download Excel'}</button>}
				</div>
			</section>
			{exportError && <p className="form-error" role="alert">{exportError}</p>}
			{!isAdmin ? staffRecordsSection : currentGroup ? (
				<section className="section-block directory-block">
					<div className="table-toolbar">
						<div><h2>{currentGroup.title}</h2><span className="count-label">{currentGroup.rows.length} records</span></div>
						<label className="search-field"><FiSearch aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, result, symptoms, or staff" aria-label={`Search ${currentGroup.title.toLowerCase()}`} /></label>
					</div>
					{currentGroup.rows.length ? (
						<DataTable rows={currentGroup.rows} columns={columns} />
					) : (
						<div className="empty-state"><span className="empty-icon"><FiClipboard aria-hidden="true" /></span><strong>{loading ? 'Loading assessment history…' : query ? 'No matching records' : 'No saved assessments yet'}</strong><p>{query ? 'Try another patient, result, symptom, or staff name.' : 'Once an assessment is completed, it will be available here.'}</p></div>
					)}
				</section>
			) : (
				<section className="section-block directory-block">
					<div className="table-toolbar">
						<div><h2>Select a staff group</h2><span className="count-label">Open each group on its own page</span></div>
					</div>
					<div className="assessment-group-list">
						{groups.map((group) => (
							<button className="more-link" type="button" key={group.key} onClick={() => { setActiveGroup(group.key); setQuery('') }}>
								<span className="quick-icon"><FiClipboard aria-hidden="true" /></span>
								<span><strong>{group.title}</strong><small>{group.rows.length} assessment records</small></span>
								<span className="more-chevron">›</span>
							</button>
						))}
					</div>
				</section>
			)}
		</div>
	)
}

export default Assesmentrecords
