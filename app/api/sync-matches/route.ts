import { NextResponse } from 'next/server'
import { fetchWcGames, flagForName, localDateToUtc, mapStatus, mapStage } from '@/lib/worldcup-api'
import { upsertMatches, upsertMatchesBase, getManualOverrideIds, getTipsForMatch, awardPoints, getAllUsernames, hasActiveMatchWindow } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { calculatePoints, resultForScoring } from '@/lib/points'

// worldcup26.ir antwortet teils sehr langsam (>10s) — Vercel-Timeout hochsetzen
export const maxDuration = 60

export async function GET(request: Request) {
  const isVercelCron = request.headers.get('x-vercel-cron') !== null
  const cronSecret = request.headers.get('x-cron-secret')
  const isExternalCron = cronSecret && cronSecret === process.env.CRON_SECRET
  if (!isVercelCron && !isExternalCron) {
    const session = await getSession()
    if (!session?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }

  // Minutentakt-Schoner: die langsame externe API nur rufen, wenn ein Spiel
  // läuft / gleich beginnt / kürzlich endete. So darf ein externer Scheduler
  // jede Minute pollen, ohne 24/7 Function-Kosten zu erzeugen.
  // Umgehung via ?force=1 oder Vercel-Tagescron (voller Sync für Spielplan/Bracket).
  const force = isVercelCron || new URL(request.url).searchParams.get('force') === '1'
  if (!force && !(await hasActiveMatchWindow())) {
    return NextResponse.json({ ok: true, skipped: 'no active match window' })
  }

  let games
  try {
    games = await fetchWcGames()
  } catch (err) {
    console.error('[sync-matches] worldcup26.ir nicht erreichbar:', err)
    return NextResponse.json({ ok: false, error: 'API nicht erreichbar, Cache bleibt erhalten.' })
  }

  const manualIds = await getManualOverrideIds()

  // Skip knockout games where participants aren't determined yet (null team names)
  const now = new Date().toISOString()
  const rows = games.filter(g => g.home_team_name_en && g.away_team_name_en).map(g => {
    const { status: rawStatus, minute } = mapStatus(g)
    const utc_date = localDateToUtc(g.local_date, g.stadium_id ?? null)
    // API meldet manchmal IN_PLAY/PAUSED bevor das Spiel überhaupt angefangen hat
    const status = (['IN_PLAY', 'PAUSED'].includes(rawStatus) && utc_date > now) ? 'SCHEDULED' : rawStatus
    const rawHome = g.home_score != null && g.home_score !== 'null' ? parseInt(g.home_score) : null
    const rawAway = g.away_score != null && g.away_score !== 'null' ? parseInt(g.away_score) : null
    // Sanity-check: wenn ein Score unrealistisch ist (>20), beide auf null setzen
    const scoresValid = rawHome !== null && rawAway !== null && rawHome >= 0 && rawAway >= 0 && rawHome <= 20 && rawAway <= 20
    const homeScore = scoresValid ? rawHome : null
    const awayScore = scoresValid ? rawAway : null
    // Elfmeterschießen — nur gesetzt, wenn die API beide Werte liefert (K.o.-Spiele).
    const rawHomePen = g.home_penalty_score != null && g.home_penalty_score !== 'null' ? parseInt(g.home_penalty_score) : null
    const rawAwayPen = g.away_penalty_score != null && g.away_penalty_score !== 'null' ? parseInt(g.away_penalty_score) : null
    const penValid = rawHomePen !== null && rawAwayPen !== null && !isNaN(rawHomePen) && !isNaN(rawAwayPen) && rawHomePen >= 0 && rawAwayPen >= 0 && rawHomePen <= 30 && rawAwayPen <= 30
    const homePenaltyScore = penValid ? rawHomePen : null
    const awayPenaltyScore = penValid ? rawAwayPen : null
    return {
      match_id: parseInt(g.id),
      home_team: g.home_team_name_en,
      away_team: g.away_team_name_en,
      home_team_flag: flagForName(g.home_team_name_en),
      away_team_flag: flagForName(g.away_team_name_en),
      utc_date,
      status,
      minute,
      home_score: homeScore,
      away_score: awayScore,
      home_penalty_score: homePenaltyScore,
      away_penalty_score: awayPenaltyScore,
      stage: mapStage(g.type, g.group),
      group_name: g.group ?? null,
      matchday: g.matchday ? parseInt(g.matchday) : null,
      last_updated: new Date().toISOString(),
    }
  })

  // Matches mit manuellem Override: Score, Status UND Minute nicht überschreiben.
  // (Die API meldet diese Spiele teils noch als notstarted/SCHEDULED, was sonst
  //  ein manuell eingetragenes FINISHED-Ergebnis wieder verschwinden ließe.)
  const baseRows = rows
    .filter(r => manualIds.has(r.match_id))
    .map(({ home_score, away_score, home_penalty_score, away_penalty_score, status, minute, ...rest }) => rest)
  const fullRows = rows.filter(r => !manualIds.has(r.match_id))

  try {
    if (fullRows.length > 0) await upsertMatches(fullRows)
    if (baseRows.length > 0) await upsertMatchesBase(baseRows)
  } catch (err) {
    console.error('[sync-matches] DB-Fehler:', err)
    return NextResponse.json({ error: 'DB-Fehler' }, { status: 500 })
  }

  // Punkte vergeben für abgeschlossene Spiele — ALLE Tips neu berechnen,
  // damit Zwischenstand-Fehler beim nächsten Sync korrigiert werden.
  const finished = fullRows.filter(r => r.status === 'FINISHED' && r.home_score !== null && r.away_score !== null)
  let scored = 0
  const usernames = finished.length > 0 ? await getAllUsernames() : []
  const usernameMap = new Map(usernames.map(u => [u.id, u.username]))
  for (const match of finished) {
    const result = resultForScoring(match)
    if (!result) continue
    const penInfo = match.home_penalty_score != null && match.away_penalty_score != null
      ? ` (n.E. ${match.home_penalty_score}:${match.away_penalty_score})` : ''
    const tips = await getTipsForMatch(match.match_id)
    for (const tip of tips) {
      const pts = calculatePoints(tip.home_goals, tip.away_goals, result.home, result.away)
      console.log(`[wm/points] ${usernameMap.get(tip.user_id) ?? tip.user_id} | ${match.home_team} vs ${match.away_team} | Tipp: ${tip.home_goals}:${tip.away_goals} | Ergebnis: ${result.home}:${result.away}${penInfo} | Punkte: ${pts}`)
      await awardPoints(tip.id, pts)
      scored++
    }
  }

  return NextResponse.json({ ok: true, synced: rows.length, finished: finished.length, scored })
}
