import { createClient } from '@supabase/supabase-js'
import { calculatePoints } from '@/lib/points'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, opts: RequestInit = {}) => fetch(url, { ...opts, cache: 'no-store' }) } }
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WmUser {
  id: string
  email: string
  username: string
  password_hash: string
  is_admin: boolean
  created_at: string
}

export interface WmTip {
  id: string
  user_id: string
  match_id: number
  home_goals: number
  away_goals: number
  points_awarded: number | null
  created_at: string
}

export interface WmMatch {
  match_id: number
  home_team: string
  away_team: string
  home_team_flag: string | null
  away_team_flag: string | null
  utc_date: string
  status: string
  home_score: number | null
  away_score: number | null
  home_penalty_score: number | null
  away_penalty_score: number | null
  minute: number | null
  matchday: number | null
  stage: string | null
  group_name: string | null
  manual_home_score: number | null
  manual_away_score: number | null
  use_manual_score: boolean
  last_updated: string
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  total_points: number
  exact_count: number
  tendency_count: number
  tip_count: number
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<WmUser | null> {
  const { data } = await getClient().from('wm_users').select('*').eq('email', email.toLowerCase()).single()
  return data ?? null
}

export async function findUserByUsername(username: string): Promise<WmUser | null> {
  const { data } = await getClient().from('wm_users').select('*').eq('username', username).single()
  return data ?? null
}

export async function createUser(params: { email: string; username: string; password_hash: string }): Promise<WmUser> {
  const { data, error } = await getClient()
    .from('wm_users')
    .insert({ ...params, email: params.email.toLowerCase() })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Matches ─────────────────────────────────────────────────────────────────

export async function getUpcomingMatches(limit = 10): Promise<WmMatch[]> {
  const { data } = await getClient()
    .from('wm_matches_cache')
    .select('*')
    .in('status', ['SCHEDULED', 'TIMED'])
    .gt('utc_date', new Date().toISOString())
    // Teilnehmer noch nicht bekannt (Finale/Spiel um Platz 3 vor Ende der Halbfinals) —
    // taucht im Spielplan auf, soll aber hier nicht zum Tippen vorgeschlagen werden.
    .neq('home_team', 'TBD')
    .order('utc_date', { ascending: true })
    .limit(limit)
  return data ?? []
}

export async function getAllMatches(): Promise<WmMatch[]> {
  const { data } = await getClient().from('wm_matches_cache').select('*').order('utc_date', { ascending: true })
  return data ?? []
}

export async function getMatchById(matchId: number): Promise<WmMatch | null> {
  const { data } = await getClient().from('wm_matches_cache').select('*').eq('match_id', matchId).single()
  return data ?? null
}

// Notnagel, falls die externe API ein Spiel (z.B. Finale/Spiel um Platz 3) nie
// liefert: Admin legt es von Hand an. match_id ist negativ und damit garantiert
// verschieden von echten API-IDs (parseInt(g.id) ist immer positiv) — der reguläre
// Sync kann so ein manuell angelegtes Spiel nie überschreiben oder duplizieren.
export async function createManualMatch(params: {
  home_team: string
  away_team: string
  home_team_flag: string | null
  away_team_flag: string | null
  utc_date: string
  stage: string
}): Promise<WmMatch> {
  const client = getClient()
  for (let attempt = 0; attempt < 5; attempt++) {
    const match_id = -Math.floor(Date.now() / 1000) - attempt
    const { data, error } = await client
      .from('wm_matches_cache')
      .insert({
        match_id,
        home_team: params.home_team,
        away_team: params.away_team,
        home_team_flag: params.home_team_flag,
        away_team_flag: params.away_team_flag,
        utc_date: params.utc_date,
        stage: params.stage,
        status: 'SCHEDULED',
        home_score: null,
        away_score: null,
        home_penalty_score: null,
        away_penalty_score: null,
        minute: null,
        matchday: null,
        group_name: null,
        manual_home_score: null,
        manual_away_score: null,
        use_manual_score: false,
        last_updated: new Date().toISOString(),
      })
      .select()
      .single()
    if (!error) return data as WmMatch
    // match_id-Kollision (sehr unwahrscheinlich) — nächsten Versuch mit anderer ID.
    if (error.code !== '23505') throw error
  }
  throw new Error('Konnte keine freie match_id finden.')
}

export async function upsertMatches(matches: Partial<WmMatch>[]) {
  const { error } = await getClient().from('wm_matches_cache').upsert(matches, { onConflict: 'match_id' })
  if (!error) return
  // Fallback: Elfmeter-Spalten existieren evtl. noch nicht (Migration ausstehend).
  // Dann ohne diese Felder erneut versuchen, damit der Live-Sync nicht komplett scheitert.
  if (error.message?.includes('penalty_score') || error.code === 'PGRST204') {
    const stripped = matches.map(({ home_penalty_score, away_penalty_score, ...rest }) => rest)
    const { error: retryError } = await getClient().from('wm_matches_cache').upsert(stripped, { onConflict: 'match_id' })
    if (retryError) throw retryError
    return
  }
  throw error
}

export async function upsertMatchesBase(matches: Omit<Partial<WmMatch>, 'home_score' | 'away_score'>[]) {
  if (matches.length === 0) return
  const { error } = await getClient().from('wm_matches_cache').upsert(matches, { onConflict: 'match_id' })
  if (error) throw error
}

export async function getManualOverrideIds(): Promise<Set<number>> {
  const { data } = await getClient().from('wm_matches_cache').select('match_id').eq('use_manual_score', true)
  return new Set((data ?? []).map((r: { match_id: number }) => r.match_id))
}

export async function setMatchScore(matchId: number, homeScore: number, awayScore: number) {
  const { error } = await getClient()
    .from('wm_matches_cache')
    .update({
      // home_score/away_score sind die angezeigten Felder — auch direkt setzen.
      // Sync überschreibt diese bei use_manual_score=true nicht (upsertMatchesBase).
      home_score: homeScore,
      away_score: awayScore,
      manual_home_score: homeScore,
      manual_away_score: awayScore,
      use_manual_score: true,
      status: 'FINISHED',
      last_updated: new Date().toISOString(),
    })
    .eq('match_id', matchId)
  if (error) throw error
}

export async function updateTipPoints(tipId: string, points: number) {
  const { error } = await getClient().from('wm_tips').update({ points_awarded: points }).eq('id', tipId)
  if (error) throw error
}

export async function awardPointsForAllTips(matchId: number, homeScore: number, awayScore: number): Promise<number> {
  const tips = await getTipsForMatch(matchId)
  for (const tip of tips) {
    await updateTipPoints(tip.id, calculatePoints(tip.home_goals, tip.away_goals, homeScore, awayScore))
  }
  return tips.length
}

export async function clearScoresForFutureMatches(): Promise<{ match_id: number; home_team: string; away_team: string }[]> {
  const now = new Date().toISOString()
  const { data, error } = await getClient()
    .from('wm_matches_cache')
    .update({ home_score: null, away_score: null, status: 'SCHEDULED', minute: null, last_updated: now })
    .gt('utc_date', now)
    .neq('status', 'FINISHED')
    .select('match_id, home_team, away_team')
  if (error) throw error
  return data ?? []
}

export async function getFinishedMatches(): Promise<WmMatch[]> {
  const { data } = await getClient()
    .from('wm_matches_cache')
    .select('*')
    .eq('status', 'FINISHED')
    .order('utc_date', { ascending: false })
  return data ?? []
}

export async function getAllTips(): Promise<WmTip[]> {
  const { data } = await getClient().from('wm_tips').select('*')
  return data ?? []
}

// ─── Tips ─────────────────────────────────────────────────────────────────────

export async function getTipByUserAndMatch(userId: string, matchId: number): Promise<WmTip | null> {
  const { data } = await getClient().from('wm_tips').select('*').eq('user_id', userId).eq('match_id', matchId).single()
  return data ?? null
}

export async function getTipsByUser(userId: string): Promise<WmTip[]> {
  const { data } = await getClient().from('wm_tips').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  return data ?? []
}

export async function upsertTip(params: { user_id: string; match_id: number; home_goals: number; away_goals: number }): Promise<WmTip> {
  const { data, error } = await getClient()
    .from('wm_tips')
    .upsert(params, { onConflict: 'user_id,match_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getUnscoredTipsForMatch(matchId: number): Promise<WmTip[]> {
  const { data } = await getClient().from('wm_tips').select('*').eq('match_id', matchId).is('points_awarded', null)
  return data ?? []
}

export async function awardPoints(tipId: string, points: number) {
  const { error } = await getClient().from('wm_tips').update({ points_awarded: points }).eq('id', tipId)
  if (error) throw error
}

export async function getLiveOrNextMatch(): Promise<WmMatch | null> {
  const client = getClient()
  const now = new Date().toISOString()

  // 1. Echtes Live-Spiel — nur wenn Anstoßzeit bereits vergangen ist
  const { data: live } = await client
    .from('wm_matches_cache')
    .select('*')
    .in('status', ['IN_PLAY', 'PAUSED'])
    .lte('utc_date', now)
    .order('utc_date', { ascending: true })
    .limit(1)
  if (live && live.length > 0) return live[0] as WmMatch

  // 2. Kürzlich beendetes Spiel (bis 3h nach Anpfiff)
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const { data: finished } = await client
    .from('wm_matches_cache')
    .select('*')
    .eq('status', 'FINISHED')
    .gt('utc_date', threeHoursAgo)
    .order('utc_date', { ascending: false })
    .limit(1)
  if (finished && finished.length > 0) return finished[0] as WmMatch

  // 3. Spiel hat laut Zeitplan begonnen, Status aber noch TIMED/SCHEDULED
  //    (football-data.org aktualisiert Status mit Verzögerung)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: recent } = await client
    .from('wm_matches_cache')
    .select('*')
    .in('status', ['SCHEDULED', 'TIMED'])
    .gt('utc_date', twoHoursAgo)
    .lte('utc_date', now)
    .order('utc_date', { ascending: false })
    .limit(1)
  if (recent && recent.length > 0) return recent[0] as WmMatch

  // 3. Nächstes geplantes Spiel (TBD-Platzhalter für Finale/Spiel um Platz 3 ausgeschlossen)
  const { data: next } = await client
    .from('wm_matches_cache')
    .select('*')
    .in('status', ['SCHEDULED', 'TIMED'])
    .gt('utc_date', now)
    .neq('home_team', 'TBD')
    .order('utc_date', { ascending: true })
    .limit(1)
  return next && next.length > 0 ? (next[0] as WmMatch) : null
}

// Schoner für den Minutentakt-Sync: true, wenn gerade ein Spielfenster offen
// ist (Anpfiff war vor <3.5h oder ist in <15min). Außerhalb dieser Fenster
// braucht der Sync die langsame externe API nicht zu rufen.
export async function hasActiveMatchWindow(): Promise<boolean> {
  const client = getClient()
  const now = Date.now()
  const from = new Date(now - 3.5 * 60 * 60 * 1000).toISOString()
  const to = new Date(now + 15 * 60 * 1000).toISOString()
  const { data } = await client
    .from('wm_matches_cache')
    .select('match_id')
    .gte('utc_date', from)
    .lte('utc_date', to)
    .limit(1)
  return !!(data && data.length > 0)
}

export async function getTipsForMatch(matchId: number): Promise<WmTip[]> {
  const { data } = await getClient().from('wm_tips').select('*').eq('match_id', matchId)
  return data ?? []
}

export async function getAllUsernames(): Promise<{ id: string; username: string }[]> {
  const { data } = await getClient().from('wm_users').select('id, username')
  return data ?? []
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const client = getClient()
  const [{ data: tips }, { data: users }, { data: allTips }] = await Promise.all([
    client.from('wm_tips').select('user_id, points_awarded').not('points_awarded', 'is', null),
    client.from('wm_users').select('id, username'),
    client.from('wm_tips').select('user_id'),
  ])
  if (!users) return []

  const statsMap = new Map<string, { total: number; exact: number; tendency: number; count: number }>()
  for (const u of users) statsMap.set(u.id, { total: 0, exact: 0, tendency: 0, count: 0 })
  for (const t of allTips ?? []) { const s = statsMap.get(t.user_id); if (s) s.count++ }
  for (const t of tips ?? []) {
    const s = statsMap.get(t.user_id)
    if (!s) continue
    const p = t.points_awarded ?? 0
    s.total += p
    if (p === 3) s.exact++
    if (p === 1) s.tendency++
  }
  return users
    .map(u => { const s = statsMap.get(u.id)!; return { user_id: u.id, username: u.username, total_points: s.total, exact_count: s.exact, tendency_count: s.tendency, tip_count: s.count } })
    .sort((a, b) => b.total_points - a.total_points || b.tip_count - a.tip_count)
}
