'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', username: '', password: '', passwordConfirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Registrierung fehlgeschlagen.'); return }
      router.push('/dashboard'); router.refresh()
    } catch { setError('Netzwerkfehler.') } finally { setLoading(false) }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-header">
          <span className="auth-icon">⚽</span>
          <h1 className="auth-title">Konto erstellen</h1>
          <p className="auth-sub">WM 2026 Tippspiel</p>
        </div>
        <form onSubmit={handleSubmit} className="form">
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label className="field-label" htmlFor="username">Benutzername</label>
            <input id="username" type="text" className="field-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="dein_name" required autoComplete="username" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="email">E-Mail</label>
            <input id="email" type="email" className="field-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="deine@email.de" required autoComplete="email" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="password">Passwort</label>
            <input id="password" type="password" className="field-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 Zeichen" required autoComplete="new-password" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="passwordConfirm">Passwort bestätigen</label>
            <input id="passwordConfirm" type="password" className="field-input" value={form.passwordConfirm} onChange={e => setForm(f => ({ ...f, passwordConfirm: e.target.value }))} placeholder="••••••••" required autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-full" disabled={loading}>{loading ? 'Registrieren…' : 'Konto erstellen'}</button>
        </form>
        <div className="entry-note">
          <span>💶</span>
          <span>2 € Einsatz — bezahl Martin persönlich</span>
        </div>
        <p className="auth-footer">Schon ein Konto? <Link href="/login" className="auth-link">Einloggen</Link></p>
      </div>
    </div>
  )
}
