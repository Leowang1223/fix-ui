'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
}

// 路徑到標籤的映射
const PATH_LABELS: Record<string, string> = {
  dashboard: '首頁',
  lesson: '課程',
  conversation: '對話練習',
  history: '歷史記錄',
  report: '報告',
  analysis: '分析',
  flashcards: '抽卡',
  settings: '設定',
  chat: '聊天',
}

// 章節標題映射
const CHAPTER_TITLES: Record<string, string> = {
  L1: 'Chapter 1: 基礎問候',
  L2: 'Chapter 2: 自我介紹',
  L3: 'Chapter 3: 數字與時間',
  L4: 'Chapter 4: 家庭成員',
  L5: 'Chapter 5: 日常活動',
  L6: 'Chapter 6: 飲食文化',
  L7: 'Chapter 7: 購物消費',
  L8: 'Chapter 8: 交通出行',
  L9: 'Chapter 9: 工作職業',
  L10: 'Chapter 10: 休閒娛樂',
}

export function Breadcrumb() {
  const pathname = usePathname()

  // 解析路徑生成麵包屑項目
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = []

    // 始終添加首頁
    items.push({ label: '首頁', href: '/dashboard' })

    let currentPath = ''
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      currentPath += `/${segment}`

      // 跳過 (protected) 這樣的路由組
      if (segment.startsWith('(') && segment.endsWith(')')) {
        continue
      }

      // 特殊處理課程 ID
      if (segments[i - 1] === 'lesson' && segment.match(/^L?\d+$/i)) {
        const lessonId = segment.toUpperCase().startsWith('L') ? segment.toUpperCase() : `L${segment}`
        const title = CHAPTER_TITLES[lessonId] || `Lesson ${segment}`
        items.push({ label: title, href: currentPath })
        continue
      }

      // 特殊處理報告 ID
      if (segments[i - 1] === 'report' && segment.startsWith('report-')) {
        items.push({ label: '詳細報告', href: currentPath })
        continue
      }

      // 使用映射的標籤或原始段落
      const label = PATH_LABELS[segment] || segment

      // 跳過 dashboard（已經添加為首頁）
      if (segment === 'dashboard') continue

      items.push({ label, href: currentPath })
    }

    return items
  }

  const breadcrumbs = generateBreadcrumbs()

  // 如果只有首頁，不顯示麵包屑
  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto">
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
                href={item.href}
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

// 移動端簡化版本
export function BreadcrumbMobile() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // 獲取最後一個有意義的段落
  const lastSegment = segments[segments.length - 1]
  const parentSegment = segments[segments.length - 2]

  // 簡化顯示: ... > 當前頁面
  const currentLabel = PATH_LABELS[lastSegment] || lastSegment

  if (segments.length <= 1 || lastSegment === 'dashboard') {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-gray-500 mb-3">
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
