'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from '@/i18n/navigation'

interface TopbarProps {
  userEmail: string
  onLogout: () => void
}

export default function Topbar({ userEmail, onLogout }: TopbarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const pathname = usePathname()
  const navLinks = [
    { href: '/dashboard', label: 'dashboard' },
    { href: '/history', label: 'history' },
    { href: '/flashcards', label: 'flashcards' },
  ]

  return (
    <header className="topbar">
      <div className="brand flex items-center gap-3">
        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
          Talk Learning
        </span>
      </div>

      <div className="top-nav">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`top-nav__btn ${pathname.startsWith(link.href) ? 'top-nav__btn--active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="top-actions">
        <div className="relative">
          <div
            className="avatar"
            title={userEmail}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            {userEmail.charAt(0).toUpperCase()}
          </div>
          {isSettingsOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50">
              <div className="px-4 py-3 border-b">
                <div className="font-medium text-slate-700">{userEmail}</div>
                <div className="text-xs text-slate-400">Signed in</div>
              </div>
              <button
                onClick={onLogout}
                className="w-full px-4 py-3 text-sm text-left text-red-500 hover:bg-slate-50"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
