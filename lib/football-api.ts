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
  // CONCACAF
  USA:'🇺🇸', MEX:'🇲🇽', CAN:'🇨🇦', CRC:'🇨🇷', PAN:'🇵🇦', JAM:'🇯🇲', HON:'🇭🇳',
  TRI:'🇹🇹', CUB:'🇨🇺', GUA:'🇬🇹', SLV:'🇸🇻', NCA:'🇳🇮', HAI:'🇭🇹', CUW:'🇨🇼',
  // CONMEBOL
  ARG:'🇦🇷', BRA:'🇧🇷', COL:'🇨🇴', ECU:'🇪🇨', URU:'🇺🇾', VEN:'🇻🇪', PER:'🇵🇪',
  CHI:'🇨🇱', PAR:'🇵🇾', BOL:'🇧🇴',
  // UEFA
  GER:'🇩🇪', ESP:'🇪🇸', FRA:'🇫🇷', ITA:'🇮🇹', NED:'🇳🇱', POR:'🇵🇹', BEL:'🇧🇪',
  CRO:'🇭🇷', SER:'🇷🇸', SUI:'🇨🇭', POL:'🇵🇱', HUN:'🇭🇺', ROU:'🇷🇴', TUR:'🇹🇷',
  SVK:'🇸🇰', SLO:'🇸🇮', SVN:'🇸🇮', DEN:'🇩🇰', AUT:'🇦🇹', CZE:'🇨🇿', UKR:'🇺🇦',
  ALB:'🇦🇱', GEO:'🇬🇪', NOR:'🇳🇴', SWE:'🇸🇪', ISL:'🇮🇸', IRL:'🇮🇪', FIN:'🇫🇮',
  MKD:'🇲🇰', BIH:'🇧🇦', MNE:'🇲🇪', GRE:'🇬🇷', BUL:'🇧🇬', EST:'🇪🇪', LAT:'🇱🇻',
  LTU:'🇱🇹', ARM:'🇦🇲', AZE:'🇦🇿', KAZ:'🇰🇿', LUX:'🇱🇺', AND:'🇦🇩', CYP:'🇨🇾',
  BLR:'🇧🇾', MDA:'🇲🇩', MOL:'🇲🇩', KOS:'🇽🇰', MLT:'🇲🇹', FRO:'🇫🇴', GIB:'🇬🇮',
  LIE:'🇱🇮', SMR:'🇸🇲',
  ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', SCO:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', WAL:'🏴󠁧󠁢󠁷󠁬󠁳󠁿', NIR:'🇬🇧',
  // CAF
  MAR:'🇲🇦', SEN:'🇸🇳', EGY:'🇪🇬', NGA:'🇳🇬', GHA:'🇬🇭', CIV:'🇨🇮', CMR:'🇨🇲',
  RSA:'🇿🇦', MLI:'🇲🇱', ALG:'🇩🇿', TUN:'🇹🇳', BEN:'🇧🇯', ZAM:'🇿🇲', UGA:'🇺🇬',
  KEN:'🇰🇪', ETH:'🇪🇹', CGO:'🇨🇬', COD:'🇨🇩', ANG:'🇦🇴', MOZ:'🇲🇿', ZIM:'🇿🇼',
  GAB:'🇬🇦', NAM:'🇳🇦', BOT:'🇧🇼', SWZ:'🇸🇿', LES:'🇱🇸', TAN:'🇹🇿', RWA:'🇷🇼',
  BFA:'🇧🇫', NIG:'🇳🇪', GUI:'🇬🇳', SLE:'🇸🇱', LBR:'🇱🇷', GAM:'🇬🇲', MRT:'🇲🇷',
  // AFC
  JPN:'🇯🇵', KOR:'🇰🇷', IRN:'🇮🇷', SAU:'🇸🇦', AUS:'🇦🇺', IRQ:'🇮🇶', QAT:'🇶🇦',
  UAE:'🇦🇪', JOR:'🇯🇴', OMN:'🇴🇲', KUW:'🇰🇼', BHR:'🇧🇭', SYR:'🇸🇾', LIB:'🇱🇧',
  CHN:'🇨🇳', IND:'🇮🇳', THA:'🇹🇭', VIE:'🇻🇳', IDN:'🇮🇩', MYS:'🇲🇾', PAK:'🇵🇰',
  UZB:'🇺🇿', KGZ:'🇰🇬', TJK:'🇹🇯', PHI:'🇵🇭', SGP:'🇸🇬', HKG:'🇭🇰',
  // OFC
  NZL:'🇳🇿', FIJ:'🇫🇯', PNG:'🇵🇬',
}

export function flagForTla(tla: string | null | undefined): string {
  if (!tla) return '🏳'
  return FLAGS[tla.toUpperCase()] ?? '🏳'
}
