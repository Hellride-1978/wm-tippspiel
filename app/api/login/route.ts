import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { findUserByEmail } from '@/lib/db'
import { createSessionToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) return NextResponse.json({ error: 'E-Mail und Passwort erforderlich.' }, { status: 400 })

    const user = await findUserByEmail(email)
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: 'E-Mail oder Passwort falsch.' }, { status: 401 })
    }

    const token = await createSessionToken({ userId: user.id, username: user.username, isAdmin: user.is_admin })
    const res = NextResponse.json({ ok: true, username: user.username })
    res.cookies.set('wm_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' })
    return res
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Login fehlgeschlagen.' }, { status: 500 })
  }
}
