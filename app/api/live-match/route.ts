import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getLiveOrNextMatch, getTipsForMatch, getAllUsernames } from '@/lib/db'

function calcPoints(tH: number, tA: number, mH: number | null, mA: number | null): number {
  if (mH === null || mA === null) return 0
  if (tH === mH && tA === mA) return 3
  if (Math.sign(tH - tA) === Math.sign(mH - mA)) return 1
  return 0
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const match = await getLiveOrNextMatch()
  if (!match) return NextResponse.json({ match: null, tips: [] })

  const kickedOff = new Date(match.utc_date) <= new Date()
  const isPostKickoff = ['IN_PLAY', 'PAUSED', 'FINISHED'].includes(match.status) || kickedOff

  let tips: { username: string; home_goals: number; away_goals: number; current_points: number }[] = []

  if (isPostKickoff) {
    const [rawTips, users] = await Promise.all([
      getTipsForMatch(match.match_id),
      getAllUsernames(),
    ])
    const userMap = new Map(users.map(u => [u.id, u.username]))
    tips = rawTips
      .map(t => ({
        username: userMap.get(t.user_id) ?? 'Unbekannt',
        home_goals: t.home_goals,
        away_goals: t.away_goals,
        current_points: calcPoints(t.home_goals, t.away_goals, match.home_score, match.away_score),
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
      home_yellow_cards: match.home_yellow_cards ?? 0,
      away_yellow_cards: match.away_yellow_cards ?? 0,
      home_red_cards: match.home_red_cards ?? 0,
      away_red_cards: match.away_red_cards ?? 0,
      utc_date: match.utc_date,
    },
    tips,
  })
}
