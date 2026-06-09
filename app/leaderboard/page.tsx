import { getSession } from '@/lib/auth'
import { getLeaderboard } from '@/lib/db'

export const metadata = { title: 'Tabelle' }
export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const session = await getSession()
  if (!session) return null
  const leaderboard = await getLeaderboard()

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Tabelle</h1>
        <p className="page-sub">{leaderboard.length} Teilnehmer</p>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Spieler</th>
              <th scope="col" title="Tipps gesamt">Tipps</th>
              <th scope="col" title="Exakte Treffer"><span aria-hidden="true">🎯</span><span className="sr-only">Exakt</span></th>
              <th scope="col" title="Richtige Tendenz"><span aria-hidden="true">✓</span><span className="sr-only">Tendenz</span></th>
              <th scope="col">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((e, i) => (
              <tr key={e.user_id} className={e.user_id === session.userId ? 'table-me' : ''}>
                <td className="table-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                <td className="table-name">@{e.username}</td>
                <td className="table-num">{e.tip_count}</td>
                <td className="table-num">{e.exact_count}</td>
                <td className="table-num">{e.tendency_count}</td>
                <td className="table-pts">{e.total_points}</td>
              </tr>
            ))}
            {leaderboard.length === 0 && <tr><td colSpan={6} className="table-empty">Noch keine Tipps abgegeben.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card-sm scoring-card" style={{ marginTop: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--ink-3)', marginBottom: 10 }}>Punktesystem</div>
        <div className="scoring-row"><span className="scoring-pts">3P</span><span>Exaktes Ergebnis</span></div>
        <div className="scoring-row"><span className="scoring-pts">1P</span><span>Richtige Tendenz (Sieg / Unentschieden / Niederlage)</span></div>
        <div className="scoring-row"><span className="scoring-pts">0P</span><span>Falsch getippt</span></div>
      </div>
    </div>
  )
}
