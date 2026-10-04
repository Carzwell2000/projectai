import { useMemo, useState } from 'react'
import { FiClipboard, FiSearch } from 'react-icons/fi'
import { ColumnDirective, ColumnsDirective, GridComponent, Inject, Page, Sort } from '@syncfusion/ej2-react-grids'

function value(record, camel, snake) {
	return record?.[camel] ?? record?.[snake] ?? ''
}

function Assesmentrecords({ assessments, loading }) {
	const [query, setQuery] = useState('')
	const filtered = useMemo(() => assessments.filter((assessment) => {
		const text = `${value(assessment, 'patientName', 'patient_name')} ${assessment.disease || ''} ${assessment.symptoms || ''}`.toLowerCase()
		return text.includes(query.trim().toLowerCase())
	}), [assessments, query])
	const dateTemplate = (assessment) => {
		const createdAt = value(assessment, 'createdAt', 'created_at')
		return createdAt ? new Date(createdAt).toLocaleString() : '—'
	}
	const syncTemplate = (assessment) => {
		const status = value(assessment, 'syncStatus', 'sync_status')
		return <span className={`sync-state ${status === 'synced' ? 'is-synced' : ''}`}>{status === 'synced' ? 'Synced' : status === 'conflict' ? 'Conflict' : 'Pending Sync'}</span>
	}

	return (
		<div className="page-stack">
			<section className="page-heading">
				<div><h1>Assessment records</h1></div>
				<span className="record-total">{assessments.length} total</span>
			</section>
			<section className="section-block directory-block">
				<div className="table-toolbar">
					<div><h2>All assessments</h2><span className="count-label">Newest first</span></div>
					<label className="search-field"><FiSearch aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient or result" aria-label="Search assessment records" /></label>
				</div>
				{filtered.length ? (
					<GridComponent
						dataSource={filtered}
						allowPaging
						allowSorting
						pageSettings={{ pageSize: 10, pageSizes: [5, 10, 20] }}
						gridLines="Horizontal"
						rowHeight={62}
						cssClass="clinic-grid assessment-grid"
					>
						<ColumnsDirective>
							<ColumnDirective field="patient_name" headerText="Patient" width="160" minWidth="140" clipMode="EllipsisWithTooltip" template={(assessment) => <strong>{value(assessment, 'patientName', 'patient_name') || 'Patient record'}</strong>} />
							<ColumnDirective field="disease" headerText="Result" width="160" minWidth="130" clipMode="EllipsisWithTooltip" valueAccessor={(_field, assessment) => assessment.disease || 'Review recommended'} />
							<ColumnDirective field="confidence" headerText="Percentage" width="120" textAlign="Right" valueAccessor={(_field, assessment) => assessment.confidence == null ? '—' : `${Math.round(assessment.confidence * 100)}%`} />
							<ColumnDirective field="symptoms" headerText="Symptoms" width="200" minWidth="150" clipMode="EllipsisWithTooltip" valueAccessor={(_field, assessment) => assessment.symptoms || '—'} />
							<ColumnDirective field="nurse_name" headerText="Assessed by" width="150" minWidth="130" clipMode="EllipsisWithTooltip" valueAccessor={(_field, assessment) => assessment.nurse_name || 'Unknown nurse'} />
							<ColumnDirective field="created_at" headerText="Date of assessment" width="180" minWidth="165" template={dateTemplate} />
							<ColumnDirective field="sync_status" headerText="Sync" width="130" template={syncTemplate} />
						</ColumnsDirective>
						<Inject services={[Page, Sort]} />
					</GridComponent>
				) : (
					<div className="empty-state"><span className="empty-icon"><FiClipboard aria-hidden="true" /></span><strong>{loading ? 'Loading assessment history…' : query ? 'No matching records' : 'No saved assessments yet'}</strong><p>{query ? 'Try another patient name or model result.' : 'Once an assessment is completed, it will be available here.'}</p></div>
				)}
			</section>
		
		</div>
	)
}

export default Assesmentrecords
