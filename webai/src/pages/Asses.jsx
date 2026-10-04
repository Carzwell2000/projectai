import { useState } from 'react'
import { FiActivity, FiInfo } from 'react-icons/fi'

function getAge(dateOfBirth) {
	if (typeof dateOfBirth !== 'string' || !dateOfBirth.trim()) return ''
	const dateMatch = dateOfBirth.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
	let birthDate
	if (dateMatch) {
		const [, year, month, day] = dateMatch
		birthDate = new Date(Number(year), Number(month) - 1, Number(day))
		if (birthDate.getFullYear() !== Number(year)
			|| birthDate.getMonth() !== Number(month) - 1
			|| birthDate.getDate() !== Number(day)) return ''
	} else {
		birthDate = new Date(dateOfBirth)
		if (Number.isNaN(birthDate.getTime())) return ''
	}
	const now = new Date()
	if (birthDate > now) return ''
	let age = now.getFullYear() - birthDate.getFullYear()
	const beforeBirthday = now.getMonth() < birthDate.getMonth()
		|| (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())
	if (beforeBirthday) age -= 1
	return age >= 0 ? age : ''
}

function Asses({ patients, onSubmit, onComplete }) {
	const [error, setError] = useState('')
	const [pending, setPending] = useState(false)
	const [selectedPatientId, setSelectedPatientId] = useState('')
	const [selectedPatientAge, setSelectedPatientAge] = useState('')
	const [gender, setGender] = useState('')
	const [pregnant, setPregnant] = useState('')

	async function handleSubmit(event) {
		event.preventDefault()
		setError('')
		setPending(true)
		const form = new FormData(event.currentTarget)
		const patient = patients.find((item) => item.id === form.get('patientId'))
		if (!patient) {
			setError('Choose a patient before starting the assessment.')
			setPending(false)
			return
		}
		const age = Number(form.get('age'))
		const request = {
			id: window.crypto?.randomUUID?.() || `assessment-${Date.now()}`,
			patientName: patient.name,
			age,
			gender,
			pregnant: gender === 'Female' ? pregnant === 'yes' : null,
			temperature: Number(form.get('temperature')),
			bloodPressure: form.get('bloodPressure'),
			symptoms: form.get('symptoms'),
			createdAt: new Date().toISOString(),
		}
		if (!Number.isInteger(age) || age < 0 || age > 120) {
			setError('Enter a valid age from 0 to 120 before saving the assessment.')
			setPending(false)
			return
		}
		if (!gender || (gender === 'Female' && !pregnant)) {
			setError('Select an assessment gender and pregnancy status when applicable.')
			setPending(false)
			return
		}
		try {
			const savedResult = await onSubmit(request)
			setPending(false)
			onComplete({ ...request, ...savedResult }, request)
		} catch (submitError) {
			setError(submitError.message)
			setPending(false)
		}
	}

	return (
		<div className="page-stack form-page">
			<section className="page-heading">
				<div><p className="eyebrow"></p><h1>New assessment</h1><p className="muted"></p></div>
				<div className="assessment-badge"><FiActivity aria-hidden="true" /></div>
			</section>
			{patients.length ? (
				<>
					<section className="form-panel assessment-panel">
						<div className="form-panel-title"><span className="quick-icon"><FiActivity aria-hidden="true" /></span><div><h2>Assess Patient</h2><p></p></div></div>
						<form className="data-form" onSubmit={handleSubmit}>
							<div className="form-grid">
								<label className="field field-wide">Patient <span>*</span><select name="patientId" required value={selectedPatientId} onChange={(event) => {
									const selected = patients.find((item) => item.id === event.target.value)
									setSelectedPatientId(event.target.value)
									setSelectedPatientAge(getAge(selected?.dateOfBirth))
									setGender(getAssessmentGender(selected?.gender))
									setPregnant('')
								}}><option value="" disabled>Select a patient</option>{patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.name}</option>)}</select></label>
								<label className="field">Patient age <span>*</span><input name="age" type="number" min="0" max="120" step="1" value={selectedPatientAge} onChange={(event) => setSelectedPatientAge(event.target.value)} required placeholder="Age" /></label>
								<label className="field">Assessment gender <span>*</span><select value={gender} onChange={(event) => { setGender(event.target.value); setPregnant('') }} disabled={!selectedPatientId || Boolean(getAssessmentGender(patients.find((item) => item.id === selectedPatientId)?.gender))} required><option value="">Select gender</option><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option></select></label>
								{gender === 'Female' && <label className="field">Pregnancy status <span>*</span><select value={pregnant} onChange={(event) => setPregnant(event.target.value)} required><option value="">Select status</option><option value="yes">Yes</option><option value="no">No</option></select></label>}
								<label className="field">Temperature (°C) <span>*</span><input name="temperature" type="number" required min="25" max="45" step="0.1" placeholder="36.8" /></label>
								<label className="field">Blood pressure (mmHg) <span>*</span><input name="bloodPressure" required pattern="[0-9]{2,3}/[0-9]{2,3}" placeholder="120/80" /></label>
								<label className="field field-wide">Reported symptoms <span>*</span><textarea name="symptoms" required minLength="2" maxLength="4000" rows="4" placeholder="Describe the symptoms reported by the patient" /></label>
							</div>
							{error && <p className="form-error" role="alert">{error}</p>}
							<div className="form-actions"><span className="form-hint"></span><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Reviewing…' : 'Run assessment'}</button></div>
						</form>
					</section>
				</>
			) : (
				<section className="empty-state setup-empty"><span className="empty-icon"><FiInfo aria-hidden="true" /></span><strong>Register a patient first</strong></section>
			)}
		</div>
	)
}

function getAssessmentGender(gender) {
	switch (gender?.toLowerCase()) {
		case 'female': return 'Female'
		case 'male': return 'Male'
		case 'intersex':
		case 'other': return 'Other'
		default: return ''
	}
}

export default Asses
