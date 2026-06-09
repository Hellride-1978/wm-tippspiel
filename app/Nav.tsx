'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface Props {
  username: string
  isAdmin: boolean
}

export default function Nav({ username, isAdmin }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/matches', label: 'Spiele' },
    { href: '/leaderboard', label: 'Tabelle' },
  ]

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/dashboard" className="nav-logo">
          <span className="nav-logo-icon">⚽</span>
          WM 2026
        </Link>
        <div className="nav-links">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${pathname.startsWith(l.href) ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <a
              href="/api/sync-matches"
              className="nav-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sync ↗
            </a>
          )}
        </div>
        <div className="nav-user">
          <span className="nav-username">@{username}</span>
          <button onClick={handleLogout} className="nav-logout">Logout</button>
        </div>
      </div>
    </nav>
  )
}
