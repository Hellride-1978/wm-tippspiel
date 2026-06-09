import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export interface WmSession {
  userId: string
  username: string
  isAdmin: boolean
}

function getSecret() {
  const s = process.env.WM_JWT_SECRET
  if (!s) throw new Error('WM_JWT_SECRET not set')
  return new TextEncoder().encode(s)
}

export async function createSessionToken(payload: WmSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<WmSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      isAdmin: payload.isAdmin as boolean,
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<WmSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('wm_session')?.value
  if (!token) return null
  return verifySessionToken(token)
}
