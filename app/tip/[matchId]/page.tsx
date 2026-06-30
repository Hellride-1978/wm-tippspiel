import { getSession } from '@/lib/auth'
import { getMatchById, getTipByUserAndMatch } from '@/lib/db'
import { notFound } from 'next/navigation'
import TipForm from './TipForm'
import { formatDate, stageLabel } from '../../utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const match = await getMatchById(Number(matchId))
  if (!match) return { title: 'Tipp' }
  return { title: `${match.home_team} vs ${match.away_team}` }
}

export default async function TipPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const session = await getSession()
  if (!session) return null
  const id = Number(matchId)
  if (isNaN(id)) return notFound()

  const [match, existing] = await Promise.all([getMatchById(id), getTipByUserAndMatch(session.userId, id)])
  if (!match) return notFound()

  const hasStarted = new Date(match.utc_date) <= new Date()

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div className="tip-stage">{stageLabel(match.stage)} — {formatDate(match.utc_date)}</div>
      </div>

      <div className="card">
        <div className="tip-matchup">
          <div className="tip-team">
            <span className="tip-flag">{match.home_team_flag}</span>
            <span className="tip-teamname">{match.home_team}</span>
          </div>
          <span className="tip-dash">–</span>
          <div className="tip-team" style={{ alignItems: 'center' }}>
            <span className="tip-flag">{match.away_team_flag}</span>
            <span className="tip-teamname">{match.away_team}</span>
          </div>
        </div>

        {match.status === 'FINISHED' && match.home_score !== null && (
          <div className="tip-result">
            Endergebnis: <strong className="score score-result">{match.home_score} : {match.away_score}</strong>
            {match.home_penalty_score != null && match.away_penalty_score != null && (
              <span className="score-penalty"> n.E. {match.home_penalty_score}:{match.away_penalty_score}</span>
            )}
          </div>
        )}

        {hasStarted ? (
          <div className="tip-closed">
            <span className="tip-closed-icon">🔒</span>
            <span>Tippen nicht mehr möglich — das Spiel hat bereits begonnen.</span>
            {existing && (
              <div style={{ marginTop: 8 }}>
                Dein Tipp: <span className="score">{existing.home_goals} : {existing.away_goals}</span>
                {existing.points_awarded !== null && (
                  <span className={`pts-badge pts-${existing.points_awarded}`} style={{ marginLeft: 10 }}>
                    {existing.points_awarded}P
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <TipForm
            matchId={id}
            homeTeam={match.home_team}
            awayTeam={match.away_team}
            existingTip={existing ? { homeGoals: existing.home_goals, awayGoals: existing.away_goals } : null}
          />
        )}
      </div>

      <div className="card-sm scoring-card">
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--ink-3)', marginBottom: 10 }}>Punktesystem</div>
        <div className="scoring-row"><span className="scoring-pts">3 Punkte</span><span>Exaktes Ergebnis</span></div>
        <div className="scoring-row"><span className="scoring-pts">1 Punkt</span><span>Richtige Tendenz (Sieg / Unentschieden / Niederlage)</span></div>
        <div className="scoring-row"><span className="scoring-pts">0 Punkte</span><span>Falsch getippt</span></div>
      </div>
    </div>
  )
}
