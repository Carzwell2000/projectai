import { useState } from 'react'
import { FiActivity, FiArrowRight, FiChevronRight, FiShield } from 'react-icons/fi'
import AuthLayout from '../components/AuthLayout'
import PortalIllustration from '../components/PortalIllustration'
import { login } from '../api'

const portals = [
  {
    role: 'primary_healthcare',
    title: 'Primary Healthcare',
    description: 'Access patient assessments and supported results.',
    button: 'Enter Primary Healthcare Portal',
  },
  {
    role: 'nurse',
    title: 'Nursing Staff',
    description: 'Manage patient care, assessments, and records.',
    button: 'Enter Nursing Portal',
  },
  {
    role: 'admin',
    title: 'Administrator',
    description: 'Manage staff accounts and system activity.',
    button: 'Enter Admin Portal',
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
          <div className="explore-brand">
            <span className="explore-brand-mark"><FiActivity aria-hidden="true" /></span>
            <span>CLINICAL WORKSPACE</span>
          </div>
          <div className="explore-content">
            <p className="explore-kicker">SMARTER SUPPORT. HUMAN JUDGMENT.</p>
            <h1 className="explore-title">
              <span className="explore-title-line">
                <span className="explore-word" style={{ animationDelay: '120ms' }}>AI-assisted</span>
              </span>
              <span className="explore-title-line">
                <span className="explore-word" style={{ animationDelay: '260ms' }}>clinical</span>{' '}
                <span className="explore-word" style={{ animationDelay: '400ms' }}>care.</span>
              </span>
            </h1>
            <p className="explore-subtitle">Decision support for healthcare teams, always guided by clinicians.</p>
          </div>
          <button className="explore-button" type="button" onClick={() => setHasExplored(true)}>
            <span>Continue to sign in</span>
            <FiArrowRight aria-hidden="true" />
          </button>
        </div>
      ) : !selectedPortal ? (
        <div className="portal-selection">
          <div className="portal-brand">
            <span className="portal-brand-icon"><FiActivity aria-hidden="true" /></span>
            <span className="portal-eyebrow">CLINICAL WORKSPACE</span>
          </div>
          <div className="portal-heading">
            <h2>Choose your workspace</h2>
            <p>Select the role linked to your account to continue securely.</p>
          </div>
          {message && <p className="form-error" role="alert">{message}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="portal-list">
            {portals.map((portal) => (
                <button
                  className="portal-card"
                  key={portal.role}
                  type="button"
                  aria-label={portal.button}
                  onClick={() => { setSelectedPortal(portal.role); setError('') }}
                >
                  <span className="portal-card-content">
                    <span className="portal-card-art"><PortalIllustration role={portal.role} /></span>
                    <span className="portal-card-copy">
                      <strong>{portal.title}</strong>
                      <span>{portal.description}</span>
                    </span>
                    <FiChevronRight className="portal-card-chevron" aria-hidden="true" />
                  </span>
                  <span className="portal-card-action">
                    Continue as {portal.title}
                    <FiArrowRight aria-hidden="true" />
                  </span>
                </button>
            ))}
          </div>
          <button className="portal-back explore-back" type="button" onClick={() => { setHasExplored(false); setError('') }}>
            <FiChevronRight aria-hidden="true" />
            Back to explore
          </button>
          <p className="portal-secure"><FiShield aria-hidden="true" /> Secure access for authorized clinical staff</p>
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
