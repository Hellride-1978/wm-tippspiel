import { getSession } from '@/lib/auth'
import { getLeaderboard, getUpcomingMatches, getTipsByUser, getAllMatches } from '@/lib/db'
import Link from 'next/link'
import { formatDate, tendencyLabel } from '../utils'

export const metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const [leaderboard, upcoming, myTips, allMatches] = await Promise.all([
    getLeaderboard(), getUpcomingMatches(10), getTipsByUser(session.userId), getAllMatches(),
  ])

  const myRank = leaderboard.findIndex(e => e.user_id === session.userId) + 1
  const myEntry = leaderboard.find(e => e.user_id === session.userId)
  const matchMap = new Map(allMatches.map(m => [m.match_id, m]))
  const tippedIds = new Set(myTips.map(t => t.match_id))

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">Willkommen zurück, <strong>@{session.username}</strong></p>
      </div>

      {myEntry && (
        <div className="stat-strip card-sm" style={{ marginBottom: 32 }}>
          <div className="stat-rank">#{myRank}</div>
          <div className="stat-info">
            <div className="stat-name">@{myEntry.username}</div>
            <div className="stat-sub">{myEntry.tip_count} Tipps abgegeben · {myEntry.exact_count}× Exakt · {myEntry.tendency_count}× Tendenz</div>
          </div>
          <div className="stat-pts">
            <span className="stat-pts-num">{myEntry.total_points}</span>
            <span className="stat-pts-label">Punkte</span>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Tabelle */}
        <section>
          <div className="section-head">
            <h2 className="section-title">Tabelle</h2>
            <Link href="/leaderboard" className="section-more">Alle anzeigen →</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th scope="col">#</th><th scope="col">Spieler</th><th scope="col">Tipps</th><th scope="col">Punkte</th></tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 8).map((e, i) => (
                  <tr key={e.user_id} className={e.user_id === session.userId ? 'table-me' : ''}>
                    <td className="table-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                    <td className="table-name">@{e.username}</td>
                    <td className="table-num">{e.tip_count}</td>
                    <td className="table-pts">{e.total_points}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && <tr><td colSpan={4} className="table-empty">Noch keine Tipps</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Rechte Spalte */}
        <div>
          {/* Jetzt tippen */}
          <section>
            <div className="section-head">
              <h2 className="section-title">Spiele</h2>
              <Link href="/matches" className="section-more">Alle Spiele →</Link>
            </div>
            <div className="match-list">
              {upcoming.length === 0 && <div className="card-sm empty-state">Keine anstehenden Spiele</div>}
              {upcoming.map(m => {
                const tip = myTips.find(t => t.match_id === m.match_id)
                return (
                  <Link key={m.match_id} href={`/tip/${m.match_id}`} className="match-link">
                    <div className="match-date">{formatDate(m.utc_date)}</div>
                    <div className="match-teams">
                      <span className="match-team">{m.home_team_flag} {m.home_team}</span>
                      <span className="match-vs">{tippedIds.has(m.match_id) && tip ? <span className="score">{tip.home_goals}:{tip.away_goals}</span> : 'vs'}</span>
                      <span className="match-team match-team-away">{m.away_team} {m.away_team_flag}</span>
                    </div>
                    {!tippedIds.has(m.match_id) && <div className="match-cta">Tipp abgeben →</div>}
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Meine letzten Tipps */}
          {myTips.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <div className="section-head"><h2 className="section-title">Meine letzten Tipps</h2></div>
              <div className="match-list">
                {myTips.slice(0, 6).map(tip => {
                  const match = matchMap.get(tip.match_id)
                  if (!match) return null
                  return (
                    <div key={tip.id} className="card-sm tip-row">
                      <div className="tip-row-teams">
                        <span>{match.home_team_flag} {match.home_team}</span>
                        <span style={{ color: 'var(--ink-3)' }}>vs</span>
                        <span>{match.away_team} {match.away_team_flag}</span>
                      </div>
                      <div className="tip-row-scores">
                        <span className="score">Tipp: {tip.home_goals}:{tip.away_goals}</span>
                        {match.status === 'FINISHED' && match.home_score !== null && (
                          <span className="score score-result">Ergebnis: {match.home_score}:{match.away_score}</span>
                        )}
                      </div>
                      {tip.points_awarded !== null && (
                        <div className="tip-row-pts">
                          <span className={`pts-badge pts-${tip.points_awarded}`}>
                            {tip.points_awarded === 3 ? '🎯' : tip.points_awarded === 1 ? '✓' : '✗'} {tip.points_awarded}P — {tendencyLabel(tip.points_awarded)}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
