import { useEffect, useState } from 'react'
import {
  FiActivity,
  FiClipboard,
  FiGrid,
  FiMoreHorizontal,
  FiPlus,
  FiUsers,
} from 'react-icons/fi'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import { apiRequest, getSyncStatus, runSync } from './api'
import {
  AdminDashboard,
  Asses,
  Assesmentrecords,
  AssessmentResultPage,
  Dashboard,
  AccountSettings,
  Analysis,
  Messages,
  More,
  NurseManagement,
  Registeredpatience,
  Registerpatient,
  Login,
  ForgotPassword,
} from './pages'

async function fetchWorkspace(token) {
  const [patientData, assessmentData] = await Promise.all([
    apiRequest('/api/patients', token),
    apiRequest('/api/assessments?limit=500', token),
  ])
  return {
    patients: patientData.patients || [],
    assessments: assessmentData.assessments || [],
  }
}

async function fetchAdminWorkspace(token) {
  const [analytics, nurses] = await Promise.all([
    apiRequest('/api/auth/admin/analytics', token),
    apiRequest('/api/auth/nurses', token),
  ])
  return { analytics, nurses }
}

function readSession() {
  try {
    return JSON.parse(window.localStorage.getItem('clinic-session') || 'null')
  } catch {
    return null
  }
}

function updateSyncStatus(setStatus, nextStatus) {
  setStatus((currentStatus) => {
    if (currentStatus) {
      const currentKeys = Object.keys(currentStatus)
      const nextKeys = Object.keys(nextStatus)
      if (
        currentKeys.length === nextKeys.length
        && nextKeys.every((key) => currentStatus[key] === nextStatus[key])
      ) {
        return currentStatus
      }
    }
    return nextStatus
  })
}

function clearInvalidSession(error, setSession, setAuthMessage) {
  if (error.status !== 401 && error.status !== 403) return
  window.localStorage.removeItem('clinic-session')
  setAuthMessage(error.status === 403
    ? 'Your saved session has the wrong access role. Sign in again.'
    : 'Your session expired. Sign in again.')
  setSession(null)
}

function App() {
  const [session, setSession] = useState(readSession)
  const [view, setView] = useState('dashboard')
  const [patients, setPatients] = useState([])
  const [assessments, setAssessments] = useState([])
  const [adminAnalytics, setAdminAnalytics] = useState(null)
  const [nurseAccounts, setNurseAccounts] = useState([])
  const [editingPatient, setEditingPatient] = useState(null)
  const [assessmentResult, setAssessmentResult] = useState(null)
  const [assessmentExplanation, setAssessmentExplanation] = useState(null)
  const [assessmentExplanationPending, setAssessmentExplanationPending] = useState(false)
  const [assessmentExplanationError, setAssessmentExplanationError] = useState('')
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncError, setSyncError] = useState('')
  const [authPage, setAuthPage] = useState('login')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const isAdmin = session?.nurse?.role === 'admin'

  async function authenticatedRequest(path, options = {}) {
    try {
      return await apiRequest(path, session?.accessToken, options)
    } catch (error) {
      clearInvalidSession(error, setSession, setAuthMessage)
      throw error
    }
  }

  async function refreshSyncStatus(token = session?.accessToken) {
    if (!token) return null
    try {
      const status = await getSyncStatus(token)
      updateSyncStatus(setSyncStatus, status)
      return status
    } catch (error) {
      clearInvalidSession(error, setSession, setAuthMessage)
      return null
    }
  }

  async function refreshWorkspace(token = session?.accessToken) {
    if (!token) return
    setLoading(true)
    try {
      if (isAdmin) {
        const workspaceData = await fetchAdminWorkspace(token)
        setAdminAnalytics(workspaceData.analytics)
        setNurseAccounts(workspaceData.nurses)
      } else {
        const workspaceData = await fetchWorkspace(token)
        setPatients(workspaceData.patients)
        setAssessments(workspaceData.assessments)
      }
      setNotice('')
    } catch (error) {
      setNotice(error.message)
      clearInvalidSession(error, setSession, setAuthMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session?.accessToken) return undefined
    let active = true
    setLoading(true)
    const workspaceRequest = isAdmin
      ? fetchAdminWorkspace(session.accessToken)
      : fetchWorkspace(session.accessToken)
    workspaceRequest
      .then((workspaceData) => {
        if (!active) return
        if (isAdmin) {
          setAdminAnalytics(workspaceData.analytics)
          setNurseAccounts(workspaceData.nurses)
        } else {
          setPatients(workspaceData.patients)
          setAssessments(workspaceData.assessments)
        }
        setNotice('')
      })
      .catch((error) => {
        if (!active) return
        setNotice(error.message)
        clearInvalidSession(error, setSession, setAuthMessage)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [session?.accessToken, isAdmin])

  useEffect(() => {
    const token = session?.accessToken
    if (!token) return undefined

    let active = true
    let syncInProgress = false
    const syncWhenOnline = async () => {
      if (!active || syncInProgress || window.navigator.onLine === false) return
      syncInProgress = true
      try {
        const currentStatus = await getSyncStatus(token)
        if (active) updateSyncStatus(setSyncStatus, currentStatus)
        if (!active || window.navigator.onLine === false) return
        if (!currentStatus.postgresConfigured) {
          if (active) setSyncError(currentStatus.pending > 0
            ? 'Cloud sync is not configured on the backend.'
            : '')
          return
        }
        const result = await runSync(token)
        const updatedStatus = await getSyncStatus(token)
        if (active) updateSyncStatus(setSyncStatus, updatedStatus)
        if (active) setSyncError(updatedStatus.postgresConfigured
          ? ''
          : updatedStatus.pending > 0 ? 'Cloud sync is not configured on the backend.' : '')
        if (!active || (!result.assessments && !result.patients && !result.nurses)) return
        if (isAdmin) {
          const workspaceData = await fetchAdminWorkspace(token)
          if (!active) return
          setAdminAnalytics(workspaceData.analytics)
          setNurseAccounts(workspaceData.nurses)
        } else {
          const workspaceData = await fetchWorkspace(token)
          if (!active) return
          setPatients(workspaceData.patients)
          setAssessments(workspaceData.assessments)
        }
      } catch (error) {
        if (active) {
          setSyncError(error.message || 'Unable to sync with the server.')
          clearInvalidSession(error, setSession, setAuthMessage)
        }
      } finally {
        syncInProgress = false
      }
    }

    const retrySync = () => { void syncWhenOnline() }
    void syncWhenOnline()
    window.addEventListener('online', retrySync)
    window.addEventListener('focus', retrySync)
    const retryInterval = window.setInterval(retrySync, 1000)

    return () => {
      active = false
      window.removeEventListener('online', retrySync)
      window.removeEventListener('focus', retrySync)
      window.clearInterval(retryInterval)
    }
  }, [session?.accessToken, isAdmin])

  function handleLogin(sessionData) {
    window.localStorage.setItem('clinic-session', JSON.stringify(sessionData))
    setAuthMessage('')
    setSession(sessionData)
  }

  async function handleLogout() {
    if (session?.accessToken) {
      apiRequest('/api/auth/logout', session.accessToken, { method: 'POST' }).catch(() => {})
    }
    window.localStorage.removeItem('clinic-session')
    setSession(null)
    setPatients([])
    setAssessments([])
    setAdminAnalytics(null)
    setNurseAccounts([])
    setAssessmentResult(null)
    setAssessmentExplanation(null)
    setSyncStatus(null)
    setView('dashboard')
  }

  async function handlePatientSubmit(patient) {
    await authenticatedRequest(patient.id ? `/api/patients/${encodeURIComponent(patient.id)}` : '/api/patients', {
      method: patient.id ? 'PUT' : 'POST',
      body: JSON.stringify(patient),
    })
    await refreshWorkspace()
    await refreshSyncStatus()
  }

  async function handleAssessmentSubmit(assessment) {
    const result = await authenticatedRequest('/api/assessments', {
      method: 'POST',
      body: JSON.stringify(assessment),
    })
    await refreshWorkspace()
    await refreshSyncStatus()
    return result
  }

  async function handleAssessmentExplain(assessment) {
    return authenticatedRequest('/api/explain', {
      method: 'POST',
      body: JSON.stringify({
        temperature: assessment.temperature,
        bloodPressure: assessment.bloodPressure,
        symptoms: assessment.symptoms,
      }),
    })
  }

  function handleAssessmentComplete(result, assessment) {
    setAssessmentResult(result)
    setAssessmentExplanation(null)
    setAssessmentExplanationError('')
    setAssessmentExplanationPending(true)
    setView('assessment-results')

    handleAssessmentExplain(assessment)
      .then(setAssessmentExplanation)
      .catch((error) => setAssessmentExplanationError(error.message))
      .finally(() => setAssessmentExplanationPending(false))
  }

  async function handleNurseCreate(nurse) {
    await authenticatedRequest('/api/auth/nurses', {
      method: 'POST',
      body: JSON.stringify(nurse),
    })
    await refreshWorkspace()
  }

  async function handleNurseDelete(nurseId) {
    await authenticatedRequest(`/api/auth/nurses/${encodeURIComponent(nurseId)}`, {
      method: 'DELETE',
    })
    await refreshWorkspace()
  }

  if (!session?.accessToken) {
    const authNavigation = (page) => {
      setAuthMessage('')
      setAuthPage(page)
    }

    if (authPage === 'forgot-password') {
      return <ForgotPassword onNavigate={authNavigation} />
    }
    return (
      <Login onLogin={handleLogin} onNavigate={authNavigation} message={authMessage} />
    )
  }

  const nurseNavigation = [
    { id: 'dashboard', label: 'Overview', icon: FiActivity },
    { id: 'assessment', label: 'New assessment', icon: FiPlus },
    { id: 'records', label: 'Assessment records', icon: FiClipboard },
    { id: 'patients', label: 'Patients', icon: FiUsers },
    { id: 'more', label: 'More', icon: FiMoreHorizontal },
  ]
  const adminNavigation = [
    { id: 'dashboard', label: 'Clinic overview', icon: FiGrid },
    { id: 'nurses', label: 'Nurse accounts', icon: FiUsers },
    { id: 'more', label: 'More', icon: FiMoreHorizontal },
  ]
  const navigation = isAdmin ? adminNavigation : nurseNavigation

  function renderPage() {
    if (view === 'settings') {
      return <AccountSettings nurse={session.nurse} onChangePassword={async (currentPassword, newPassword) => {
        await authenticatedRequest('/api/auth/password/change', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword }),
        })
      }} />
    }
    if (view === 'analysis') {
      return <Analysis assessments={assessments} patientCount={patients.length} />
    }
    if (view === 'more') {
      return <More isAdmin={isAdmin} onNavigate={setView} />
    }
    if (view === 'messages' && !isAdmin) {
      return <Messages session={session} onBack={() => setView('more')} />
    }
    if (isAdmin) {
      if (view === 'nurses') {
        return (
          <NurseManagement
            nurses={nurseAccounts}
            loading={loading}
            onCreate={handleNurseCreate}
            onDelete={handleNurseDelete}
          />
        )
      }
      return <AdminDashboard analytics={adminAnalytics} loading={loading} onNavigate={setView} />
    }
    if (view === 'assessment') {
      return <Asses patients={patients} onSubmit={handleAssessmentSubmit} onComplete={handleAssessmentComplete} />
    }
    if (view === 'assessment-results' && assessmentResult) {
      return (
        <AssessmentResultPage
          result={assessmentResult}
          explanation={assessmentExplanation}
          explanationPending={assessmentExplanationPending}
          explanationError={assessmentExplanationError}
          onNavigate={setView}
        />
      )
    }
    if (view === 'records') {
      return <Assesmentrecords assessments={assessments} loading={loading} onRefresh={refreshWorkspace} />
    }
    if (view === 'patients') {
      return <Registeredpatience
        patients={patients}
        loading={loading}
        onRegister={() => { setEditingPatient(null); setView('register') }}
        onEdit={(patient) => { setEditingPatient(patient); setView('register') }}
      />
    }
    if (view === 'register') {
      return (
        <Registerpatient
          key={editingPatient?.id || 'new-patient'}
          initialPatient={editingPatient}
          onSubmit={handlePatientSubmit}
          onCancel={() => { setEditingPatient(null); setView('patients') }}
          onSuccess={() => { setEditingPatient(null); setView('patients') }}
        />
      )
    }
    return (
      <Dashboard
        assessments={assessments}
        patients={patients}
        loading={loading}
        onNavigate={setView}
        onRefresh={refreshWorkspace}
        nurseId={session?.nurse?.id}
      />
    )
  }

  const activeNavigation = view === 'register' ? 'patients' : view === 'assessment-results' ? 'assessment' : view
  const pageTitle = view === 'assessment-results' ? 'Assessment result' : view === 'register'
    ? editingPatient ? 'Edit patient' : 'Register patient'
    : view === 'settings' ? 'Settings'
      : view === 'analysis' ? 'Symptom analysis'
        : view === 'messages' ? 'Team messages'
          : view === 'more' ? 'More'
            : navigation.find((item) => item.id === view)?.label || 'Overview'

  return (
    <div className="workspace">
      <Sidebar
        navigation={navigation}
        activeNavigation={activeNavigation}
        onNavigate={setView}
        session={session}
        onLogout={handleLogout}
        sectionLabel={isAdmin ? 'ADMINISTRATION' : 'WORKSPACE'}
      />

      <div className="workspace-main">
        <Navbar
          pageTitle={pageTitle}
          notice={notice}
          loading={loading}
          onRefresh={() => { refreshWorkspace(); refreshSyncStatus() }}
          syncStatus={isAdmin ? null : syncStatus}
          syncError={isAdmin ? '' : syncError}
        />
        {notice && <div className="notice-bar" role="alert">{notice}</div>}
        <main className="page-content">{renderPage()}</main>
      </div>
    </div>
  )
}

export default App
