import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createManualMatch } from '@/lib/db'
import { flagForName } from '@/lib/worldcup-api'

const VALID_STAGES = ['GROUP_STAGE', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const { homeTeam, awayTeam, utcDate, stage } = await request.json()
  if (typeof homeTeam !== 'string' || !homeTeam.trim() || typeof awayTeam !== 'string' || !awayTeam.trim()) {
    return NextResponse.json({ error: 'Teamnamen fehlen.' }, { status: 400 })
  }
  if (typeof utcDate !== 'string' || isNaN(new Date(utcDate).getTime())) {
    return NextResponse.json({ error: 'Ungültiges Datum.' }, { status: 400 })
  }
  if (typeof stage !== 'string' || !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Ungültige Phase.' }, { status: 400 })
  }

  const match = await createManualMatch({
    home_team: homeTeam.trim(),
    away_team: awayTeam.trim(),
    home_team_flag: flagForName(homeTeam.trim()),
    away_team_flag: flagForName(awayTeam.trim()),
    utc_date: new Date(utcDate).toISOString(),
    stage,
  })

  return NextResponse.json({ ok: true, match })
}
