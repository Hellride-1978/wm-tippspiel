import { getSession } from '@/lib/auth'
import { getFinishedMatches, getAllTips, getAllUsernames } from '@/lib/db'
import { calculatePoints } from '@/lib/points'
import { formatDate, stageLabel } from '../utils'

export const metadata = { title: 'Spielhistorie' }
export const dynamic = 'force-dynamic'

function pointsLabel(pts: number): string {
  if (pts === 3) return 'Exaktes Ergebnis'
  if (pts === 1) return 'Tendenz'
  return 'Daneben'
}

export default async function HistoryPage() {
  const session = await getSession()
  if (!session) return null

  const [matches, allTips, users] = await Promise.all([
    getFinishedMatches(),
    getAllTips(),
    getAllUsernames(),
  ])

  const userMap = new Map(users.map(u => [u.id, u.username]))

  const tipsByMatch = new Map<number, typeof allTips>()
  for (const tip of allTips) {
    if (!tipsByMatch.has(tip.match_id)) tipsByMatch.set(tip.match_id, [])
    tipsByMatch.get(tip.match_id)!.push(tip)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Spielhistorie</h1>
        <p className="page-sub">{matches.length} abgeschlossene Spiele · {users.length} Teilnehmer</p>
      </div>

      {matches.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
          Noch keine abgeschlossenen Spiele.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {matches.map(match => {
          const resolvedHome = match.use_manual_score ? match.manual_home_score : match.home_score
          const resolvedAway = match.use_manual_score ? match.manual_away_score : match.away_score

          const matchTips = tipsByMatch.get(match.match_id) ?? []
          const tippedUserIds = new Set(matchTips.map(t => t.user_id))

          const tipsWithPoints = matchTips.map(tip => ({
            userId: tip.user_id,
            username: userMap.get(tip.user_id) ?? 'Unbekannt',
            home_goals: tip.home_goals,
            away_goals: tip.away_goals,
            points: tip.points_awarded ?? (
              resolvedHome != null && resolvedAway != null
                ? calculatePoints(tip.home_goals, tip.away_goals, resolvedHome, resolvedAway)
                : 0
            ),
          })).sort((a, b) => b.points - a.points || a.username.localeCompare(b.username))

          const nonTippers = users.filter(u => !tippedUserIds.has(u.id))

          return (
            <div
              key={match.match_id}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}
            >
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <div className="match-date">
                  {formatDate(match.utc_date)}{match.stage ? ` · ${stageLabel(match.stage)}` : ''}
                </div>
                <div className="match-teams" style={{ marginTop: 8 }}>
                  <span className="match-team">{match.home_team_flag} {match.home_team}</span>
                  <span className="score score-result" style={{ fontSize: 20, textAlign: 'center' }}>
                    {resolvedHome} : {resolvedAway}
                  </span>
                  <span className="match-team match-team-away">{match.away_team} {match.away_team_flag}</span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Spieler</th>
                      <th style={{ textAlign: 'center' }}>Tipp</th>
                      <th style={{ textAlign: 'center' }}>Punkte</th>
                      <th>Begründung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tipsWithPoints.map(t => (
                      <tr key={t.userId} className={t.userId === session.userId ? 'table-me' : ''}>
                        <td className="table-name">
                          @{t.username}{t.userId === session.userId ? ' (du)' : ''}
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 14 }}>
                          {t.home_goals} : {t.away_goals}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`pts-badge pts-${t.points}`}>{t.points}</span>
                        </td>
                        <td style={{ color: 'var(--ink-3)', fontSize: 13 }}>{pointsLabel(t.points)}</td>
                      </tr>
                    ))}
                    {nonTippers.map(u => (
                      <tr key={u.id} style={{ opacity: 0.45 }}>
                        <td className="table-name">@{u.username}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>–</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>–</td>
                        <td style={{ color: 'var(--ink-3)', fontSize: 13 }}>Kein Tipp</td>
                      </tr>
                    ))}
                    {tipsWithPoints.length === 0 && nonTippers.length === 0 && (
                      <tr><td colSpan={4} className="table-empty">Keine Teilnehmer.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
