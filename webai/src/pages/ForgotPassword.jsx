import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import { requestPasswordReset, resetPassword } from '../api'

function ForgotPassword({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [hasRequestedCode, setHasRequestedCode] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setPending(true)

    try {
      if (!hasRequestedCode) {
        await requestPasswordReset(email)
        setHasRequestedCode(true)
        setMessage('If the account exists, a reset code has been sent to its email address.')
        return
      }

      const form = new FormData(event.currentTarget)
      await resetPassword(email, resetCode, form.get('password'))
      setIsComplete(true)
      setMessage('Your password has been reset. You can now sign in.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPending(false)
    }
  }

  if (isComplete) {
    return (
      <AuthLayout>
        <h1>Password reset</h1>
        <p className="login-copy" role="status">{message}</p>
        <button className="button button-primary login-submit" type="button" onClick={() => onNavigate('login')}>
          Return to sign in
        </button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1>Forgot password?</h1>
      <p className="login-copy">Request a reset code by email, then choose a new password.</p>
      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="reset-email">Email</label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          readOnly={hasRequestedCode}
          required
        />
        {hasRequestedCode && <>
          <label htmlFor="reset-code">Email reset code</label>
          <input
            id="reset-code"
            name="resetCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength="6"
            autoComplete="one-time-code"
            value={resetCode}
            onChange={(event) => setResetCode(event.target.value)}
            required
          />
          <label htmlFor="reset-password">New password</label>
          <input id="reset-password" name="password" type="password" autoComplete="new-password" minLength="8" required />
        </>}
        {message && <p className="login-copy" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary login-submit" type="submit" disabled={pending}>
          {pending ? 'Please wait…' : hasRequestedCode ? 'Reset password' : 'Send reset code'}
        </button>
      </form>
      {hasRequestedCode && <button className="login-mode-toggle" type="button" onClick={() => { setHasRequestedCode(false); setResetCode(''); setMessage(''); setError('') }}>Use a different email</button>}
      <button className="login-mode-toggle" type="button" onClick={() => onNavigate('login')}>Back to sign in</button>
    </AuthLayout>
  )
}

export default ForgotPassword