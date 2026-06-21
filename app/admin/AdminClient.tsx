'use client'

import { useState } from 'react'
import { WmMatch } from '@/lib/db'
import { formatDate } from '../utils'

export function AdminClient({ matches }: { matches: WmMatch[] }) {
  const [selected, setSelected] = useState<WmMatch | null>(null)
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const pastMatches = matches
    .filter(m => new Date(m.utc_date) <= new Date())
    .sort((a, b) => new Date(b.utc_date).getTime() - new Date(a.utc_date).getTime())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/set-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: selected.match_id,
          homeScore: parseInt(home),
          awayScore: parseInt(away),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(`✓ Gespeichert — ${data.scored} Tipps bewertet`)
        setSelected(null)
        setHome('')
        setAway('')
      } else {
        setResult(`Fehler: ${data.error}`)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleClearFutureScores() {
    if (!confirm('Alle Scores für noch nicht gestartete Spiele löschen?')) return
    setClearing(true)
    try {
      const res = await fetch('/api/admin/clear-future-scores', { method: 'POST' })
      const data = await res.json()
      if (res.ok) setResult(`✓ ${data.cleared} Spiele bereinigt`)
      else setResult(`Fehler: ${data.error}`)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Admin</h1>
        <p className="page-sub">Ergebnisse manuell eintragen</p>
      </div>

      <div className="card-sm" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Cache bereinigen</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Löscht fehlerhafte Scores für noch nicht gestartete Spiele</div>
        </div>
        <button className="btn btn-outline" onClick={handleClearFutureScores} disabled={clearing}>
          {clearing ? 'Wird bereinigt…' : 'Scores zurücksetzen'}
        </button>
      </div>

      {selected && (
        <div className="card-sm" style={{ marginBottom: 24 }}>
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            Ergebnis eintragen: {selected.home_team} vs {selected.away_team}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
                  {selected.home_team}
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={home}
                  onChange={e => setHome(e.target.value)}
                  required
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
              <span style={{ fontSize: 24, fontWeight: 700, paddingTop: 20 }}>:</span>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
                  {selected.away_team}
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={away}
                  onChange={e => setAway(e.target.value)}
                  required
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Speichern…' : 'Ergebnis speichern & Punkte vergeben'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => { setSelected(null); setHome(''); setAway(''); setResult(null) }}>
              Abbrechen
            </button>
          </form>
          {result && (
            <p style={{ marginTop: 12, fontSize: 14, color: result.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>
              {result}
            </p>
          )}
        </div>
      )}

      <div className="card-sm" style={{ marginBottom: 24 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>Spiel auswählen</h2>
        <div className="match-list">
          {pastMatches.map(m => (
            <button
              key={m.match_id}
              className={`match-link${selected?.match_id === m.match_id ? ' match-link--active' : ''}`}
              style={{ textAlign: 'left', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => {
                setSelected(m)
                setHome(m.home_score !== null ? String(m.home_score) : '')
                setAway(m.away_score !== null ? String(m.away_score) : '')
                setResult(null)
              }}
            >
              <div className="match-date">{formatDate(m.utc_date)}</div>
              <div className="match-teams">
                <span className="match-team">{m.home_team_flag} {m.home_team}</span>
                <span className="match-vs">
                  {m.home_score !== null ? (
                    <span className="score">{m.home_score}:{m.away_score}</span>
                  ) : (
                    <span style={{ color: 'var(--ink-3)' }}>?:?</span>
                  )}
                </span>
                <span className="match-team match-team-away">{m.away_team} {m.away_team_flag}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                Status: {m.status}
              </div>
            </button>
          ))}
          {pastMatches.length === 0 && (
            <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Keine vergangenen Spiele</p>
          )}
        </div>
      </div>
    </div>
  )
}
