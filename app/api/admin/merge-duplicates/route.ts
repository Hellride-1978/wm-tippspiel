import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { mergeDuplicateStageMatches } from '@/lib/db'

export async function POST() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })

  const merged = await mergeDuplicateStageMatches()
  return NextResponse.json({ ok: true, merged })
}
