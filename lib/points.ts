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
