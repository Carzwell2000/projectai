import { useState } from 'react'
import { FiActivity, FiArrowRight, FiChevronRight, FiUsers, FiSettings } from 'react-icons/fi'
import AuthLayout from '../components/AuthLayout'
import { login } from '../api'

const portals = [
  {
    role: 'primary_healthcare',
    title: 'Primary Healthcare',
    description: 'Access patient assessments and supported results.',
    button: 'Enter Primary Healthcare Portal',
    icon: FiActivity,
  },
  {
    role: 'nurse',
    title: 'Nursing Staff',
    description: 'Manage patient care, assessments, and records.',
    button: 'Enter Nursing Portal',
    icon: FiUsers,
  },
  {
    role: 'admin',
    title: 'Administrator',
    description: 'Manage staff accounts and system activity.',
    button: 'Enter Admin Portal',
    icon: FiSettings,
  },
]

function Login({ onLogin, onNavigate, message }) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [hasExplored, setHasExplored] = useState(false)
  const [selectedPortal, setSelectedPortal] = useState(null)

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
      if (session.nurse?.role !== selectedPortal) {
        setError('This account does not have access to the selected portal. Choose the portal that matches your account.')
        return
      }
      onLogin(session)
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      panelClassName={!hasExplored || !selectedPortal ? 'login-panel-portals' : ''}
      immersive={!hasExplored}
    >
      {!hasExplored ? (
        <div className="explore-landing">
          <h1 className="explore-title">
            <span>Welcome to AI Health</span>
            <span>Decision Support System</span>
          </h1>
          <button className="explore-button" type="button" onClick={() => setHasExplored(true)}>
            Explore portals
            <FiArrowRight aria-hidden="true" />
          </button>
        </div>
      ) : !selectedPortal ? (
        <div className="portal-selection">
          <div className="portal-heading">
            <h2>Select a portal</h2>
            <p>Select the role associated with your login.</p>
          </div>
          {message && <p className="form-error" role="alert">{message}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="portal-list">
            {portals.map((portal) => {
              const Icon = portal.icon
              return (
                <button
                  className="portal-card"
                  key={portal.role}
                  type="button"
                  aria-label={portal.button}
                  onClick={() => { setSelectedPortal(portal.role); setError('') }}
                >
                  <span className="portal-card-content">
                    <span className="portal-card-icon"><Icon aria-hidden="true" /></span>
                    <span className="portal-card-copy">
                      <strong>{portal.title}</strong>
                      <span>{portal.description}</span>
                    </span>
                    <FiChevronRight className="portal-card-chevron" aria-hidden="true" />
                  </span>
                  <span className="portal-card-action">
                    {portal.button}
                    <FiArrowRight aria-hidden="true" />
                  </span>
                </button>
              )
            })}
          </div>
          <button className="portal-back explore-back" type="button" onClick={() => { setHasExplored(false); setError('') }}>
            <FiChevronRight aria-hidden="true" />
            Back to explore
          </button>
        </div>
      ) : (
      <>
      <button className="portal-back" type="button" onClick={() => { setSelectedPortal(null); setError('') }}>
        <FiChevronRight aria-hidden="true" />
        Choose a different portal
      </button>
      <h1>Sign in</h1>
      <p className="login-copy">Sign in to the {portals.find((portal) => portal.role === selectedPortal)?.title} portal with your account.</p>
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
      </>
      )}
    </AuthLayout>
  )
}

export default Login