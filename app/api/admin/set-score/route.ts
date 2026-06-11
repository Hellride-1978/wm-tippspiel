import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { setMatchScore, getTipsForMatch, updateTipPoints } from '@/lib/db'

function calcPoints(tH: number, tA: number, mH: number, mA: number): number {
  if (tH === mH && tA === mA) return 3
  if (Math.sign(tH - tA) === Math.sign(mH - mA)) return 1
  return 0
}

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
    await updateTipPoints(tip.id, calcPoints(tip.home_goals, tip.away_goals, homeScore, awayScore))
  }

  return NextResponse.json({ ok: true, scored: tips.length })
}
