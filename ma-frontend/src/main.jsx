import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

// Choreo overwrites public/config.js at deploy time with the connection's service URL.
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

function App() {
  const [session, setSession] = useState(null)
  const [backend, setBackend] = useState(null)

  // What the SPA itself can see about the user, straight from the managed-auth cookie.
  useEffect(() => { setSession(readCookie('userinfo')) }, [])

  // The point of the whole exercise: what does the BACKEND receive?
  // No Authorization header is set — Choreo is expected to attach the token itself.
  async function callBackend() {
    setBackend('calling…')
    try {
      const r = await fetch(`${apiUrl}/whoami`, { credentials: 'include' })
      const text = await r.text()
      let body
      try { body = JSON.parse(text) } catch { body = text }
      setBackend({ status: r.status, body })
    } catch (e) {
      setBackend({ error: String(e) })
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 900 }}>
      <h2>Managed Auth → backend probe</h2>
      <p><code>apiUrl</code>: <code>{apiUrl}</code></p>

      <h3>1. What the SPA sees (userinfo cookie)</h3>
      <pre style={{ background: '#f4f4f4', padding: 12, overflowX: 'auto' }}>
        {session ? JSON.stringify(session, null, 2) : 'not logged in — go to /auth/login'}
      </pre>

      <h3>2. What the BACKEND receives</h3>
      <button onClick={callBackend} style={{ padding: '8px 16px', fontSize: 16 }}>
        Call {apiUrl}/whoami
      </button>
      <pre style={{ background: '#f4f4f4', padding: 12, overflowX: 'auto' }}>
        {backend ? JSON.stringify(backend, null, 2) : '(not called yet)'}
      </pre>

      <p style={{ color: '#666' }}>
        Looking for <code>x-jwt-assertion</code> in the echoed headers — and whether it
        carries <code>groups</code>.
      </p>
      <p><a href="/auth/login">/auth/login</a> · <a href="/auth/userinfo">/auth/userinfo</a></p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
