import axios from 'axios'

const configuredApiBase = process.env.REACT_APP_API_URL
const isLocalBrowser = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const browserOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000'
const API_BASE = (configuredApiBase || (isLocalBrowser ? 'http://127.0.0.1:8000' : browserOrigin)).replace(/\/$/, '')

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { Accept: 'application/json' },
})

export async function apiRequest(path, token, options = {}) {
  try {
    const response = await apiClient.request({
      url: path,
      method: options.method || 'GET',
      data: options.body,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      params: options.params,
    })
    return response.data
  } catch (requestError) {
    if (!axios.isAxiosError(requestError)) throw requestError

    const detail = requestError.response?.data?.detail
    const detailMessage = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => item.msg || item).filter(Boolean).join(' ')
        : ''
    const message = detailMessage
      || (requestError.response
        ? 'The request could not be completed.'
        : 'Could not reach the local API. Check that the backend is running.')
    const error = new Error(message)
    error.status = requestError.response?.status
    throw error
  }
}

export async function login(credentials) {
  return apiRequest('/api/auth/login', null, { method: 'POST', body: JSON.stringify(credentials) })
}

export async function requestPasswordReset(email) {
  return apiRequest('/api/auth/password/request', null, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(email, resetCode, newPassword) {
  return apiRequest('/api/auth/password/reset', null, {
    method: 'POST',
    body: JSON.stringify({ email, resetCode, newPassword }),
  })
}

export async function changePassword(token, currentPassword, newPassword) {
  return apiRequest('/api/auth/password/change', token, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function getAdminAnalytics(token) {
  return apiRequest('/api/auth/admin/analytics', token)
}

export async function listNurses(token) {
  return apiRequest('/api/auth/nurses', token)
}

export async function createNurse(token, payload) {
  return apiRequest('/api/auth/nurses', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteNurse(token, nurseId) {
  return apiRequest(`/api/auth/nurses/${encodeURIComponent(nurseId)}`, token, { method: 'DELETE' })
}

export async function listMessageNurses(token) {
  return apiRequest('/api/auth/messages/nurses', token)
}

export async function listNurseMessages(token, nurseId) {
  return apiRequest(`/api/auth/messages/${encodeURIComponent(nurseId)}`, token)
}

export async function sendNurseMessage(token, nurseId, body) {
  return apiRequest(`/api/auth/messages/${encodeURIComponent(nurseId)}`, token, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export async function listPatients(token) {
  return apiRequest('/api/patients', token)
}

export async function listAssessments(token, limit = 500) {
  return apiRequest('/api/assessments', token, { params: { limit } })
}

export async function getModelCatalog() {
  return apiRequest('/api/model/catalog')
}

export async function predictAssessment(payload, token) {
  return apiRequest('/api/predict', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function explainAssessment(payload, token) {
  return apiRequest('/api/explain', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function triageAssessment(payload, token) {
  return apiRequest('/api/triage', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getSyncStatus(token) {
  return apiRequest('/api/sync/status', token)
}

export async function runSync(token) {
  return apiRequest('/api/sync/run', token, { method: 'POST' })
}

export async function getAssessment(token, assessmentId) {
  return apiRequest(`/api/assessments/${encodeURIComponent(assessmentId)}`, token)
}

export async function listUnsyncedPatients(token) {
  return apiRequest('/api/auth/patients/unsynced', token)
}

export async function logout(token) {
  return apiRequest('/api/auth/logout', token, { method: 'POST' })
}

export async function createPatient(token, patient) {
  return apiRequest('/api/patients', token, {
    method: 'POST',
    body: JSON.stringify(patient),
  })
}

export async function updatePatient(token, patientId, patient) {
  return apiRequest(`/api/patients/${encodeURIComponent(patientId)}`, token, {
    method: 'PUT',
    body: JSON.stringify(patient),
  })
}

export async function createAssessment(token, assessment) {
  return apiRequest('/api/assessments', token, {
    method: 'POST',
    body: JSON.stringify(assessment),
  })
}

export async function syncPendingAssessments(token) {
  return apiRequest('/api/sync/run', token, { method: 'POST' })
}

export async function healthCheck() {
  return apiRequest('/health')
}
