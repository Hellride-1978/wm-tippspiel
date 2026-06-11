import { getSession } from '@/lib/auth'
import { getAllMatches } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AdminClient } from './AdminClient'

export const metadata = { title: 'Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getSession()
  if (!session?.isAdmin) redirect('/dashboard')
  const matches = await getAllMatches()
  return <AdminClient matches={matches} />
}
