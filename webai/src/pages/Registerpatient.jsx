import { useEffect, useRef, useState } from 'react'
import { FiArrowLeft, FiUserPlus } from 'react-icons/fi'

function Registerpatient({ onSubmit, onCancel, onSuccess, initialPatient }) {
	const [error, setError] = useState('')
	const [pending, setPending] = useState(false)
	const mounted = useRef(true)

	useEffect(() => () => {
		mounted.current = false
	}, [])

	async function handleSubmit(event) {
		event.preventDefault()
		setPending(true)
		setError('')
		const form = new FormData(event.currentTarget)
		const patient = Object.fromEntries(form.entries())
		try {
			await onSubmit(patient)
			onSuccess()
		} catch (submitError) {
			if (!mounted.current) return
			setError(submitError.message)
			setPending(false)
		}
	}

	return (
		<div className="page-stack form-page">
			<section className="page-heading">
				<div><p className="eyebrow">PATIENT DIRECTORY</p><h1>{initialPatient ? 'Edit patient' : 'Register a patient'}</h1><p className="muted">{initialPatient ? 'Update the details attached to this patient record.' : 'Add the details needed to create a patient record.'}</p></div>
				<button className="button button-quiet" type="button" onClick={onCancel}><FiArrowLeft aria-hidden="true" /> Back to patients</button>
			</section>
			<section className="form-panel">
				<div className="form-panel-title"><span className="quick-icon quick-icon-coral"><FiUserPlus aria-hidden="true" /></span><div><h2>Patient details</h2><p>Required fields are marked with an asterisk.</p></div></div>
				<form className="data-form" onSubmit={handleSubmit}>
					<div className="form-grid">
						<label className="field field-wide">Full name <span>*</span><input name="name" required minLength="2" maxLength="200" autoComplete="name" defaultValue={initialPatient?.name || ''} /></label>
						<label className="field">Phone number <span>*</span><input name="phone" type="tel" required minLength="10" maxLength="40" autoComplete="tel" placeholder="Include country code if needed" defaultValue={initialPatient?.phone || ''} /></label>
						<label className="field">Date of birth <span>*</span><input name="dateOfBirth" type="date" required defaultValue={initialPatient?.dateOfBirth || ''} /></label>
						<label className="field">Gender <select name="gender" defaultValue={initialPatient?.gender || 'not_specified'}><option value="not_specified">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label>
						<label className="field">Email <input name="email" type="email" maxLength="254" autoComplete="email" defaultValue={initialPatient?.email || ''} /></label>
						<label className="field field-wide">Address <input name="address" maxLength="300" autoComplete="street-address" defaultValue={initialPatient?.address || ''} /></label>
					</div>
					{error && <p className="form-error" role="alert">{error}</p>}
					<div className="form-actions"><span className="form-hint">Records remain on this device until synced.</span><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : initialPatient ? 'Save changes' : 'Save patient'}</button></div>
				</form>
			</section>
		</div>
	)
}

export default Registerpatient
