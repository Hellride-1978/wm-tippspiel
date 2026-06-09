import { NextResponse } from 'next/server'
import { fetchWcMatches, flagForTla } from '@/lib/football-api'
import { upsertMatches, getUnscoredTipsForMatch, awardPoints } from '@/lib/db'
import { getSession } from '@/lib/auth'

function calcPoints(tH: number, tA: number, mH: number, mA: number): number {
  if (tH === mH && tA === mA) return 3
  if (Math.sign(tH - tA) === Math.sign(mH - mA)) return 1
  return 0
}

export async function GET(request: Request) {
  const cronSecret = request.headers.get('x-cron-secret')
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET
  if (!isCron) {
    const session = await getSession()
    if (!session?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }
  try {
    const apiMatches = await fetchWcMatches()
    const rows = apiMatches.map(m => ({
      match_id: m.id, home_team: m.homeTeam.name ?? 'TBD', away_team: m.awayTeam.name ?? 'TBD',
      home_team_flag: flagForTla(m.homeTeam.tla), away_team_flag: flagForTla(m.awayTeam.tla),
      utc_date: m.utcDate, status: m.status, home_score: m.score.fullTime.home ?? null,
      away_score: m.score.fullTime.away ?? null, matchday: m.matchday ?? null,
      stage: m.stage ?? null, last_updated: new Date().toISOString(),
    }))
    await upsertMatches(rows)

    const finished = rows.filter(r => r.status === 'FINISHED' && r.home_score !== null && r.away_score !== null)
    let scored = 0
    for (const match of finished) {
      const tips = await getUnscoredTipsForMatch(match.match_id)
      for (const tip of tips) {
        await awardPoints(tip.id, calcPoints(tip.home_goals, tip.away_goals, match.home_score!, match.away_score!))
        scored++
      }
    }
    return NextResponse.json({ ok: true, synced: rows.length, finished: finished.length, scored })
  } catch (err) {
    console.error('[sync-matches]', err)
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
