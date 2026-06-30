export function calculatePoints(
  tipHome: number,
  tipAway: number,
  resultHome: number,
  resultAway: number
): number {
  if (tipHome === resultHome && tipAway === resultAway) return 3
  const tipTendency = Math.sign(tipHome - tipAway)
  const resultTendency = Math.sign(resultHome - resultAway)
  if (tipTendency === resultTendency) return 1
  return 0
}

// Das für die Wertung maßgebliche Ergebnis eines Spiels (kicktipp-Standard).
// Bei einem Elfmeterschießen werden die Elfmetertore aufs reguläre Ergebnis
// addiert (1:1 + 3:4 = 4:5). Manuelle Admin-Overrides sind final und werden
// nie um Elfmeter ergänzt. Gibt null zurück, wenn (noch) kein Ergebnis vorliegt.
export function resultForScoring(m: {
  home_score: number | null
  away_score: number | null
  home_penalty_score?: number | null
  away_penalty_score?: number | null
  manual_home_score?: number | null
  manual_away_score?: number | null
  use_manual_score?: boolean
}): { home: number; away: number } | null {
  if (m.use_manual_score) {
    if (m.manual_home_score == null || m.manual_away_score == null) return null
    return { home: m.manual_home_score, away: m.manual_away_score }
  }
  if (m.home_score == null || m.away_score == null) return null
  if (m.home_penalty_score != null && m.away_penalty_score != null) {
    return { home: m.home_score + m.home_penalty_score, away: m.away_score + m.away_penalty_score }
  }
  return { home: m.home_score, away: m.away_score }
}
