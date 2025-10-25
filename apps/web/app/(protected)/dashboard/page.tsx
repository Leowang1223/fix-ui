'use client'

import { API_BASE } from '../config'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import CoursePath from './CoursePath'

export default function DashboardPage() {
  const router = useRouter()

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
                    const lessonId = 'L' + lesson.index
                    router.push('/lesson/' + lessonId)
                  }}
                  onSubmit={(lesson) => {
                    console.log('CoursePath onSubmit:', lesson)
                  }}
                />
              </div>
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