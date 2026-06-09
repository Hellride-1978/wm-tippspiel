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

  function isAllPast(ms: WmMatch[]) {
    return ms.every(m => new Date(m.utc_date) <= now)
  }

  // Stages: eingeklappt wenn alle Spiele vorbei
  const defaultCollapsedStages = new Set(
    sortedStages.filter(stage =>
      isAllPast(Array.from(grouped.get(stage)!.values()).flat())
    )
  )
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(defaultCollapsedStages)

  // Spieltage: eingeklappt wenn alle Spiele vorbei
  const allDayKeys = sortedStages.flatMap(stage =>
    Array.from(grouped.get(stage)!.keys()).map(day => `${stage}::${day}`)
  )
  const defaultCollapsedDays = new Set(
    allDayKeys.filter(key => {
      const [stage, dayStr] = key.split('::')
      const day = dayStr === 'null' ? null : Number(dayStr)
      const ms = grouped.get(stage)?.get(day) ?? []
      return isAllPast(ms)
    })
  )
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(defaultCollapsedDays)

  function toggleStage(stage: string) {
    setCollapsedStages(prev => {
      const next = new Set(prev)
      next.has(stage) ? next.delete(stage) : next.add(stage)
      return next
    })
  }

  function toggleDay(key: string) {
    setCollapsedDays(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
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
        const stageCollapsed = collapsedStages.has(stage)
        const allDone = isAllPast(allMatches)
        const isGroupStage = stage === 'GROUP_STAGE'

        return (
          <div key={stage} className="stage-group">
            <button
              className="stage-toggle"
              onClick={() => toggleStage(stage)}
              aria-expanded={!stageCollapsed}
            >
              <span className="stage-toggle-left">
                <span className="stage-toggle-arrow">{stageCollapsed ? '▶' : '▼'}</span>
                <span className="stage-toggle-name">{stageLabel(stage)}</span>
                {allDone && <span className="stage-badge stage-badge-done">abgeschlossen</span>}
              </span>
              <span className="stage-toggle-meta">{tippedCount}/{allMatches.length} getippt</span>
            </button>

            {!stageCollapsed && sortedDays.map(day => {
              const dayKey = `${stage}::${day}`
              const dayMatches = dayMap.get(day) ?? []
              const dayCollapsed = collapsedDays.has(dayKey)
              const dayDone = isAllPast(dayMatches)
              const dayTipped = dayMatches.filter(m => tipMap.has(m.match_id)).length

              return (
                <div key={day ?? 'null'} className="matchday-group">
                  {/* Spieltag-Header — nur bei Gruppenphase einklappbar */}
                  {day !== null && isGroupStage ? (
                    <button
                      className="matchday-toggle"
                      onClick={() => toggleDay(dayKey)}
                      aria-expanded={!dayCollapsed}
                    >
                      <span className="matchday-toggle-left">
                        <span className="stage-toggle-arrow" style={{ fontSize: 9 }}>{dayCollapsed ? '▶' : '▼'}</span>
                        <span className="matchday-toggle-label">Spieltag {day}</span>
                        {dayDone && <span className="stage-badge stage-badge-done">fertig</span>}
                      </span>
                      <span className="stage-toggle-meta">{dayTipped}/{dayMatches.length} getippt</span>
                    </button>
                  ) : (
                    day !== null && <div className="matchday-label">Spieltag {day}</div>
                  )}

                  {!dayCollapsed && dayMatches.map(match => {
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
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
