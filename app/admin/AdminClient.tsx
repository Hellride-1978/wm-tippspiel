'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WmMatch } from '@/lib/db'
import { formatDate, stageLabel } from '../utils'

const STAGE_OPTIONS = ['GROUP_STAGE', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']

export function AdminClient({ matches }: { matches: WmMatch[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<WmMatch | null>(null)
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const [newHome, setNewHome] = useState('')
  const [newAway, setNewAway] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStage, setNewStage] = useState('FINAL')
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState<string | null>(null)

  const [merging, setMerging] = useState(false)
  const [mergeResult, setMergeResult] = useState<string | null>(null)

  async function handleMergeDuplicates() {
    setMerging(true)
    setMergeResult(null)
    try {
      const res = await fetch('/api/admin/merge-duplicates', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        type MergeEntry = { stage: string; removedMatchId: number; keptMatchId: number; tipsMoved: number; tipsDropped: number }
        const merged: MergeEntry[] = data.merged
        setMergeResult(
          merged.length === 0
            ? 'Keine Duplikate gefunden.'
            : `✓ ${merged.length} Duplikat(e) zusammengeführt: ` +
              merged.map(m => `${stageLabel(m.stage)} (${m.tipsMoved} Tipp(s) übernommen${m.tipsDropped > 0 ? `, ${m.tipsDropped} verworfen (bereits auf beiden getippt)` : ''})`).join('; ')
        )
        router.refresh()
      } else {
        setMergeResult(`Fehler: ${data.error}`)
      }
    } finally {
      setMerging(false)
    }
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateResult(null)
    try {
      const res = await fetch('/api/admin/create-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: newHome,
          awayTeam: newAway,
          utcDate: new Date(newDate).toISOString(),
          stage: newStage,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCreateResult(`✓ "${newHome} vs ${newAway}" angelegt.`)
        setNewHome('')
        setNewAway('')
        setNewDate('')
        router.refresh()
      } else {
        setCreateResult(`Fehler: ${data.error}`)
      }
    } finally {
      setCreating(false)
    }
  }

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

      <div className="card-sm" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Duplikate zusammenführen</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              Falls ein manuell angelegtes Spiel und ein später von der API geliefertes Spiel zur selben Phase (z. B. Finale) nebeneinander existieren:
              API-Spiel bleibt, Tipps vom manuellen Spiel werden übernommen, manuelles Spiel wird gelöscht.
            </div>
          </div>
          <button className="btn btn-outline" onClick={handleMergeDuplicates} disabled={merging}>
            {merging ? 'Wird zusammengeführt…' : 'Duplikate bereinigen'}
          </button>
        </div>
        {mergeResult && (
          <p style={{ marginTop: 12, fontSize: 14, color: mergeResult.startsWith('✓') || mergeResult.startsWith('Keine') ? 'var(--green)' : 'var(--red)' }}>
            {mergeResult}
          </p>
        )}
      </div>

      <div className="card-sm" style={{ marginBottom: 24 }}>
        <h2 className="section-title" style={{ marginBottom: 4 }}>Spiel manuell anlegen</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
          Notnagel, falls die externe API ein Spiel (z. B. Finale oder Spiel um Platz 3) nicht oder nicht mehr liefert.
        </p>
        <form onSubmit={handleCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>Heimteam</label>
              <input type="text" value={newHome} onChange={e => setNewHome(e.target.value)} required className="input" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>Auswärtsteam</label>
              <input type="text" value={newAway} onChange={e => setNewAway(e.target.value)} required className="input" style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>Anstoß (lokale Zeit)</label>
              <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} required className="input" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>Phase</label>
              <select value={newStage} onChange={e => setNewStage(e.target.value)} className="input" style={{ width: '100%' }}>
                {STAGE_OPTIONS.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Wird angelegt…' : 'Spiel anlegen'}
          </button>
        </form>
        {createResult && (
          <p style={{ marginTop: 12, fontSize: 14, color: createResult.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>
            {createResult}
          </p>
        )}
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
