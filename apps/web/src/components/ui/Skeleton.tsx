'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'circular' | 'text' | 'card'
  width?: string | number
  height?: string | number
  animate?: boolean
  label?: string // 無障礙標籤
}

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  animate = true,
  label = 'Loading...',
}: SkeletonProps) {
  const baseClasses = cn(
    'bg-gray-200',
    animate && 'animate-pulse',
    variant === 'circular' && 'rounded-full',
    variant === 'text' && 'rounded h-4',
    variant === 'card' && 'rounded-xl',
    variant === 'default' && 'rounded-lg',
    className
  )

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={baseClasses}
      style={style}
      role="status"
      aria-busy="true"
      aria-label={label}
    />
  )
}

// 統計卡片骨架
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 min-w-[140px]">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={20} />
        </div>
      </div>
    </div>
  )
}

// 課程卡片骨架
export function LessonCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="50%" />
        </div>
        <Skeleton variant="default" width={60} height={24} />
      </div>
    </div>
  )
}

// 章節骨架
export function ChapterSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={44} height={44} />
          <div className="space-y-2">
            <Skeleton variant="text" width={120} />
            <Skeleton variant="text" width={80} />
          </div>
        </div>
        <Skeleton variant="default" width={60} height={24} />
      </div>
      <Skeleton variant="default" width="100%" height={8} />
    </div>
  )
}

// Dashboard 頁面骨架
export function DashboardSkeleton() {
  return (
    <div
      className="space-y-6 animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading dashboard content"
    >
      {/* 螢幕閱讀器提示 */}
      <span className="sr-only">Loading dashboard, please wait...</span>

      {/* Hero Section */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Skeleton variant="circular" width={80} height={80} label="Loading avatar" />
          <div className="flex-1 space-y-3">
            <Skeleton variant="text" width="60%" height={28} label="Loading title" />
            <Skeleton variant="text" width="40%" label="Loading subtitle" />
            <Skeleton variant="default" width={200} height={44} label="Loading button" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Chapters */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <ChapterSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// 課程頁面骨架
export function LessonSkeleton() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading lesson content"
    >
      <span className="sr-only">Loading lesson, please wait...</span>

      {/* Title & Progress */}
      <div className="w-full max-w-2xl space-y-2">
        <Skeleton variant="text" width="50%" height={32} className="mx-auto" label="Loading lesson title" />
        <Skeleton variant="default" width="100%" height={10} label="Loading progress bar" />
        <Skeleton variant="text" width="30%" className="mx-auto" label="Loading question count" />
      </div>

      {/* Avatar */}
      <Skeleton variant="circular" width={280} height={280} className="sm:w-80 sm:h-80" label="Loading instructor avatar" />

      {/* Video placeholder */}
      <Skeleton variant="card" className="w-full max-w-4xl aspect-video" label="Loading video" />

      {/* Question card */}
      <div className="w-full max-w-2xl bg-white rounded-xl p-6 shadow-sm space-y-4">
        <Skeleton variant="text" width="80%" className="mx-auto" label="Loading question" />
        <Skeleton variant="text" width="60%" className="mx-auto" label="Loading hint" />
      </div>

      {/* Recording button */}
      <Skeleton variant="circular" width={80} height={80} label="Loading recording button" />
    </div>
  )
}

// 歷史記錄頁面骨架
export function HistorySkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading history content"
    >
      <span className="sr-only">Loading history, please wait...</span>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton variant="default" width={100} height={40} label="Loading tab" />
        <Skeleton variant="default" width={100} height={40} label="Loading tab" />
      </div>

      {/* List */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={40} height={40} label="Loading avatar" />
                <div className="space-y-2">
                  <Skeleton variant="text" width={150} label="Loading title" />
                  <Skeleton variant="text" width={100} label="Loading date" />
                </div>
              </div>
              <Skeleton variant="circular" width={48} height={48} label="Loading score" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 報告頁面骨架
export function ReportSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading report content"
    >
      <span className="sr-only">Loading report, please wait...</span>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <Skeleton variant="circular" width={80} height={80} label="Loading avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="50%" height={24} label="Loading title" />
            <Skeleton variant="text" width="30%" label="Loading date" />
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <Skeleton variant="text" width={120} height={24} className="mb-4" label="Loading chart title" />
        <Skeleton variant="circular" width={250} height={250} className="mx-auto" label="Loading radar chart" />
      </div>

      {/* Score breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <Skeleton variant="text" width={150} height={24} label="Loading section title" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton variant="text" width={80} label="Loading label" />
            <Skeleton variant="default" className="flex-1" height={12} label="Loading progress" />
            <Skeleton variant="text" width={40} label="Loading score" />
          </div>
        ))}
      </div>
    </div>
  )
}

// 對話頁面骨架
export function ConversationSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading conversation content"
    >
      <span className="sr-only">Loading conversation options, please wait...</span>

      {/* Mode selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
            <Skeleton variant="circular" width={48} height={48} label="Loading mode icon" />
            <Skeleton variant="text" width="60%" height={20} label="Loading mode title" />
            <Skeleton variant="text" width="80%" label="Loading mode description" />
          </div>
        ))}
      </div>

      {/* Interviewer selection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <Skeleton variant="text" width={150} height={24} label="Loading section title" />
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="circular" width={80} height={80} label="Loading interviewer avatar" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Skeleton
