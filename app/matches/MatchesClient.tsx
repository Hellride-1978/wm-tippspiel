'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { WmMatch, WmTip } from '@/lib/db'
import { formatDate, stageLabel, groupLabel, tendencyLabel } from '../utils'

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

  // Group by stage, then within GROUP_STAGE by group_name, otherwise by matchday
  const stageMap = new Map<string, Map<string, WmMatch[]>>()
  for (const m of filtered) {
    const s = m.stage ?? 'OTHER'
    if (!stageMap.has(s)) stageMap.set(s, new Map())
    const innerMap = stageMap.get(s)!
    const key = s === 'GROUP_STAGE'
      ? (m.group_name ?? 'UNKNOWN')
      : String(m.matchday ?? 'null')
    if (!innerMap.has(key)) innerMap.set(key, [])
    innerMap.get(key)!.push(m)
  }

  const sortedStages = Array.from(stageMap.keys()).sort((a, b) => {
    const ai = stageOrder.indexOf(a), bi = stageOrder.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  function isAllPast(ms: WmMatch[]) {
    return ms.every(m => new Date(m.utc_date) <= now)
  }

  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem('wm-collapsed-stages')
      if (saved) return new Set(JSON.parse(saved))
    } catch {}
    return new Set(sortedStages)
  })

  const allInnerKeys = sortedStages.flatMap(stage =>
    Array.from(stageMap.get(stage)!.keys()).map(key => `${stage}::${key}`)
  )
  const [collapsedInner, setCollapsedInner] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem('wm-collapsed-inner')
      if (saved) return new Set(JSON.parse(saved))
    } catch {}
    return new Set(allInnerKeys)
  })

  useEffect(() => {
    try { sessionStorage.setItem('wm-collapsed-stages', JSON.stringify([...collapsedStages])) } catch {}
  }, [collapsedStages])

  useEffect(() => {
    try { sessionStorage.setItem('wm-collapsed-inner', JSON.stringify([...collapsedInner])) } catch {}
  }, [collapsedInner])

  function toggleStage(stage: string) {
    setCollapsedStages(prev => {
      const next = new Set(prev)
      next.has(stage) ? next.delete(stage) : next.add(stage)
      return next
    })
  }

  function toggleInner(key: string) {
    setCollapsedInner(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function innerLabel(stage: string, key: string): string {
    if (stage === 'GROUP_STAGE') return groupLabel(key)
    const day = parseInt(key)
    return isNaN(day) ? '' : `Spieltag ${day}`
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
        const innerMap = stageMap.get(stage)!
        const sortedInner = Array.from(innerMap.keys()).sort((a, b) => {
          // groups: sort A-L alphabetically; matchdays: sort numerically
          if (stage === 'GROUP_STAGE') return a.localeCompare(b)
          return (parseInt(a) || 99) - (parseInt(b) || 99)
        })
        const allMatches = Array.from(innerMap.values()).flat()
        const tippedCount = allMatches.filter(m => tipMap.has(m.match_id)).length
        const stageCollapsed = collapsedStages.has(stage)
        const allDone = isAllPast(allMatches)

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

            {!stageCollapsed && sortedInner.map(innerKey => {
              const fullKey = `${stage}::${innerKey}`
              const innerMatches = innerMap.get(innerKey) ?? []
              const innerCollapsed = collapsedInner.has(fullKey)
              const innerDone = isAllPast(innerMatches)
              const innerTipped = innerMatches.filter(m => tipMap.has(m.match_id)).length
              const label = innerLabel(stage, innerKey)

              return (
                <div key={innerKey} className="matchday-group">
                  {label && (
                    <button
                      className="matchday-toggle"
                      onClick={() => toggleInner(fullKey)}
                      aria-expanded={!innerCollapsed}
                    >
                      <span className="matchday-toggle-left">
                        <span className="stage-toggle-arrow" style={{ fontSize: 9 }}>{innerCollapsed ? '▶' : '▼'}</span>
                        <span className="matchday-toggle-label">{label}</span>
                        {innerDone && <span className="stage-badge stage-badge-done">fertig</span>}
                      </span>
                      <span className="stage-toggle-meta">{innerTipped}/{innerMatches.length} getippt</span>
                    </button>
                  )}

                  {!innerCollapsed && (
                    <div className="matches-grid">
                      {innerMatches.map(match => {
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
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
