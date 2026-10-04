import { useEffect, useState } from 'react'
import { FiArrowLeft, FiMessageSquare, FiSend, FiUsers } from 'react-icons/fi'
import { apiRequest } from '../api'

function Messages({ session, onBack }) {
  const [nurses, setNurses] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session?.accessToken) return undefined

    let active = true
    apiRequest('/api/auth/messages/nurses', session.accessToken)
      .then((result) => {
        if (!active) return
        setNurses(Array.isArray(result) ? result : [])
        if (Array.isArray(result) && result[0]) {
          setSelectedId(result[0].id)
        }
      })
      .catch((loadError) => {
        if (!active) return
        setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (!selectedId || !session?.accessToken) {
      setMessages([])
      return undefined
    }

    let active = true
    apiRequest(`/api/auth/messages/${encodeURIComponent(selectedId)}`, session.accessToken)
      .then((result) => {
        if (!active) return
        setMessages(Array.isArray(result) ? result : [])
      })
      .catch((loadError) => {
        if (!active) return
        setError(loadError.message)
      })

    return () => {
      active = false
    }
  }, [selectedId, session?.accessToken])

  async function handleSend(event) {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || !selectedId || !session?.accessToken) return

    setSending(true)
    setError('')
    try {
      const sentMessage = await apiRequest(`/api/auth/messages/${encodeURIComponent(selectedId)}`, session.accessToken, {
        method: 'POST',
        body: JSON.stringify({ body: trimmed }),
      })
      setMessages((current) => [...current, sentMessage])
      setDraft('')
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  const selectedNurse = nurses.find((nurse) => nurse.id === selectedId) || nurses[0]

  return (
    <div className="page-stack" style={{ gap: 14 }}>
      <section className="page-heading">
        <div>
          
          <h1>COMMUNICATION AREA</h1>
        </div>
        <button className="button button-secondary" type="button" onClick={onBack}>
          <FiArrowLeft aria-hidden="true" /> Back
        </button>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 16 }}>
        <aside className="section-block" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-toolbar" style={{ padding: '14px 16px' }}>
            <div>
              <h2>Inbox</h2>
              <span className="count-label">{nurses.length} contact{nurses.length === 1 ? '' : 's'}</span>
            </div>
            <span className="admin-directory-icon"><FiUsers aria-hidden="true" /></span>
          </div>

          <div style={{ display: 'grid' }}>
            {nurses.length ? nurses.map((nurse) => (
              <button
                key={nurse.id}
                type="button"
                onClick={() => setSelectedId(nurse.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 16px',
                  border: 'none',
                  borderTop: '1px solid rgba(148, 163, 184, 0.18)',
                  background: selectedId === nurse.id ? '#e0f2fe' : '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <span className="table-person" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="avatar avatar-small">{nurse.name?.slice(0, 1)?.toUpperCase() || 'N'}</span>
                  <span>
                    <strong>{nurse.name}</strong>
                    <small style={{ display: 'block', color: '#64748b' }}>{nurse.email || 'Nurse contact'}</small>
                  </span>
                </span>
              </button>
            )) : (
              <div className="empty-state compact-empty" style={{ margin: 16 }}>
                <span className="empty-icon"><FiMessageSquare aria-hidden="true" /></span>
                <div>
                  <strong>{loading ? 'Loading contacts…' : 'No nurse contacts yet'}</strong>
                  <p>Your clinical peers will appear here.</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="section-block" style={{ display: 'flex', flexDirection: 'column', minHeight: 480 }}>
          {selectedNurse ? (
            <>
              <div className="table-toolbar" style={{ padding: '14px 16px', borderBottom: '1px solid rgba(148, 163, 184, 0.18)' }}>
                <div>
                  <h2>{selectedNurse.name}</h2>
                  <span className="count-label">Nurse inbox</span>
                </div>
              </div>

              <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc' }}>
                {messages.length ? (
                  messages.map((message) => {
                    const isMine = message.senderId === session?.nurse?.id
                    return (
                      <div key={message.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '75%',
                          padding: '10px 12px',
                          borderRadius: 12,
                          background: isMine ? '#0f766e' : '#ffffff',
                          color: isMine ? '#ffffff' : '#0f172a',
                          border: isMine ? 'none' : '1px solid rgba(148, 163, 184, 0.22)',
                          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                        }}>
                          <div className="message-body">{message.body}</div>
                          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8 }}>
                            {new Date(message.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="empty-state compact-empty" style={{ flex: 1 }}>
                    <span className="empty-icon"><FiMessageSquare aria-hidden="true" /></span>
                    <div>
                      <strong>No messages yet</strong>
                      <p>Send the first message to begin the conversation.</p>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSend} style={{ padding: 16, borderTop: '1px solid rgba(148, 163, 184, 0.18)' }}>
                {error && <p className="form-error" role="alert" style={{ marginBottom: 8 }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows="3"
                    placeholder="Write a message to the nurse…"
                    style={{ flex: 1, resize: 'vertical', borderRadius: 10, border: '1px solid #cbd5e1', padding: '10px 12px', fontFamily: 'inherit' }}
                  />
                  <button className="button button-primary" type="submit" disabled={sending || !draft.trim()} style={{ alignSelf: 'flex-end' }}>
                    <FiSend aria-hidden="true" /> {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="empty-state compact-empty" style={{ flex: 1 }}>
              <span className="empty-icon"><FiUsers aria-hidden="true" /></span>
              <div>
                <strong>No nurse selected</strong>
                <p>Choose a contact to open the conversation.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Messages
