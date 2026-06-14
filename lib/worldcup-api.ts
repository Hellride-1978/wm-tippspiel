export interface WorldcupGame {
  id: string
  home_team_name_en: string
  away_team_name_en: string
  home_score: string | null
  away_score: string | null
  home_scorers: string | null
  away_scorers: string | null
  group: string | null
  matchday: string | null
  local_date: string   // "MM/DD/YYYY HH:MM" in CST (UTC-6)
  finished: string     // "TRUE" | "FALSE"
  time_elapsed: string // "notstarted" | "finished" | "HT" | "45'" | "67'" etc.
  type: string         // "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final"
}

const FLAG_MAP: Record<string, string> = {
  'Algeria': '🇩🇿', 'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Austria': '🇦🇹',
  'Belgium': '🇧🇪', 'Bosnia and Herzegovina': '🇧🇦', 'Brazil': '🇧🇷', 'Canada': '🇨🇦',
  'Cape Verde': '🇨🇻', 'Colombia': '🇨🇴', 'Croatia': '🇭🇷', 'Curaçao': '🇨🇼',
  'Czech Republic': '🇨🇿', 'Democratic Republic of the Congo': '🇨🇩',
  'Ecuador': '🇪🇨', 'Egypt': '🇪🇬', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'France': '🇫🇷',
  'Germany': '🇩🇪', 'Ghana': '🇬🇭', 'Haiti': '🇭🇹', 'Iran': '🇮🇷', 'Iraq': '🇮🇶',
  'Ivory Coast': '🇨🇮', 'Japan': '🇯🇵', 'Jordan': '🇯🇴', 'Mexico': '🇲🇽',
  'Morocco': '🇲🇦', 'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿', 'Norway': '🇳🇴',
  'Panama': '🇵🇦', 'Paraguay': '🇵🇾', 'Portugal': '🇵🇹', 'Qatar': '🇶🇦',
  'Saudi Arabia': '🇸🇦', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Senegal': '🇸🇳',
  'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Spain': '🇪🇸', 'Sweden': '🇸🇪',
  'Switzerland': '🇨🇭', 'Tunisia': '🇹🇳', 'Turkey': '🇹🇷', 'United States': '🇺🇸',
  'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿',
}

export function flagForName(name: string): string {
  return FLAG_MAP[name] ?? '🏳'
}

// local_date "MM/DD/YYYY HH:MM" in CDT (UTC-5, Sommerzeit) → ISO UTC string
export function localDateToUtc(localDate: string): string {
  const [datePart, timePart] = localDate.split(' ')
  const [month, day, year] = datePart.split('/')
  const [hour, minute] = timePart.split(':')
  const d = new Date(Date.UTC(
    parseInt(year), parseInt(month) - 1, parseInt(day),
    parseInt(hour) + 5, parseInt(minute)
  ))
  return d.toISOString()
}

export function mapStatus(game: WorldcupGame): { status: string; minute: number | null } {
  if (game.finished === 'TRUE') return { status: 'FINISHED', minute: null }
  const t = game.time_elapsed ?? ''
  if (!t || t === 'notstarted') return { status: 'SCHEDULED', minute: null }
  if (t === 'HT' || t === 'half time' || t === 'halftime') return { status: 'PAUSED', minute: null }
  if (t === 'finished') return { status: 'FINISHED', minute: null }
  const min = parseInt(t)
  if (!isNaN(min)) return { status: 'IN_PLAY', minute: min }
  return { status: 'SCHEDULED', minute: null }
}

export function mapStage(type: string, group: string | null): string {
  const map: Record<string, string> = {
    group: 'GROUP_STAGE',
    r32: 'ROUND_OF_32',
    r16: 'ROUND_OF_16',
    qf: 'QUARTER_FINALS',
    sf: 'SEMI_FINALS',
    third: 'THIRD_PLACE',
    final: 'FINAL',
  }
  return map[type] ?? type.toUpperCase()
}

export async function fetchWcGames(): Promise<WorldcupGame[]> {
  const res = await fetch('https://worldcup26.ir/get/games', { cache: 'no-store' })
  if (!res.ok) throw new Error(`worldcup26.ir ${res.status}`)
  const json = await res.json()
  return (json.games ?? []) as WorldcupGame[]
}
