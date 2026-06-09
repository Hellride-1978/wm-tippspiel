import { getSession } from '@/lib/auth'
import { getAllMatches, getTipsByUser } from '@/lib/db'
import MatchesClient from './MatchesClient'

export const metadata = { title: 'Alle Spiele' }
export const dynamic = 'force-dynamic'

export default async function MatchesPage() {
  const session = await getSession()
  if (!session) return null
  const [matches, myTips] = await Promise.all([getAllMatches(), getTipsByUser(session.userId)])
  return <MatchesClient matches={matches} myTips={myTips} />
}
