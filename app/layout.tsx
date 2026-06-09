import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/auth'
import Nav from './Nav'
import './globals.css'

export const metadata = {
  title: { default: 'WM 2026 Tippspiel', template: '%s — WM Tippspiel' },
  description: 'WM 2026 Tippspiel — tippe alle Spiele und miss dich mit Freunden.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('wm_session')?.value
  const session = token ? await verifySessionToken(token) : null

  return (
    <html lang="de">
      <body>
        {session && <Nav username={session.username} isAdmin={session.isAdmin} />}
        {children}
      </body>
    </html>
  )
}
