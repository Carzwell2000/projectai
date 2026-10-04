import { FiLock, FiMessageCircle } from 'react-icons/fi'

function More({ isAdmin, onNavigate }) {
  return (
    <div className="page-stack">
      <section className="page-heading more-heading">
        <div><h1>More</h1></div>
      </section>
      <section className={`more-links${isAdmin ? ' more-links-admin' : ''}`} aria-label="Workspace tools">
        {!isAdmin && (
          <button className="more-link" type="button" onClick={() => onNavigate('messages')}>
            <span className="quick-icon"><FiMessageCircle aria-hidden="true" /></span><span><strong>Team messages</strong><small>Contact other nurses in your clinic.</small></span><span className="more-chevron">›</span>
          </button>
        )}
        <button className="more-link" type="button" onClick={() => onNavigate('settings')}>
          <span className="quick-icon quick-icon-coral"><FiLock aria-hidden="true" /></span><span><strong>Change account password</strong><small>Update your sign-in credentials.</small></span><span className="more-chevron">›</span>
        </button>
      </section>
    </div>
  )
}

export default More
