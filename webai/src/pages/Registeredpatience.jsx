import { useMemo, useState } from 'react'
import { FiEdit2, FiPlus, FiSearch, FiUsers } from 'react-icons/fi'
import { ColumnDirective, ColumnsDirective, GridComponent, Inject, Page, Sort } from '@syncfusion/ej2-react-grids'

function Registeredpatience({ patients, loading, onRegister, onEdit }) {
	const [query, setQuery] = useState('')
	const filteredPatients = useMemo(() => patients.filter((patient) => {
		const searchable = `${patient.name} ${patient.phone} ${patient.email}`.toLowerCase()
		return searchable.includes(query.trim().toLowerCase())
	}), [patients, query])
	const patientTemplate = (patient) => (
		<span className="table-person">
			<span className="avatar avatar-small">{patient.name?.slice(0, 1) || 'P'}</span>
			<span><strong>{patient.name}</strong><small>{patient.email || 'No email added'}</small></span>
		</span>
	)
	const syncTemplate = (patient) => (
		<span className={`sync-state ${patient.syncStatus === 'synced' ? 'is-synced' : ''}`}>
			{patient.syncStatus === 'synced' ? 'Synced' : 'Local'}
		</span>
	)
	const actionTemplate = (patient) => (
		<button className="icon-button" type="button" onClick={() => onEdit(patient)} aria-label={`Edit ${patient.name}`} title="Edit patient">
			<FiEdit2 aria-hidden="true" />
		</button>
	)

	return (
		<div className="page-stack">
			<section className="page-heading">
				<div><h1>Registered Patients</h1></div>
				<button className="button button-primary" type="button" onClick={onRegister}><FiPlus aria-hidden="true" /> Register patient</button>
			</section>
			<section className="section-block directory-block">
				<div className="table-toolbar">
					<div><h2>Patient list</h2><span className="count-label">{patients.length} {patients.length === 1 ? 'record' : 'records'}</span></div>
					<label className="search-field"><FiSearch aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or contact" aria-label="Search patients" /></label>
				</div>
				{filteredPatients.length ? (
					<GridComponent
						dataSource={filteredPatients}
						allowPaging
						allowSorting
						pageSettings={{ pageSize: 10, pageSizes: [5, 10, 20] }}
						gridLines="Horizontal"
						rowHeight={62}
						cssClass="clinic-grid patient-grid"
					>
						<ColumnsDirective>
							<ColumnDirective field="name" headerText="Patient" width="200" minWidth="170" template={patientTemplate} />
							<ColumnDirective field="phone" headerText="Phone" width="140" valueAccessor={(_field, patient) => patient.phone || '—'} />
							<ColumnDirective field="dateOfBirth" headerText="Date of birth" width="145" valueAccessor={(_field, patient) => patient.dateOfBirth || '—'} />
							<ColumnDirective field="gender" headerText="Gender" width="140" valueAccessor={(_field, patient) => (patient.gender || 'not specified').replaceAll('_', ' ')} />
							<ColumnDirective field="createdAt" headerText="Added" width="130" template={(patient) => patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : '—'} />
							<ColumnDirective field="syncStatus" headerText="Sync" width="110" template={syncTemplate} />
							<ColumnDirective headerText="Actions" width="90" textAlign="Center" allowSorting={false} template={actionTemplate} />
						</ColumnsDirective>
						<Inject services={[Page, Sort]} />
					</GridComponent>
				) : (
					<div className="empty-state">
						<span className="empty-icon"><FiUsers aria-hidden="true" /></span>
						<strong>{loading ? 'Loading patient records…' : query ? 'No matching patients' : 'Your directory is ready'}</strong>
						<p>{query ? 'Try another name or contact detail.' : 'Register a patient to start building your local directory.'}</p>
						{!query && <button type="button" className="button button-secondary" onClick={onRegister}><FiPlus aria-hidden="true" /> Register first patient</button>}
					</div>
				)}
			</section>
		</div>
	)
}

export default Registeredpatience
