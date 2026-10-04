import { useState } from 'react'
import { FiLock, FiUser } from 'react-icons/fi'

function AccountSettings({ nurse, onChangePassword }) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const currentPassword = form.get('currentPassword')
    const newPassword = form.get('newPassword')
    const confirmPassword = form.get('confirmPassword')
    setError('')
    setSuccess('')
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }
    setPending(true)
    try {
      await onChangePassword(currentPassword, newPassword)
      event.currentTarget.reset()
      setSuccess('Your password has been changed.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page-stack form-page">
      <section className="page-heading">
        <div><p className="eyebrow"></p><h1></h1><p className="muted"></p></div>
      </section>
      <section className="account-summary">
        <span className="account-summary-icon"><FiUser aria-hidden="true" /></span>
        <div><strong>{nurse?.name || 'Clinical staff'}</strong><span>{nurse?.email || ''}</span></div>
        <span className="account-role">{nurse?.role || 'nurse'}</span>
      </section>
      <section className="form-panel account-security-panel">
        <div className="form-panel-title"><span className="quick-icon"><FiLock aria-hidden="true" /></span><div><h2>Change password</h2><p></p></div></div>
        <form className="data-form" onSubmit={handleSubmit}>
          <label className="field">Current password <span>*</span><input name="currentPassword" type="password" autoComplete="current-password" minLength="8" required /></label>
          <label className="field admin-field-gap">New password <span>*</span><input name="newPassword" type="password" autoComplete="new-password" minLength="8" required /></label>
          <label className="field admin-field-gap">Confirm new password <span>*</span><input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {success && <p className="form-success" role="status">{success}</p>}
          <div className="form-actions"><span className="form-hint"></span><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Updating…' : 'Update password'}</button></div>
        </form>
      </section>
    </div>
  )
}

export default AccountSettings
