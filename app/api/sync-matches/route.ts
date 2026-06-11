import { NextResponse } from 'next/server'
import { fetchWcGames, flagForName, localDateToUtc, mapStatus, mapStage } from '@/lib/worldcup-api'
import { upsertMatches, upsertMatchesBase, getManualOverrideIds, getUnscoredTipsForMatch, awardPoints } from '@/lib/db'
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

  let games
  try {
    games = await fetchWcGames()
  } catch (err) {
    console.error('[sync-matches] worldcup26.ir nicht erreichbar:', err)
    return NextResponse.json({ ok: false, error: 'API nicht erreichbar, Cache bleibt erhalten.' })
  }

  const manualIds = await getManualOverrideIds()

  const rows = games.map(g => {
    const { status, minute } = mapStatus(g)
    const homeScore = g.home_score != null && g.home_score !== 'null' ? parseInt(g.home_score) : null
    const awayScore = g.away_score != null && g.away_score !== 'null' ? parseInt(g.away_score) : null
    return {
      match_id: parseInt(g.id),
      home_team: g.home_team_name_en,
      away_team: g.away_team_name_en,
      home_team_flag: flagForName(g.home_team_name_en),
      away_team_flag: flagForName(g.away_team_name_en),
      utc_date: localDateToUtc(g.local_date),
      status,
      minute,
      home_score: homeScore,
      away_score: awayScore,
      stage: mapStage(g.type, g.group),
      group_name: g.group ?? null,
      matchday: g.matchday ? parseInt(g.matchday) : null,
      last_updated: new Date().toISOString(),
    }
  })

  // Matches mit manuellem Override: Score-Felder nicht überschreiben
  const baseRows = rows
    .filter(r => manualIds.has(r.match_id))
    .map(({ home_score, away_score, ...rest }) => rest)
  const fullRows = rows.filter(r => !manualIds.has(r.match_id))

  try {
    if (fullRows.length > 0) await upsertMatches(fullRows)
    if (baseRows.length > 0) await upsertMatchesBase(baseRows)
  } catch (err) {
    console.error('[sync-matches] DB-Fehler:', err)
    return NextResponse.json({ error: 'DB-Fehler' }, { status: 500 })
  }

  // Punkte vergeben für abgeschlossene Spiele mit echtem Score
  const finished = fullRows.filter(r => r.status === 'FINISHED' && r.home_score !== null && r.away_score !== null)
  let scored = 0
  for (const match of finished) {
    const tips = await getUnscoredTipsForMatch(match.match_id)
    for (const tip of tips) {
      await awardPoints(tip.id, calcPoints(tip.home_goals, tip.away_goals, match.home_score!, match.away_score!))
      scored++
    }
  }

  return NextResponse.json({ ok: true, synced: rows.length, finished: finished.length, scored })
}
