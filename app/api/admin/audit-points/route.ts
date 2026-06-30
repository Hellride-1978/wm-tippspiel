import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getFinishedMatches, getAllTips, getAllUsernames } from '@/lib/db'
import { calculatePoints, resultForScoring } from '@/lib/points'

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const [matches, allTips, users] = await Promise.all([
    getFinishedMatches(),
    getAllTips(),
    getAllUsernames(),
  ])

  const userMap = new Map(users.map(u => [u.id, u.username]))
  const tipsByMatch = new Map<number, typeof allTips>()
  for (const tip of allTips) {
    if (!tipsByMatch.has(tip.match_id)) tipsByMatch.set(tip.match_id, [])
    tipsByMatch.get(tip.match_id)!.push(tip)
  }

  const report = []
  let totalWrong = 0

  for (const match of matches) {
    const result = resultForScoring(match)
    if (!result) continue
    const resolvedHome = result.home
    const resolvedAway = result.away

    const tips = tipsByMatch.get(match.match_id) ?? []
    const wrongs = []

    for (const tip of tips) {
      const expected = calculatePoints(tip.home_goals, tip.away_goals, resolvedHome, resolvedAway)
      const stored = tip.points_awarded

      if (stored !== expected) {
        wrongs.push({
          username: userMap.get(tip.user_id) ?? tip.user_id,
          tip: `${tip.home_goals}:${tip.away_goals}`,
          stored,
          expected,
        })
        totalWrong++
      }
    }

    if (wrongs.length > 0) {
      report.push({
        match: `${match.home_team} ${resolvedHome}:${resolvedAway} ${match.away_team}`,
        date: match.utc_date,
        wrong_tips: wrongs,
      })
    }
  }

  return NextResponse.json({
    total_finished_matches: matches.length,
    matches_with_errors: report.length,
    total_wrong_tips: totalWrong,
    all_correct: totalWrong === 0,
    errors: report,
  })
}
