'use client'

import { useState, FormEvent, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get('from') ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Login fehlgeschlagen.'); return }
      router.push(from); router.refresh()
    } catch { setError('Netzwerkfehler.') } finally { setLoading(false) }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-header">
          <span className="auth-icon">⚽</span>
          <h1 className="auth-title">WM 2026 Tippspiel</h1>
          <p className="auth-sub">Einloggen und mitspielen</p>
        </div>
        <form onSubmit={handleSubmit} className="form">
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label className="field-label" htmlFor="email">E-Mail</label>
            <input id="email" type="email" className="field-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de" required autoComplete="email" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="password">Passwort</label>
            <input id="password" type="password" className="field-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-full" disabled={loading}>{loading ? 'Einloggen…' : 'Einloggen'}</button>
        </form>
        <p className="auth-footer">Noch kein Konto? <Link href="/register" className="auth-link">Jetzt registrieren</Link></p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
