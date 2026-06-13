import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { clearScoresForFutureMatches } from '@/lib/db'

export async function POST() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const cleared = await clearScoresForFutureMatches()
  return NextResponse.json({ ok: true, cleared: cleared.length, matches: cleared })
}
