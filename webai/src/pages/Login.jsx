import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import { login } from '../api'

function Login({ onLogin, onNavigate, message }) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    const form = new FormData(event.currentTarget)

    try {
      const session = await login({
        email: form.get('email'),
        password: form.get('password'),
      })
      onLogin(session)
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout>
      <h1>Sign in</h1>
      <p className="login-copy">Sign in with the account provided by your clinic administrator.</p>
      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email</label>
        <input id="login-email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="login-password">Password</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required />
        {(error || message) && <p className="form-error" role="alert">{error || message}</p>}
        <button className="button button-primary login-submit" type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <button className="login-mode-toggle" type="button" onClick={() => onNavigate('forgot-password')}>Forgot password?</button>
    </AuthLayout>
  )
}

export default Login