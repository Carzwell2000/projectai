import { useState } from 'react'
import { FiShield, FiTrash2, FiUserPlus, FiUsers } from 'react-icons/fi'
import { ColumnDirective, ColumnsDirective, GridComponent, Inject, Page, Sort } from '@syncfusion/ej2-react-grids'

function NurseManagement({ nurses, loading, onCreate, onDelete }) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setError('')
    setSuccess('')
    setPending(true)
    try {
      await onCreate({
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
        role: form.get('role'),
      })
      formElement.reset()
      setSuccess(`${form.get('role') === 'nurse' ? 'Nurse' : 'Primary healthcare'} account created.`)
    } catch (createError) {
      setError(createError.message)
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(nurse) {
    if (!window.confirm(`Remove the nurse account for ${nurse.name}?`)) return
    setError('')
    setSuccess('')
    setDeletingId(nurse.id)
    try {
      await onDelete(nurse.id)
      setSuccess(`${nurse.name}'s account was removed.`)
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setDeletingId('')
    }
  }
  const nurseTemplate = (nurse) => (
    <span className="table-person">
      <span className="avatar avatar-small">{nurse.name?.slice(0, 1) || 'N'}</span>
      <span><strong>{nurse.name}</strong><small>{nurse.email}</small></span>
    </span>
  )
  const actionTemplate = (nurse) => (
    <button className="icon-button admin-delete-button" type="button" onClick={() => handleDelete(nurse)} disabled={deletingId === nurse.id} aria-label={`Remove ${nurse.name}`} title="Remove nurse account">
      <FiTrash2 aria-hidden="true" />
    </button>
  )

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><h1>Manage healthcare staff accounts</h1></div>
        <span className="record-total">{nurses.length} {nurses.length === 1 ? 'account' : 'accounts'}</span>
      </section>

      <section className="admin-nurse-layout">
        <article className="form-panel admin-create-panel">
          <div className="form-panel-title"><span className="quick-icon"><FiUserPlus aria-hidden="true" /></span><div><h2>Create staff account</h2></div></div>
          <form className="data-form" onSubmit={handleSubmit}>
            <label className="field">Full name <span></span><input name="name" required minLength="2" maxLength="120" autoComplete="name" /></label>
            <label className="field admin-field-gap">Email <input name="email" type="email" required maxLength="200" autoComplete="email" /></label>
            <label className="field admin-field-gap"> Password <input name="password" type="password" required minLength="8" maxLength="200" autoComplete="new-password" /></label>
            <label className="field admin-field-gap">Account type <select name="role" defaultValue="nurse"><option value="nurse">Nurse</option><option value="primary_healthcare">Primary healthcare worker</option></select></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            {success && <p className="form-success" role="status">{success}</p>}
            <button className="button button-primary admin-create-button" type="submit" disabled={pending}><FiUserPlus aria-hidden="true" />{pending ? 'Creating account…' : 'Create account'}</button>
          </form>
        </article>

        <section className="section-block directory-block admin-nurse-directory">
          <div className="table-toolbar"><div><h2>Created Accounts</h2></div><span className="admin-directory-icon"><FiShield aria-hidden="true" /></span></div>
          {nurses.length ? (
            <GridComponent
              dataSource={nurses}
              allowPaging
              allowSorting
              pageSettings={{ pageSize: 8, pageSizes: [5, 8, 15] }}
              gridLines="Horizontal"
              rowHeight={62}
              cssClass="clinic-grid nurse-grid"
            >
              <ColumnsDirective>
                <ColumnDirective field="name" headerText="Staff member" width="220" minWidth="170" template={nurseTemplate} />
                <ColumnDirective field="role" headerText="Account type" width="190" template={(staff) => staff.role === 'primary_healthcare' ? 'Primary healthcare worker' : 'Nurse'} />
                <ColumnDirective field="created_at" headerText="Created" width="140" template={(nurse) => nurse.created_at ? new Date(nurse.created_at).toLocaleDateString() : '—'} />
                <ColumnDirective headerText="Access" width="120" template={() => <span className="sync-state is-synced">Active</span>} />
                <ColumnDirective headerText="Actions" width="90" textAlign="Center" allowSorting={false} template={actionTemplate} />
              </ColumnsDirective>
              <Inject services={[Page, Sort]} />
            </GridComponent>
          ) : (
            <div className="empty-state admin-nurse-empty"><span className="empty-icon"><FiUsers aria-hidden="true" /></span><strong>{loading ? 'Loading staff accounts…' : 'No staff accounts yet'}</strong></div>
          )}
        </section>
      </section>
    </div>
  )
}

export default NurseManagement