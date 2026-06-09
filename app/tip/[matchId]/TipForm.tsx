'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  matchId: number
  homeTeam: string
  awayTeam: string
  existingTip: { homeGoals: number; awayGoals: number } | null
}

export default function TipForm({ matchId, homeTeam, awayTeam, existingTip }: Props) {
  const router = useRouter()
  const [homeGoals, setHomeGoals] = useState(existingTip?.homeGoals ?? 0)
  const [awayGoals, setAwayGoals] = useState(existingTip?.awayGoals ?? 0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const clamp = (v: number) => Math.max(0, Math.min(20, Math.round(v)))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/tips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, homeGoals, awayGoals }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Fehler.'); return }
      setSuccess(true)
      setTimeout(() => { router.push('/matches'); router.refresh() }, 1200)
    } catch { setError('Netzwerkfehler.') } finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="tip-success">
        <div className="tip-success-circle">✓</div>
        <div className="tip-success-text">Tipp gespeichert!</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 8 }}>
      {error && <div className="form-error">{error}</div>}
      {existingTip && <p className="tip-edit-note">Du hast bereits getippt — du kannst deinen Tipp noch ändern.</p>}

      <div className="score-inputs">
        <div className="score-team">
          <span className="score-team-name">{homeTeam}</span>
          <div className="score-control">
            <button type="button" className="score-btn" aria-label={`${homeTeam} Tore verringern`} onClick={() => setHomeGoals(v => clamp(v - 1))}>−</button>
            <input type="number" className="score-input" aria-label={`${homeTeam} Tore`} value={homeGoals} min={0} max={20} onChange={e => setHomeGoals(clamp(Number(e.target.value)))} />
            <button type="button" className="score-btn" aria-label={`${homeTeam} Tore erhöhen`} onClick={() => setHomeGoals(v => clamp(v + 1))}>+</button>
          </div>
        </div>
        <span className="score-colon" aria-hidden="true">:</span>
        <div className="score-team">
          <span className="score-team-name">{awayTeam}</span>
          <div className="score-control">
            <button type="button" className="score-btn" aria-label={`${awayTeam} Tore verringern`} onClick={() => setAwayGoals(v => clamp(v - 1))}>−</button>
            <input type="number" className="score-input" aria-label={`${awayTeam} Tore`} value={awayGoals} min={0} max={20} onChange={e => setAwayGoals(clamp(Number(e.target.value)))} />
            <button type="button" className="score-btn" aria-label={`${awayTeam} Tore erhöhen`} onClick={() => setAwayGoals(v => clamp(v + 1))}>+</button>
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-green btn-full" disabled={loading}>
        {loading ? 'Speichern…' : existingTip ? 'Tipp aktualisieren' : 'Tipp abgeben'}
      </button>
    </form>
  )
}
