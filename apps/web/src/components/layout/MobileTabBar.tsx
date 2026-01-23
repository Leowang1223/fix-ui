'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, BookOpen, MessageSquare, BarChart3, User } from 'lucide-react'
import { motion } from 'framer-motion'

interface TabItem {
  id: string
  label: string
  labelZh: string
  icon: typeof Home
  href: string
  matchPaths: string[]
}

const tabs: TabItem[] = [
  {
    id: 'home',
    label: 'Home',
    labelZh: '首頁',
    icon: Home,
    href: '/dashboard',
    matchPaths: ['/dashboard']
  },
  {
    id: 'learn',
    label: 'Learn',
    labelZh: '課程',
    icon: BookOpen,
    href: '/lesson/L1',
    matchPaths: ['/lesson']
  },
  {
    id: 'talk',
    label: 'Talk',
    labelZh: '對話',
    icon: MessageSquare,
    href: '/conversation',
    matchPaths: ['/conversation']
  },
  {
    id: 'report',
    label: 'Report',
    labelZh: '報告',
    icon: BarChart3,
    href: '/history',
    matchPaths: ['/history', '/report', '/analysis']
  },
  {
    id: 'profile',
    label: 'Profile',
    labelZh: '我的',
    icon: User,
    href: '/profile',
    matchPaths: ['/profile', '/settings']
  }
]

export default function MobileTabBar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (tab: TabItem) => {
    return tab.matchPaths.some(path => pathname.startsWith(path))
  }

  const handleTabClick = (tab: TabItem) => {
    router.push(tab.href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-white/50 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]" />

      {/* Safe area padding for iPhone notch */}
      <div className="relative flex items-center justify-around px-2 mobile-tab-safe">
        {tabs.map((tab) => {
          const active = isActive(tab)
          const Icon = tab.icon

          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`
                relative flex flex-col items-center justify-center
                min-w-[64px] min-h-[56px] py-2 px-3
                rounded-2xl transition-all duration-200
                touch-manipulation
                ${active
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-600 active:text-slate-700'
                }
              `}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Active indicator pill */}
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-blue-50 rounded-2xl"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icon container */}
              <div className="relative z-10 flex items-center justify-center">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 2}
                  className="transition-all duration-200"
                />

                {/* Active dot indicator */}
                {active && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  relative z-10 mt-1 text-[10px] font-medium
                  transition-all duration-200
                  ${active ? 'text-blue-600' : 'text-slate-500'}
                `}
              >
                {tab.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
