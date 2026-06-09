import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTipsByUser, upsertTip, getMatchById } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
  return NextResponse.json(await getTipsByUser(session.userId))
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 })
  try {
    const { matchId, homeGoals, awayGoals } = await request.json()
    if (typeof matchId !== 'number' || typeof homeGoals !== 'number' || typeof awayGoals !== 'number') return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })
    if (homeGoals < 0 || homeGoals > 20 || awayGoals < 0 || awayGoals > 20) return NextResponse.json({ error: 'Tore zwischen 0 und 20.' }, { status: 400 })

    const match = await getMatchById(matchId)
    if (!match) return NextResponse.json({ error: 'Spiel nicht gefunden.' }, { status: 404 })
    if (new Date(match.utc_date) <= new Date()) return NextResponse.json({ error: 'Tippen nicht mehr möglich — das Spiel hat bereits begonnen.' }, { status: 403 })

    const tip = await upsertTip({ user_id: session.userId, match_id: matchId, home_goals: homeGoals, away_goals: awayGoals })
    return NextResponse.json(tip)
  } catch (err) {
    console.error('[tips POST]', err)
    return NextResponse.json({ error: 'Tipp konnte nicht gespeichert werden.' }, { status: 500 })
  }
}
