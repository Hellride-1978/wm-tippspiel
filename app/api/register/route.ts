import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createUser, findUserByEmail, findUserByUsername } from '@/lib/db'
import { createSessionToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, username, password, passwordConfirm } = await request.json()
    if (!email || !username || !password) return NextResponse.json({ error: 'Alle Felder sind erforderlich.' }, { status: 400 })
    if (password !== passwordConfirm) return NextResponse.json({ error: 'Passwörter stimmen nicht überein.' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen haben.' }, { status: 400 })
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(username)) return NextResponse.json({ error: 'Benutzername: nur Buchstaben, Zahlen, _, - und . erlaubt.' }, { status: 400 })

    const [existingEmail, existingUsername] = await Promise.all([findUserByEmail(email), findUserByUsername(username)])
    if (existingEmail) return NextResponse.json({ error: 'Diese E-Mail ist bereits registriert.' }, { status: 409 })
    if (existingUsername) return NextResponse.json({ error: 'Dieser Benutzername ist bereits vergeben.' }, { status: 409 })

    const password_hash = await bcrypt.hash(password, 10)
    const user = await createUser({ email, username, password_hash })
    const token = await createSessionToken({ userId: user.id, username: user.username, isAdmin: user.is_admin })

    const res = NextResponse.json({ ok: true, username: user.username })
    res.cookies.set('wm_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' })
    return res
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Registrierung fehlgeschlagen.' }, { status: 500 })
  }
}
