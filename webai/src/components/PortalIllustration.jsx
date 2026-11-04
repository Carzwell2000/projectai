import primaryHealthWorkerImage from '../assets/primary-health-worker.png'
import nursingStaffImage from '../assets/nursing-staff.png'

function PortalIllustration({ role }) {
	const isDoctor = role === 'primary_healthcare'
	const isNurse = role === 'nurse'
	const label = isNurse ? 'Nursing staff illustration' : 'Healthcare administrator illustration'
	const clothing = isNurse ? '#258b78' : '#284d5a'

	if (isDoctor) {
		return <img className="portal-illustration portal-illustration-photo" src={primaryHealthWorkerImage} alt="Primary healthcare worker" />
	}
	if (isNurse) {
		return <img className="portal-illustration portal-illustration-photo" src={nursingStaffImage} alt="Nurse caring for an older patient" />
	}

	return (
		<svg className={`portal-illustration portal-illustration-${role}`} viewBox="0 0 120 96" role="img" aria-label={label}>
			<rect width="120" height="96" rx="16" fill={isNurse ? '#e3f1ee' : '#e8eef1'} />
			<circle cx="91" cy="23" r="14" fill={isNurse ? '#c9e5dd' : '#d4e0e6'} />
			<path d="M10 96c2-21 18-33 42-33s40 12 42 33" fill={clothing} />
			<path d="M41 62l11 12 11-12 10 6-9 28H40l-9-28z" fill={clothing} />
			<path d="M47 48h12v16c0 6-12 6-12 0z" fill="#9a5d43" />
			<ellipse cx="53" cy="37" rx="18" ry="22" fill="#9a5d43" />
			{isNurse ? (
				<path d="M36 35c-2-19 8-27 19-26 10 1 17 9 16 23l-5-5-2-7c-9 5-17 6-28 4z" fill="#202d2d" />
			) : (
				<path d="M35 34c-2-15 6-25 18-26 14-1 21 9 20 24l-6-7-1-5c-9 5-18 6-27 5z" fill="#202d2d" />
			)}
			<circle cx="35" cy="40" r="3" fill="#9a5d43" />
			<circle cx="71" cy="40" r="3" fill="#9a5d43" />
			<path d="M47 39h2m11 0h2" stroke="#292d2c" strokeWidth="2" strokeLinecap="round" />
			<path d="M49 49c3 2 7 2 10 0" stroke="#603c34" strokeWidth="1.5" strokeLinecap="round" fill="none" />
			{isNurse ? (
				<>
					<path d="M42 12c2-8 20-10 23 0l-2 7H44z" fill="#fff" />
					<path d="M52 12h4m-2-2v4" stroke="#167663" strokeWidth="1.5" strokeLinecap="round" />
					<path d="M63 67c8 5 11 12 11 21" stroke="#d8f2e9" strokeWidth="2.5" fill="none" />
					<rect x="67" y="82" width="11" height="10" rx="3" fill="#fff" />
					<path d="M71 85h3m-1.5-1.5v3" stroke="#167663" strokeWidth="1.2" strokeLinecap="round" />
				</>
			) : (
				<>
					<rect x="72" y="38" width="31" height="42" rx="5" fill="#fff" />
					<rect x="78" y="46" width="19" height="3" rx="1.5" fill="#c9d8dc" />
					<rect x="78" y="53" width="12" height="3" rx="1.5" fill="#c9d8dc" />
					<path d="M78 69l6-7 5 4 6-9" fill="none" stroke="#258b78" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
					<circle cx="97" cy="68" r="8" fill="#dcefe7" />
					<circle cx="97" cy="68" r="3" fill="none" stroke="#258b78" strokeWidth="2" />
				</>
			)}
		</svg>
	)
}

export default PortalIllustration
