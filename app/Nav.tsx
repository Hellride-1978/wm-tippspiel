'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface Props {
  username: string
  isAdmin: boolean
}

export default function Nav({ username, isAdmin }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

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

  function close() { setMenuOpen(false) }

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/dashboard" className="nav-logo" onClick={close}>
            <span className="nav-logo-icon">⚽</span>
            WM 2026
          </Link>

          <div className="nav-links">
            {links.map(l => (
              <Link key={l.href} href={l.href} className={`nav-link${pathname.startsWith(l.href) ? ' active' : ''}`}>
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <a href="/api/sync-matches" className="nav-link" target="_blank" rel="noopener noreferrer">
                Sync ↗
              </a>
            )}
          </div>

          <div className="nav-user">
            <span className="nav-username">@{username}</span>
            <button onClick={handleLogout} className="nav-logout nav-desktop-only">Logout</button>
            <button
              className={`nav-burger${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
              aria-expanded={menuOpen}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="nav-mobile-menu" role="dialog" aria-label="Navigation">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-mobile-link${pathname.startsWith(l.href) ? ' active' : ''}`}
              onClick={close}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <a href="/api/sync-matches" className="nav-mobile-link" target="_blank" rel="noopener noreferrer" onClick={close}>
              Sync ↗
            </a>
          )}
          <div className="nav-mobile-footer">
            <span className="nav-mobile-user">@{username}</span>
            <button onClick={handleLogout} className="nav-logout">Logout</button>
          </div>
        </div>
      )}
    </>
  )
}
