'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDate } from '../utils'

interface MatchData {
  match_id: number
  home_team: string
  away_team: string
  home_team_flag: string | null
  away_team_flag: string | null
  home_score: number | null
  away_score: number | null
  minute: number | null
  status: string
  home_yellow_cards: number
  away_yellow_cards: number
  home_red_cards: number
  away_red_cards: number
  utc_date: string
}

interface TipRow {
  username: string
  home_goals: number
  away_goals: number
  current_points: number
}

interface LiveData {
  match: MatchData | null
  tips: TipRow[]
}

function getHalfInfo(match: MatchData): { half: string; minute: string } {
  // Wenn die API eine Minute liefert, daraus die Halbzeit ableiten
  if (match.minute != null) {
    if (match.minute <= 45) return { half: '1. HZ', minute: `${match.minute}'` }
    if (match.minute <= 90) return { half: '2. HZ', minute: `${match.minute}'` }
    return { half: 'Verl.', minute: `${match.minute}'` }
  }
  // Sonst aus verstrichener Zeit seit Anpfiff schätzen
  const elapsed = Math.floor((Date.now() - new Date(match.utc_date).getTime()) / 60000)
  if (elapsed <= 45) return { half: '1. HZ', minute: `~${elapsed}'` }
  if (elapsed <= 60) return { half: 'Halbzeit', minute: '' }
  if (elapsed <= 105) return { half: '2. HZ', minute: `~${Math.min(elapsed - 15, 90)}'` }
  return { half: 'Nachspielzeit', minute: `~${elapsed - 15}'` }
}

function StatusBadge({ match }: { match: MatchData }) {
  const kickedOff = new Date(match.utc_date) <= new Date()

  if (match.status === 'PAUSED') {
    return <span className="live-badge live-badge--paused">Halbzeit</span>
  }
  if (match.status === 'FINISHED') {
    return <span className="live-badge live-badge--finished">Ende</span>
  }
  if (match.status === 'IN_PLAY' || (kickedOff && (match.status === 'TIMED' || match.status === 'SCHEDULED'))) {
    const { half, minute } = getHalfInfo(match)
    return (
      <span className="live-badge live-badge--live">
        <span className="live-dot" />
        {half}{minute ? ` · ${minute}` : ''}
      </span>
    )
  }
  return <span className="live-badge live-badge--upcoming">{formatDate(match.utc_date)}</span>
}

function Cards({ yellow, red }: { yellow: number; red: number }) {
  if (yellow === 0 && red === 0) return null
  return (
    <span className="live-cards">
      {Array.from({ length: yellow }).map((_, i) => (
        <span key={`y${i}`} className="live-card live-card--yellow" aria-label="Gelbe Karte" />
      ))}
      {Array.from({ length: red }).map((_, i) => (
        <span key={`r${i}`} className="live-card live-card--red" aria-label="Rote Karte" />
      ))}
    </span>
  )
}

export function LiveMatchWidget({ currentUsername }: { currentUsername: string }) {
  const [data, setData] = useState<LiveData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/live-match')
      if (res.ok) setData(await res.json())
    } catch {
      // Netzwerkfehler — nächster Poll-Tick versucht es erneut
    } finally {
      setRefreshing(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Immer alle 60s pollen: bei SCHEDULED damit der Wechsel zu Live nicht
  // einen Reload erfordert; bei IN_PLAY/PAUSED für Live-Updates.
  // Nur bei FINISHED stoppen.
  useEffect(() => {
    if (initialLoad) return
    const status = data?.match?.status
    if (status === 'FINISHED') return
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [initialLoad, data, fetchData])

  if (initialLoad) return <div className="live-skeleton" aria-hidden="true" />
  if (!data?.match) return null

  const { match, tips } = data
  const kickedOff = new Date(match.utc_date) <= new Date()
  const isPostKickoff = ['IN_PLAY', 'PAUSED', 'FINISHED'].includes(match.status) || kickedOff
  const isScheduled = !isPostKickoff

  return (
    <div className="live-widget card-sm">
      <div className="live-header">
        <StatusBadge match={match} />
        {!initialLoad && refreshing && (
          <span className="live-refreshing">Aktualisiert…</span>
        )}
      </div>

      <div className="live-matchup">
        <div className="live-team live-team--home">
          <span className="live-flag">{match.home_team_flag}</span>
          <span className="live-teamname">{match.home_team}</span>
          <Cards yellow={match.home_yellow_cards} red={match.home_red_cards} />
        </div>

        <div className="live-center">
          {isScheduled ? (
            <span className="live-vs">vs</span>
          ) : (
            <span className="live-score">
              {match.home_score ?? 0} : {match.away_score ?? 0}
            </span>
          )}
        </div>

        <div className="live-team live-team--away">
          <Cards yellow={match.away_yellow_cards} red={match.away_red_cards} />
          <span className="live-teamname">{match.away_team}</span>
          <span className="live-flag">{match.away_team_flag}</span>
        </div>
      </div>

      {isPostKickoff && (
        <div className="live-tips">
          <h3 className="live-tips-title">Tipps</h3>
          {tips.length === 0 ? (
            <p className="table-empty">Noch keine Tipps für dieses Spiel</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Spieler</th>
                  <th>Tipp</th>
                  <th>Punkte</th>
                </tr>
              </thead>
              <tbody>
                {tips.map(tip => (
                  <tr key={tip.username} className={tip.username === currentUsername ? 'table-me' : ''}>
                    <td className="table-name">@{tip.username}</td>
                    <td className="table-num">{tip.home_goals}:{tip.away_goals}</td>
                    <td className="table-pts">{tip.current_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
