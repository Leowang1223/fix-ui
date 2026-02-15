'use client'

import Link from 'next/link'
import { usePathname } from '@/i18n/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/dashboard',
      label: '開始面試',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M8 7h8M8 12h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      active: pathname === '/dashboard'
    },
    {
      href: '/history',
      label: '面試紀錄',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      active: pathname === '/history'
    }
  ]

  return (
    <aside className="sidebar" id="sidebar">
      <div className="nav-group">
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${item.active ? 'active' : ''}`}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
