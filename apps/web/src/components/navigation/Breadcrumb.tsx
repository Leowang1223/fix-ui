'use client'

import { usePathname, Link } from '@/i18n/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface BreadcrumbItem {
  label: string
  href: string
}

const PATH_LABEL_KEYS: Record<string, string> = {
  dashboard: 'home',
  lesson: 'lesson',
  conversation: 'conversation',
  history: 'history',
  report: 'report',
  analysis: 'analysis',
  flashcards: 'flashcards',
  settings: 'settings',
  chat: 'chat',
  'learning-path': 'lesson',
}

export function Breadcrumb() {
  const pathname = usePathname()
  const t = useTranslations('breadcrumb')

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = []

    items.push({ label: t('home'), href: '/dashboard' })

    let currentPath = ''
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      currentPath += `/${segment}`

      if (segment.startsWith('(') && segment.endsWith(')')) {
        continue
      }

      if (segments[i - 1] === 'lesson' && segment.match(/^L?\d+$/i)) {
        const label = `${t('lesson')} ${segment}`
        items.push({ label, href: currentPath })
        continue
      }

      if (segments[i - 1] === 'report' && segment.startsWith('report-')) {
        items.push({ label: t('detailedReport'), href: currentPath })
        continue
      }

      const labelKey = PATH_LABEL_KEYS[segment]
      const label = labelKey ? t(labelKey) : segment

      if (segment === 'dashboard') continue

      items.push({ label, href: currentPath })
    }

    return items
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav aria-label={t('breadcrumbNav')} className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1
        const isFirst = index === 0

        return (
          <div key={item.href} className="flex items-center whitespace-nowrap">
            {index > 0 && (
              <ChevronRight size={14} className="mx-2 text-gray-400 flex-shrink-0" />
            )}

            {isLast ? (
              <span className="font-medium text-gray-800 truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href as any}
                className="hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                {isFirst && <Home size={14} className="flex-shrink-0" />}
                <span className="truncate max-w-[150px]">{item.label}</span>
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function BreadcrumbMobile() {
  const pathname = usePathname()
  const t = useTranslations('breadcrumb')
  const segments = pathname.split('/').filter(Boolean)

  const lastSegment = segments[segments.length - 1]

  const labelKey = PATH_LABEL_KEYS[lastSegment]
  const currentLabel = labelKey ? t(labelKey) : lastSegment

  if (segments.length <= 1 || lastSegment === 'dashboard') {
    return null
  }

  return (
    <nav aria-label={t('breadcrumbNav')} className="flex items-center text-sm text-gray-500 mb-3">
      <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
        <Home size={14} />
      </Link>
      <span className="mx-2 text-gray-400">...</span>
      <ChevronRight size={14} className="text-gray-400 mr-1" />
      <span className="font-medium text-gray-800 truncate max-w-[200px]">
        {currentLabel}
      </span>
    </nav>
  )
}

export default Breadcrumb
