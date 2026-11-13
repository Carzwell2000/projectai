import { FiHeart, FiLogOut } from 'react-icons/fi'
import healthcareWorkerImage from '../assets/navbar-doctor.png'
import nurseProfileImage from '../assets/village-health-worker.png'

function Sidebar({ navigation, activeNavigation, onNavigate, session, onLogout, sectionLabel }) {
  const isClinicalWorkspace = sectionLabel === 'WORKSPACE'
  const isAdminWorkspace = sectionLabel === 'ADMINISTRATION'
  const isDashboardWorkspace = isClinicalWorkspace || isAdminWorkspace
  const nurseName = session.nurse?.name || 'Nurse'

  return (
    <aside className={`sidebar${isDashboardWorkspace ? ' sidebar-clinical' : ''}${isAdminWorkspace ? ' sidebar-clinical-admin' : ''}`}>
      {isDashboardWorkspace ? (
        <>
          <div className="sidebar-clinical-brand">
            <span className="sidebar-heart-mark">
              <FiHeart aria-hidden="true" />
              <i aria-hidden="true" />
            </span>
            <div>Clinic AI<small>{isAdminWorkspace ? 'Clinic administration' : 'Healthier community'}</small></div>
          </div>
        </>
      ) : (
        <>
          <div className="sidebar-portrait">
            <img src={healthcareWorkerImage} alt="Healthcare professional" />
          </div>
          <div className="side-caption">{sectionLabel}</div>
        </>
      )}
      <nav className="side-nav" aria-label="Main navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            className={`nav-item${activeNavigation === id ? ' is-active' : ''}`}
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={activeNavigation === id ? 'page' : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
            {id === 'assessment' && <span className="nav-shortcut">+</span>}
          </button>
        ))}
      </nav>
      {isDashboardWorkspace ? (
        <div className="sidebar-bottom sidebar-clinical-bottom">
          <div className="sidebar-account-panel">
            <img className="sidebar-account-avatar" src={nurseProfileImage} alt="" />
            <span className="sidebar-account-details">
              <strong>{nurseName}</strong>
              <small>{session.nurse?.role?.replaceAll('_', ' ') || 'Clinical staff'}</small>
            </span>
          </div>
          <button className="sidebar-logout-button" type="button" onClick={onLogout}>
            <span><FiLogOut aria-hidden="true" /></span>
            Logout
          </button>
        </div>
      ) : (
        <div className="sidebar-bottom">
          <div className="account-row">
            <span className="avatar">{session.nurse?.name?.slice(0, 1) || 'N'}</span>
            <span className="account-name">{session.nurse?.name || 'Nurse'}<small>{session.nurse?.role || 'Clinical staff'}</small></span>
            <button className="icon-button logout-button" type="button" onClick={onLogout} aria-label="Sign out" title="Sign out">
              <FiLogOut aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar