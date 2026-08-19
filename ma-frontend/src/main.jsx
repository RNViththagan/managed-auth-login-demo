import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

const apiUrl = window?.configs?.apiUrl ?? '/choreo-apis/copilot-test/whoami-service/v1'

function readCookie(name) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (!m) return null
  try {
    return JSON.parse(atob(decodeURIComponent(m[2])))
  } catch {
    return decodeURIComponent(m[2])
  }
}

function displayName(u) {
  if (!u) return ''
  return u.name || [u.given_name, u.family_name].filter(Boolean).join(' ') || u.username || u.email || u.sub || 'Signed-in user'
}

function initial(u) {
  const n = displayName(u)
  return (n && n[0] ? n[0] : '?').toUpperCase()
}

const c = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1a1a2e', background: '#f6f7fb', minHeight: '100vh', margin: 0 },
  wrap: { maxWidth: 720, margin: '0 auto', padding: '40px 20px' },
  h1: { fontSize: 22, fontWeight: 650, margin: '0 0 4px' },
  sub: { color: '#6b7280', margin: '0 0 28px', fontSize: 14 },
  card: { background: '#fff', border: '1px solid #e6e8ef', borderRadius: 14, padding: 22, marginBottom: 18, boxShadow: '0 1px 2px rgba(16,24,40,.04)' },
  label: { fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#8a90a2', fontWeight: 600, marginBottom: 10 },
  row: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '7px 0', borderTop: '1px solid #f0f1f6', fontSize: 14 },
  key: { color: '#6b7280' },
  val: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, wordBreak: 'break-all', textAlign: 'right' },
  btn: { padding: '10px 18px', fontSize: 15, fontWeight: 550, border: 'none', borderRadius: 9, background: '#4f46e5', color: '#fff', cursor: 'pointer' },
  ghost: { color: '#4f46e5', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  badge: (ok) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#166534' : '#991b1b' }),
  pre: { background: '#0f172a', color: '#cbd5e1', padding: 14, borderRadius: 10, overflowX: 'auto', fontSize: 12, lineHeight: 1.5, margin: 0 },
  avatar: { width: 48, height: 48, borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 600, flexShrink: 0 },
}

function Field({ k, v }) {
  return (
    <div style={c.row}>
      <span style={c.key}>{k}</span>
      <span style={c.val}>{v || '—'}</span>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [backend, setBackend] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => { setSession(readCookie('userinfo')) }, [])

  async function callBackend() {
    setLoading(true)
    setBackend(null)
    try {
      const r = await fetch(`${apiUrl}/whoami`, { credentials: 'include' })
      const text = await r.text()
      let body
      try { body = JSON.parse(text) } catch { body = text }
      setBackend({ status: r.status, ok: r.ok, body })
    } catch (e) {
      setBackend({ status: 0, ok: false, body: String(e) })
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div style={c.page}><div style={c.wrap}>
        <h1 style={c.h1}>Managed Auth Prototype</h1>
        <p style={c.sub}>Sign in with your WSO2 account to continue.</p>
        <div style={{ ...c.card, textAlign: 'center', padding: 40 }}>
          <a href="/auth/login" style={{ ...c.btn, textDecoration: 'none', display: 'inline-block' }}>Sign in with WSO2</a>
        </div>
      </div></div>
    )
  }

  const user = backend?.body?.user
  return (
    <div style={c.page}><div style={c.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={c.h1}>Managed Auth Prototype</h1>
        <a href="/auth/logout" style={c.ghost}>Sign out</a>
      </div>
      <p style={c.sub}>Signed in via Choreo Managed Authentication.</p>

      <div style={c.card}>
        <div style={c.label}>Signed-in user</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 6 }}>
          <div style={c.avatar}>{initial(session)}</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{displayName(session)}</div>
            {session.email && <div style={{ color: '#6b7280', fontSize: 14 }}>{session.email}</div>}
          </div>
        </div>
        <Field k="sub" v={session.sub} />
        {session.groups && <Field k="groups" v={Array.isArray(session.groups) ? session.groups.join(', ') : String(session.groups)} />}
        <p style={{ fontSize: 12, color: '#9aa0b4', margin: '12px 0 0' }}>From the managed-auth <code>userinfo</code> cookie — display only, never trusted for authorization.</p>
      </div>

      <div style={c.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ ...c.label, marginBottom: 0 }}>Backend verification</div>
          {backend && <span style={c.badge(backend.ok)}>{backend.status || 'error'}{backend.ok ? ' OK' : ''}</span>}
        </div>

        <button style={{ ...c.btn, opacity: loading ? 0.6 : 1 }} onClick={callBackend} disabled={loading}>
          {loading ? 'Calling…' : 'Call whoami-service'}
        </button>

        {user && (
          <div style={{ marginTop: 16 }}>
            <Field k="authenticated" v={String(user.authenticated)} />
            <Field k="sub" v={user.sub} />
            <Field k="scopes" v={user.scopes} />
            <Field k="client_id" v={user.clientId} />
            <p style={{ fontSize: 12, color: '#9aa0b4', margin: '12px 0 0' }}>
              Decoded by the backend from the gateway-signed <code>x-jwt-assertion</code> — this is the identity the API trusts.
            </p>
          </div>
        )}

        {backend && !user && (
          <pre style={{ ...c.pre, marginTop: 16 }}>{typeof backend.body === 'string' ? backend.body : JSON.stringify(backend.body, null, 2)}</pre>
        )}

        {backend?.body?.headers && (
          <div style={{ marginTop: 14 }}>
            <button onClick={() => setShowRaw(!showRaw)} style={{ ...c.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {showRaw ? '▾ Hide' : '▸ Show'} raw request headers
            </button>
            {showRaw && <pre style={{ ...c.pre, marginTop: 10 }}>{JSON.stringify(backend.body.headers, null, 2)}</pre>}
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#9aa0b4' }}><code>apiUrl</code> {apiUrl}</p>
    </div></div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
