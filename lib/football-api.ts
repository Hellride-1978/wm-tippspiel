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

// TLA → ISO 3166-1 alpha-2 mapping für alle WM-Teilnehmer + häufige Fußballnationen
const TLA_TO_ISO2: Record<string, string> = {
  // CONCACAF
  USA:'US', MEX:'MX', CAN:'CA', CRC:'CR', PAN:'PA', JAM:'JM', HON:'HN', TRI:'TT',
  CUB:'CU', GUA:'GT', SLV:'SV', NCA:'NI', HAI:'HT',
  // CONMEBOL
  ARG:'AR', BRA:'BR', COL:'CO', ECU:'EC', URU:'UY', VEN:'VE', PER:'PE', CHI:'CL',
  PAR:'PY', BOL:'BO',
  // UEFA
  GER:'DE', ESP:'ES', FRA:'FR', ITA:'IT', NED:'NL', POR:'PT', BEL:'BE', CRO:'HR',
  SER:'RS', SUI:'CH', POL:'PL', HUN:'HU', ROU:'RO', TUR:'TR', SVK:'SK', SLO:'SI',
  DEN:'DK', AUT:'AT', CZE:'CZ', UKR:'UA', ALB:'AL', GEO:'GE', WAL:'GB-WLS',
  NOR:'NO', SWE:'SE', ISL:'IS', IRL:'IE', FIN:'FI', MKD:'MK', BIH:'BA', MNE:'ME',
  GRE:'GR', KOS:'XK', BUL:'BG', EST:'EE', LAT:'LV', LTU:'LT', BLR:'BY', ARM:'AM',
  AZE:'AZ', KAZ:'KZ', LUX:'LU', CYP:'CY', MLT:'MT', AND:'AD', SMR:'SM', FRO:'FO',
  LIE:'LI', GIB:'GI', MOL:'MD',
  // England/Schottland/Wales/Nordirland (Subdivision-Flaggen)
  ENG:'GB-ENG', SCO:'GB-SCT', NIR:'GB-NIR',
  // CAF
  MAR:'MA', SEN:'SN', EGY:'EG', NGA:'NG', GHA:'GH', CIV:'CI', CMR:'CM', RSA:'ZA',
  MLI:'ML', ALG:'DZ', TUN:'TN', BEN:'BJ', ZAM:'ZM', UGA:'UG', KEN:'KE', ETH:'ET',
  CGO:'CG', COD:'CD', ANG:'AO', MOZ:'MZ', ZIM:'ZW', GAB:'GA', CMV:'CV', GUI:'GN',
  GNB:'GW', EQG:'GQ', LBR:'LR', SLE:'SL', BFA:'BF', NIG:'NE', CHA:'TD', CAF:'CF',
  SUD:'SS', SOM:'SO', DJI:'DJ', ERI:'ER', TAN:'TZ', RWA:'RW', BDI:'BI', MWI:'MW',
  ZAN:'ZA', NAM:'NA', BOT:'BW', SWZ:'SZ', LES:'LS', MAD:'MG', MRI:'MU', SEY:'SC',
  COM:'KM', STP:'ST', LBA:'LY', MRT:'MR', GAM:'GM',
  // AFC
  JPN:'JP', KOR:'KR', IRN:'IR', SAU:'SA', AUS:'AU', IRQ:'IQ', QAT:'QA', UAE:'AE',
  OMN:'OM', KUW:'KW', BHR:'BH', JOR:'JO', SYR:'SY', LIB:'LB', YEM:'YE', PLO:'PS',
  CHN:'CN', IND:'IN', THA:'TH', VIE:'VN', IDN:'ID', MYS:'MY', PHI:'PH', SGP:'SG',
  MYA:'MM', KHM:'KH', LAO:'LA', BRN:'BN', TLS:'TL', PAK:'PK', BAN:'BD', SRI:'LK',
  NEP:'NP', AFG:'AF', UZB:'UZ', KGZ:'KG', TJK:'TJ', TKM:'TM', MNG:'MN', HKG:'HK',
  MAC:'MO', TAI:'TW', PRK:'KP',
  // OFC
  NZL:'NZ', FIJ:'FJ', PNG:'PG', SOL:'SB', VAN:'VU', SAM:'WS', TAH:'PF', NCL:'NC',
}

function tlaToFlagEmoji(iso2: string): string {
  // Subdivision-Flaggen (England, Schottland, Wales, Nordirland)
  if (iso2 === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (iso2 === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  if (iso2 === 'GB-WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
  if (iso2 === 'GB-NIR') return '🇬🇧'
  if (iso2 === 'XK') return '🇽🇰' // Kosovo (inoffiziell)
  // Standard ISO 3166-1 alpha-2 → Regional Indicator Symbols
  return [...iso2.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E0 + c.charCodeAt(0) - 65))
    .join('')
}

export function flagForTla(tla: string | null | undefined): string {
  if (!tla) return '🏳'
  const iso2 = TLA_TO_ISO2[tla.toUpperCase()]
  if (!iso2) return '🏳'
  return tlaToFlagEmoji(iso2)
}
