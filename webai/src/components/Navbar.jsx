import { FiFileText, FiRefreshCw, FiUploadCloud } from 'react-icons/fi'

function Navbar({ pageTitle, notice, loading, onRefresh, syncStatus, syncError }) {
  const unsyncedCount = (syncStatus?.pending || 0) + (syncStatus?.conflicts || 0)
  const syncDetails = syncStatus
    ? `${syncStatus.pendingAssessments || 0} assessments, ${syncStatus.pendingPatients || 0} patients pending; ${syncStatus.conflicts || 0} conflicts across all nurses.${syncError ? ` ${syncError}` : ''}`
    : ''

  return (
    <header className="topbar">
      <div className="breadcrumb"><FiFileText aria-hidden="true" /><span></span><b>/</b><strong>{pageTitle}</strong></div>
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
