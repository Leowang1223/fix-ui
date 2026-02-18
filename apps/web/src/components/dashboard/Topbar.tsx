'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from '@/i18n/navigation'

interface TopbarProps {
  userEmail: string
  onLogout: () => void
}

export default function Topbar({ userEmail, onLogout }: TopbarProps) {
  const t = useTranslations('topbar')
  const tCommon = useTranslations('common')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const navLinks = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/history', label: t('history') },
    { href: '/flashcards', label: t('flashcards') },
  ]

  // Close dropdown on outside click
  useEffect(() => {
    if (!isSettingsOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isSettingsOpen])

  return (
    <header className="topbar">
      <div className="brand flex items-center gap-3">
        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
          {tCommon('appName')}
        </span>
      </div>

      <nav className="top-nav" aria-label={t('mainNavigation')}>
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`top-nav__btn ${pathname.startsWith(link.href) ? 'top-nav__btn--active' : ''}`}
            aria-current={pathname.startsWith(link.href) ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="top-actions">
        <div className="relative" ref={dropdownRef}>
          <button
            className="avatar"
            title={userEmail}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            aria-expanded={isSettingsOpen}
            aria-haspopup="true"
            aria-label={t('userMenu')}
          >
            {userEmail.charAt(0).toUpperCase()}
          </button>
          {isSettingsOpen && (
            <div
              className="absolute right-0 mt-2 w-48 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50"
              role="menu"
            >
              <div className="px-4 py-3 border-b">
                <div className="font-medium text-slate-700 truncate">{userEmail}</div>
                <div className="text-xs text-slate-400">{t('signedIn')}</div>
              </div>
              <button
                onClick={onLogout}
                className="w-full px-4 py-3 text-sm text-left text-red-500 hover:bg-slate-50 rounded-b-2xl"
                role="menuitem"
              >
                {t('logOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
