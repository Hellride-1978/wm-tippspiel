import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getLiveOrNextMatch, getTipsForMatch, getAllUsernames, getTipByUserAndMatch } from '@/lib/db'
import { calculatePoints } from '@/lib/points'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const match = await getLiveOrNextMatch()
  if (!match) return NextResponse.json({ match: null, tips: [], myTip: null })

  const myTip = await getTipByUserAndMatch(session.userId, match.match_id)

  const kickedOff = new Date(match.utc_date) <= new Date()
  const isPostKickoff = ['IN_PLAY', 'PAUSED', 'FINISHED'].includes(match.status) || kickedOff

  let tips: { username: string; home_goals: number; away_goals: number; current_points: number }[] = []

  if (isPostKickoff) {
    const [rawTips, users] = await Promise.all([
      getTipsForMatch(match.match_id),
      getAllUsernames(),
    ])
    const userMap = new Map(users.map(u => [u.id, u.username]))
    const calcPts = (tH: number, tA: number) =>
      match.home_score != null && match.away_score != null
        ? calculatePoints(tH, tA, match.home_score, match.away_score)
        : 0
    tips = rawTips
      .map(t => ({
        username: userMap.get(t.user_id) ?? 'Unbekannt',
        home_goals: t.home_goals,
        away_goals: t.away_goals,
        current_points: calcPts(t.home_goals, t.away_goals),
      }))
      .sort((a, b) => b.current_points - a.current_points || a.username.localeCompare(b.username))
  }

  return NextResponse.json({
    match: {
      match_id: match.match_id,
      home_team: match.home_team,
      away_team: match.away_team,
      home_team_flag: match.home_team_flag,
      away_team_flag: match.away_team_flag,
      home_score: match.home_score,
      away_score: match.away_score,
      minute: match.minute ?? null,
      status: match.status,
      utc_date: match.utc_date,
    },
    tips,
    myTip: myTip ? { home_goals: myTip.home_goals, away_goals: myTip.away_goals } : null,
  })
}
