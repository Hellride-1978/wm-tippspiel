'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { WmMatch, WmTip } from '@/lib/db'
import { formatDate, stageLabel, tendencyLabel } from '../utils'

type Filter = 'all' | 'group' | 'knockout' | 'my'

export default function MatchesClient({ matches, myTips }: { matches: WmMatch[]; myTips: WmTip[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const tipMap = new Map(myTips.map(t => [t.match_id, t]))
  const now = new Date()
  const stageOrder = ['GROUP_STAGE','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL']

  const filtered = matches.filter(m => {
    if (filter === 'group') return m.stage === 'GROUP_STAGE'
    if (filter === 'knockout') return m.stage !== 'GROUP_STAGE' && m.stage !== null
    if (filter === 'my') return tipMap.has(m.match_id)
    return true
  })

  const grouped = new Map<string, Map<number | null, WmMatch[]>>()
  for (const m of filtered) {
    const s = m.stage ?? 'OTHER'
    if (!grouped.has(s)) grouped.set(s, new Map())
    const dm = grouped.get(s)!
    const d = m.matchday ?? null
    if (!dm.has(d)) dm.set(d, [])
    dm.get(d)!.push(m)
  }
  const sortedStages = Array.from(grouped.keys()).sort((a, b) => {
    const ai = stageOrder.indexOf(a), bi = stageOrder.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  // Stages deren alle Spiele bereits gestartet sind → standardmäßig eingeklappt
  const defaultCollapsed = new Set(
    sortedStages.filter(stage => {
      const allMatches = Array.from(grouped.get(stage)!.values()).flat()
      return allMatches.every(m => new Date(m.utc_date) <= now)
    })
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(defaultCollapsed)

  function toggleStage(stage: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(stage) ? next.delete(stage) : next.add(stage)
      return next
    })
  }

  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Alle Spiele</h1></div>
      <div className="filter-bar">
        {(['all','group','knockout','my'] as Filter[]).map(f => (
          <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {{ all: 'Alle', group: 'Gruppenphase', knockout: 'K.O.-Runde', my: 'Meine Tipps' }[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card-sm empty-state">
          {filter === 'my' ? 'Noch keine Tipps abgegeben.' : 'Keine Spiele gefunden.'}
        </div>
      )}

      {sortedStages.map(stage => {
        const dayMap = grouped.get(stage)!
        const sortedDays = Array.from(dayMap.keys()).sort((a, b) => (a ?? 99) - (b ?? 99))
        const allMatches = Array.from(dayMap.values()).flat()
        const tippedCount = allMatches.filter(m => tipMap.has(m.match_id)).length
        const isCollapsed = collapsed.has(stage)
        const allDone = allMatches.every(m => new Date(m.utc_date) <= now)

        return (
          <div key={stage} className="stage-group">
            <button
              className="stage-toggle"
              onClick={() => toggleStage(stage)}
              aria-expanded={!isCollapsed}
            >
              <span className="stage-toggle-left">
                <span className="stage-toggle-arrow">{isCollapsed ? '▶' : '▼'}</span>
                <span className="stage-toggle-name">{stageLabel(stage)}</span>
                {allDone && <span className="stage-badge stage-badge-done">abgeschlossen</span>}
              </span>
              <span className="stage-toggle-meta">
                {tippedCount}/{allMatches.length} getippt
              </span>
            </button>

            {!isCollapsed && sortedDays.map(day => (
              <div key={day ?? 'null'} className="matchday-group">
                {day !== null && <div className="matchday-label">Spieltag {day}</div>}
                {(dayMap.get(day) ?? []).map(match => {
                  const tip = tipMap.get(match.match_id)
                  const started = new Date(match.utc_date) <= now
                  const finished = match.status === 'FINISHED'
                  return (
                    <div key={match.match_id} className="match-row">
                      <div className="match-row-main">
                        <div className="match-date">{formatDate(match.utc_date)}</div>
                        <div className="match-teams">
                          <span className="match-team">{match.home_team_flag} {match.home_team}</span>
                          <span className="match-vs">
                            {finished && match.home_score !== null
                              ? <span className="score score-result">{match.home_score} : {match.away_score}</span>
                              : 'vs'}
                          </span>
                          <span className="match-team match-team-away">{match.away_team} {match.away_team_flag}</span>
                        </div>
                      </div>
                      <div className="match-row-side">
                        {tip ? (
                          <div className="tip-inline">
                            <span className="score">Tipp: {tip.home_goals}:{tip.away_goals}</span>
                            {tip.points_awarded !== null && (
                              <span className={`pts-badge pts-${tip.points_awarded}`}>
                                {tip.points_awarded === 3 ? '🎯' : tip.points_awarded === 1 ? '✓' : '✗'} {tip.points_awarded}P — {tendencyLabel(tip.points_awarded)}
                              </span>
                            )}
                            {!started && <Link href={`/tip/${match.match_id}`} className="edit-link">bearbeiten</Link>}
                          </div>
                        ) : started ? (
                          <span className="no-tip-label">Nicht getippt</span>
                        ) : (
                          <Link href={`/tip/${match.match_id}`} className="btn" style={{ fontSize: 13, padding: '7px 16px' }}>Tippen</Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
