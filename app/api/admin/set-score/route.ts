import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { setMatchScore, getTipsForMatch, updateTipPoints } from '@/lib/db'
import { calculatePoints } from '@/lib/points'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const { matchId, homeScore, awayScore } = await request.json()
  if (typeof matchId !== 'number' || typeof homeScore !== 'number' || typeof awayScore !== 'number') {
    return NextResponse.json({ error: 'Ungültige Parameter.' }, { status: 400 })
  }

  await setMatchScore(matchId, homeScore, awayScore)

  const tips = await getTipsForMatch(matchId)
  for (const tip of tips) {
    await updateTipPoints(tip.id, calculatePoints(tip.home_goals, tip.away_goals, homeScore, awayScore))
  }

  return NextResponse.json({ ok: true, scored: tips.length })
}
