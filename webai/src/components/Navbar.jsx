import { FiRefreshCw, FiUploadCloud } from 'react-icons/fi'

function Navbar({ notice, loading, onRefresh, syncStatus, syncError, isClinicalWorkspace, isAdmin }) {
  const unsyncedCount = (syncStatus?.pending || 0) + (syncStatus?.conflicts || 0)
  const syncDetails = syncStatus
    ? `${syncStatus.pendingAssessments || 0} assessments, ${syncStatus.pendingPatients || 0} patients pending; ${syncStatus.conflicts || 0} conflicts across all nurses.${syncError ? ` ${syncError}` : ''}`
    : ''

  return (
    <header className="topbar">
      <div className="topbar-brand-marquee" aria-label="Health Decision Support System">
        <span className={`topbar-brand-track${isClinicalWorkspace || isAdmin ? ' is-static' : ''}`} aria-hidden="true">
          {isAdmin ? 'CLINIC AI · ADMINISTRATION' : isClinicalWorkspace ? 'CLINIC AI · NURSING WORKSPACE' : 'HEALTH DECISION SUPPORT SYSTEM'}
        </span>
      </div>
      <div className="topbar-actions">
        {notice && <span className="connection-note" role="status">API unavailable</span>}
        {syncStatus && (
          <span
            className={`sync-indicator${unsyncedCount || syncError ? ' has-unsynced' : ''}`}
            role="status"
            aria-label={`Unsynced records: ${syncDetails}`}
            title={syncDetails}
          >
            <FiUploadCloud aria-hidden="true" />
            <span>{`${unsyncedCount} unsynced`}</span>
          </span>
        )}
        <button className="icon-button refresh-button" type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh records" title="Refresh records">
          <FiRefreshCw aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

export default Navbar
