import { FiActivity, FiLogOut } from 'react-icons/fi'

function Sidebar({ navigation, activeNavigation, onNavigate, session, onLogout, sectionLabel }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); onNavigate('dashboard') }}>
        <span className="brand-mark"><FiActivity aria-hidden="true" /></span>
        <span>HEALTH DECISION SUPPORT SYSTEM</span>
      </a>
      <div className="side-caption">{sectionLabel}</div>
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
      <div className="sidebar-bottom">
        
        <div className="account-row">
          <span className="avatar">{session.nurse?.name?.slice(0, 1) || 'N'}</span>
          <span className="account-name">{session.nurse?.name || 'Nurse'}<small>{session.nurse?.role || 'Clinical staff'}</small></span>
          <button className="icon-button logout-button" type="button" onClick={onLogout} aria-label="Sign out" title="Sign out">
            <FiLogOut aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar