const BASE_URL = 'https://api.football-data.org/v4'

export interface ApiMatch {
  id: number
  utcDate: string
  status: string
  matchday: number | null
  stage: string
  homeTeam: { name: string | null; tla: string | null }
  awayTeam: { name: string | null; tla: string | null }
  score: { fullTime: { home: number | null; away: number | null } }
}

export async function fetchWcMatches(): Promise<ApiMatch[]> {
  const res = await fetch(`${BASE_URL}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY ?? '' },
    cache: 'no-store',
  } as RequestInit)
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.matches as ApiMatch[]
}

const FLAGS: Record<string, string> = {
  ARG:'🇦🇷',AUS:'🇦🇺',BEL:'🇧🇪',BRA:'🇧🇷',CAN:'🇨🇦',CHI:'🇨🇱',COL:'🇨🇴',CRC:'🇨🇷',
  CRO:'🇭🇷',DEN:'🇩🇰',ECU:'🇪🇨',EGY:'🇪🇬',ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',ESP:'🇪🇸',FRA:'🇫🇷',GER:'🇩🇪',
  GHA:'🇬🇭',GRE:'🇬🇷',HON:'🇭🇳',HUN:'🇭🇺',IRN:'🇮🇷',IRQ:'🇮🇶',ITA:'🇮🇹',JAM:'🇯🇲',
  JPN:'🇯🇵',KOR:'🇰🇷',MAR:'🇲🇦',MEX:'🇲🇽',NED:'🇳🇱',NGA:'🇳🇬',NZL:'🇳🇿',PAN:'🇵🇦',
  PER:'🇵🇪',POL:'🇵🇱',POR:'🇵🇹',QAT:'🇶🇦',ROU:'🇷🇴',SAU:'🇸🇦',SCO:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',SEN:'🇸🇳',
  SER:'🇷🇸',SLO:'🇸🇮',SVK:'🇸🇰',SUI:'🇨🇭',TUN:'🇹🇳',TUR:'🇹🇷',UAE:'🇦🇪',URU:'🇺🇾',
  USA:'🇺🇸',VEN:'🇻🇪',WAL:'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}

export function flagForTla(tla: string | null | undefined): string {
  if (!tla) return '🏳'
  return FLAGS[tla.toUpperCase()] ?? '🏳'
}
