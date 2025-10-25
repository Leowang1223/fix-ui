'use client'

import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import Link from 'next/link'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import CoursePath from './CoursePath'

interface LessonSummary {
  lesson_id: string
  title: string
  description: string
  stepCount: number
}

// Try to trigger the existing page "start" flow without changing any handlers.
function triggerExistingStart(lesson: { index: number; title?: string }) {
  try {
    const globals = (window as any)
    if (typeof globals.startLesson === 'function') {
      globals.startLesson(lesson)
      return true
    }
    if (typeof globals.onStartLesson === 'function') {
      globals.onStartLesson(lesson)
      return true
    }

    const selectors = [
      '[data-testid="course-start"]',
      '[data-testid="course-start-btn"]',
      '[data-testid="coursepath-start"]',
      'button:where([data-testid])',
      'button',
      'a',
    ]
    const candidates = Array.from(document.querySelectorAll(selectors.join(',')))
    const match = candidates.find((el) => {
      const aria = el.getAttribute('aria-label') || ''
      const tid = el.getAttribute('data-testid') || ''
      const txt = (el.textContent || '').trim()
      if (tid && /start|開始|start lesson|開始課程/i.test(tid)) return true
      if (aria && /start|開始|start lesson|開始課程/i.test(aria)) return true
      if (txt && /^(開始|Start|開始課程|Start Lesson)/i.test(txt)) return true
      return false
    }) as HTMLElement | undefined
    if (match) {
      match.click()
      return true
    }

    return false
  } catch (e) {
    console.warn('triggerExistingStart failed', e)
    return false
  }
}

// 中文課程列表組件
function ChineseLessonsList() {
  const [expanded, setExpanded] = useState(false)
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLessons() {
      try {
            const response = await fetch(`${API_BASE}/api/lessons`)
        if (!response.ok) throw new Error('Failed to load lessons')
        const data = await response.json()
        // 升冪排序：L1 → L10
        const sortedLessons = data.sort((a: LessonSummary, b: LessonSummary) => {
          const aNum = parseInt(a.lesson_id.replace('L', ''))
          const bNum = parseInt(b.lesson_id.replace('L', ''))
          return aNum - bNum
        })
        setLessons(sortedLessons)
      } catch (error) {
        console.error('Error loading lessons:', error)
        // 如果 API 失敗，使用備用數據（升冪順序）
        setLessons([
          { lesson_id: 'L1', title: 'Self Introduction', description: '學習如何用中文打招呼和自我介紹', stepCount: 10 },
          { lesson_id: 'L2', title: 'Lesson 2', description: '中文學習課程 2', stepCount: 10 },
          { lesson_id: 'L3', title: 'Lesson 3', description: '中文學習課程 3', stepCount: 10 },
          { lesson_id: 'L4', title: 'Lesson 4', description: '中文學習課程 4', stepCount: 10 },
          { lesson_id: 'L5', title: 'Lesson 5', description: '中文學習課程 5', stepCount: 10 },
          { lesson_id: 'L6', title: 'Lesson 6', description: '中文學習課程 6', stepCount: 10 },
          { lesson_id: 'L7', title: 'Lesson 7', description: '中文學習課程 7', stepCount: 10 },
          { lesson_id: 'L8', title: 'Lesson 8', description: '中文學習課程 8', stepCount: 10 },
          { lesson_id: 'L9', title: 'Lesson 9', description: '中文學習課程 9', stepCount: 10 },
          { lesson_id: 'L10', title: 'Lesson 10', description: '中文學習課程 10', stepCount: 10 },
        ])
      } finally {
        setLoading(false)
      }
    }
    loadLessons()
  }, [])

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* 主標題：點擊展開/收合 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-left">
            <div className="text-gray-900 font-medium">中文學習課程</div>
            <div className="text-sm text-gray-500">中文對話學習與練習（10個課程）</div>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* 展開的課程列表 */}
      {expanded && (
        <div className="border-t border-gray-200 divide-y">
          {loading ? (
            <div className="px-4 py-8 text-center text-gray-500">
              載入課程中...
            </div>
          ) : (
            lessons.map((lesson) => (
              <Link
                key={lesson.lesson_id}
                href={`/lesson/${lesson.lesson_id}`}
                className="flex items-center justify-between px-4 py-3 pl-16 hover:bg-blue-50 transition-colors group"
              >
                <div>
                  <div className="text-gray-900 group-hover:text-blue-600 font-medium">
                    {lesson.lesson_id}: {lesson.title}
                  </div>
                  <div className="text-sm text-gray-500">{lesson.description}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    📝 {lesson.stepCount} 個題目
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 5l7 7-7 7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="dashboard-content bg-slate-50">
        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* 歡迎區域 */}
          <div className="mb-6">
            <div className="rounded-2xl shadow-md p-6 bg-white">
              <h1 className="text-3xl font-semibold text-slate-900 mb-2">Talk Learning</h1>
              <p className="text-sm text-slate-600">沿用首頁的極簡白藍風格。完成課程即可在路線圖上插旗，路徑會由灰轉藍。</p>
            </div>
          </div>

          {/* 統計卡片 */}
          <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl shadow-md p-6 bg-white">
              <div className="text-sm text-slate-600">已完成課程</div>
              <div className="mt-3 text-3xl font-semibold text-slate-900">0</div>
            </div>
            <div className="rounded-2xl shadow-md p-6 bg-white">
              <div className="text-sm text-slate-600">平均分數</div>
              <div className="mt-3 text-3xl font-semibold text-slate-900">0</div>
            </div>
            <div className="rounded-2xl shadow-md p-6 bg-white">
              <div className="text-sm text-slate-600">學習時數</div>
              <div className="mt-3 text-3xl font-semibold text-slate-900">0</div>
            </div>
          </section>

          {/* 路線圖卡片（Duolingo 風） */}
          <section className="rounded-2xl shadow-md p-6 bg-white mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">中文學習課程路線</h2>
              <div className="flex items-center gap-3">
                  <button className="px-3 py-1 rounded-full bg-slate-100 text-slate-900 text-sm">開始</button>
                </div>
            </div>
              <div className="mt-6 -mx-4 px-4">
                <CoursePath
                  lessons={[
                    { index: 1, title: 'L1', done: true, percent: 100 },
                    { index: 2, title: 'L2', done: true, percent: 100 },
                    { index: 3, title: 'L3', done: false, percent: 60, active: true },
                    { index: 4, title: 'L4', done: false, percent: 0 },
                    { index: 5, title: 'L5', done: false, percent: 0 },
                    { index: 6, title: 'L6', done: false, percent: 0 },
                    { index: 7, title: 'L7', done: false, percent: 0 },
                    { index: 8, title: 'L8', done: false, percent: 0 },
                  ]}
                  progress={33}
                  onStart={(lesson) => {
                    const ok = triggerExistingStart(lesson as any)
                    if (!ok) {
                      console.log('CoursePath onStart (fallback):', lesson)
                    }
                  }}
                  onSubmit={(lesson) => {
                    console.log('CoursePath onSubmit:', lesson)
                  }}
                />
              </div>
          </section>

          {/* 保留原先的面試種類列表（功能不變） */}
          <section>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">選擇面試種類</h3>
            <ChineseLessonsList />
          </section>

          <footer className="text-center text-sm text-slate-500 py-6">© 2025 Talk Learning</footer>
        </main>

        {/* inline styles + small presentational components */}
        <style jsx>{`
          .animate-progress-shift { animation: progressShift 4s linear infinite; }
          @keyframes progressShift { 0% { filter: hue-rotate(0deg); transform: translateX(0); } 50% { filter: hue-rotate(6deg); transform: translateX(2px); } 100% { filter: hue-rotate(0deg); transform: translateX(0); } }
          .animate-arrow-slide { animation: arrowMove 3s linear infinite; }
          .delay-2000 { animation-delay: 1.5s; }
          @keyframes arrowMove { 0% { transform: translateX(0) rotate(45deg); opacity: .6; } 50% { transform: translateX(160px) rotate(45deg); opacity: .2; } 100% { transform: translateX(0) rotate(45deg); opacity: .6; } }
          .node-water { animation: waterFloat 3s linear infinite; }
          @keyframes waterFloat { 0% { transform: translateY(6px); } 50% { transform: translateY(0px); } 100% { transform: translateY(6px); } }
          .node-shimmer::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%); transform: translateX(-120%); animation: shimmer 2s linear infinite; border-radius: 9999px; }
          @keyframes shimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
          .flash { animation: flashOnce 700ms ease-out; }
          @keyframes flashOnce { 0% { box-shadow: 0 0 0 rgba(255,255,255,0); } 50% { box-shadow: 0 0 14px rgba(255,255,255,0.6); } 100% { box-shadow: 0 0 0 rgba(255,255,255,0); } }
          .ripple { position: absolute; border-radius: 999px; animation: rippleOnce 900ms ease-out; }
          @keyframes rippleOnce { 0% { transform: scale(0.4); opacity: .6 } 100% { transform: scale(2.0); opacity: 0 } }
        `}</style>
      </div>
    </DashboardLayout>
  )
}

// Presentational RoadmapNode component (no logic changes)
function RoadmapNode({ index, label, state, progress }: { index: number; label: string; state: 'locked'|'active'|'completed'; progress: number }) {
  const isActive = state === 'active'
  const isCompleted = state === 'completed'
  return (
    <div className="relative flex flex-col items-center w-28">
      <div className="relative">
        <div
          role="button"
          aria-label={`Level ${index} ${label} ${state}`}
          className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold ${isCompleted ? 'bg-blue-600 text-white' : isActive ? 'bg-blue-50 text-slate-900' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <span>{index}</span>
        </div>

        {isActive && (
          <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
            <svg className="w-12 h-6 node-water" viewBox="0 0 48 24" preserveAspectRatio="none" aria-hidden>
              <path d="M0 12 Q12 8 24 12 T48 12 V24 H0 Z" fill="#bfdbfe" opacity="0.95" />
              <path d="M0 14 Q12 10 24 14 T48 14 V24 H0 Z" fill="#93c5fd" opacity="0.7" />
            </svg>
          </div>
        )}

        {isCompleted && (
          <div className="absolute -right-3 -top-3 w-6 h-8">
            <div className="w-0 h-0 border-l-0 border-r-6 border-t-8 border-b-0 border-transparent relative">
              <div className="absolute -left-6 -top-6 w-12 h-6 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs flex items-center justify-center" style={{ borderRadius: '6px' }}>
                ✓
              </div>
            </div>
          </div>
        )}

      </div>
      <div className="mt-3 text-sm text-slate-600">{label}</div>
    </div>
  )
}