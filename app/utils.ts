export function formatDate(utcDate: string): string {
  return new Date(utcDate).toLocaleString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
  }) + ' Uhr'
}

export function stageLabel(stage: string | null): string {
  const map: Record<string, string> = {
    GROUP_STAGE: 'Gruppenphase', ROUND_OF_16: 'Achtelfinale',
    QUARTER_FINALS: 'Viertelfinale', SEMI_FINALS: 'Halbfinale',
    THIRD_PLACE: 'Spiel um Platz 3', FINAL: 'Finale',
  }
  return stage ? (map[stage] ?? stage) : 'Unbekannte Phase'
}

export function groupLabel(group: string | null): string {
  if (!group) return 'Unbekannte Gruppe'
  // "GROUP_A" → "Gruppe A", "Group A" → "Gruppe A"
  const match = group.match(/([A-L])$/)
  return match ? `Gruppe ${match[1]}` : group
}

export function tendencyLabel(pts: number): string {
  if (pts === 3) return 'Exakter Treffer'
  if (pts === 1) return 'Tendenz richtig'
  return 'Falsch'
}
