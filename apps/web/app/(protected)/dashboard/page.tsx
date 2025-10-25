'use client'

import { API_BASE } from '../config'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function DashboardPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="dashboard-content bg-slate-50">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* 1) Builder / Info 段 - 保留原功能，但樣式統一 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <div className="rounded-2xl shadow-md p-6 bg-white">
              <h1 className="text-2xl font-semibold text-slate-900">Talk Learning</h1>
              <p className="mt-2 text-sm text-slate-600">沿用首頁的極簡白藍風格。完成課程即可在路線圖上插旗，路徑會由灰轉藍。</p>
            </div>
          </div>
        </section>

        {/* 統計卡片列 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl shadow-md p-6 bg-white text-slate-900">
            <div className="text-sm text-slate-600">已完成課程</div>
            <div className="mt-4 text-3xl font-semibold">0</div>
          </div>
          <div className="rounded-2xl shadow-md p-6 bg-white text-slate-900">
            <div className="text-sm text-slate-600">平均分數</div>
            <div className="mt-4 text-3xl font-semibold">0</div>
          </div>
          <div className="rounded-2xl shadow-md p-6 bg-white text-slate-900">
            <div className="text-sm text-slate-600">學習時數</div>
            <div className="mt-4 text-3xl font-semibold">0</div>
          </div>
        </section>

        {/* Course roadmap card */}
        <section className="rounded-2xl shadow-md p-6 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">中文學習課程路線</h2>
            <div className="flex items-center gap-3">
              <button className="px-3 py-1 rounded-full bg-slate-100 text-slate-900 text-sm">開始</button>
              <button className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm">提交答案（慢速灌水）</button>
            </div>
          </div>

          {/* 路線圖容器，可水平滾動於手機 */}
          <div className="mt-6 overflow-x-auto -mx-4 px-4">
            <div className="min-w-[720px]">
              {/* 基礎軌道（灰底 + 已解鎖藍色區段） */}
              <div className="relative h-20">
                <div className="absolute inset-x-6 top-8 h-2 bg-slate-100 rounded-full overflow-hidden" aria-hidden>
                  <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-progress-wiggle" style={{ width: '33%' }} />
                  {/* 兩個半透明白色箭頭滑動 */}
                  <div className="absolute top-0 left-8 h-full w-6 opacity-70 transform rotate-45 animate-arrow-slide">
                    <svg viewBox="0 0 24 24" className="w-full h-full text-white">
                      <rect x="0" y="0" width="24" height="24" fill="white" opacity="0.12" />
                    </svg>
                  </div>
                  <div className="absolute top-0 left-28 h-full w-6 opacity-60 transform rotate-45 animate-arrow-slide delay-2000">
                    <svg viewBox="0 0 24 24" className="w-full h-full text-white">
                      <rect x="0" y="0" width="24" height="24" fill="white" opacity="0.08" />
                    </svg>
                  </div>
                </div>

                {/* 節點列（示範 8 個節點） */}
                <div className="relative mt-0 flex items-center justify-between px-2">
                  {/* Node 1 - completed */}
                  <RoadmapNode index={1} label="L1" state="completed" progress={100} />
                  <RoadmapNode index={2} label="L2" state="completed" progress={100} />
                  <RoadmapNode index={3} label="L3" state="active" progress={60} />
                  <RoadmapNode index={4} label="L4" state="locked" progress={0} />
                  <RoadmapNode index={5} label="L5" state="locked" progress={0} />
                  <RoadmapNode index={6} label="L6" state="locked" progress={0} />
                  <RoadmapNode index={7} label="L7" state="locked" progress={0} />
                  <RoadmapNode index={8} label="L8" state="locked" progress={0} />
                </div>
              </div>
            </div>
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
          @keyframes waveShift { 0% { transform: translateX(0); } 100% { transform: translateX(-24px); } }
        `}</style>
      </div>
    </DashboardLayout>
  )
}

// Presentational RoadmapNode component (no logic changes)
function RoadmapNode({ index, label, state, progress }: { index: number; label: string; state: 'locked'|'active'|'completed'; progress: number }) {
  const router = useRouter()
  const isActive = state === 'active'
  const isCompleted = state === 'completed'

  const handleDoubleClick = () => {
    router.push(`/lesson/${label}`)
  }

  return (
    <div className="relative flex flex-col items-center w-28">
      <div className="relative">
        <button
          onDoubleClick={handleDoubleClick}
          role="button"
          aria-label={`Level ${index} ${label} ${state}. Double-click to start.`}
          data-testid={`station-${index}`}
          className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold focus:outline-none focus:ring-2 ${isCompleted ? 'bg-blue-600 text-white' : isActive ? 'bg-blue-50 text-slate-900 ring-1 ring-blue-200' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <span>{index}</span>
        </button>

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
      {/* Removed visible text label per requirement - kept sr-only for accessibility */}
      <div className="sr-only">{label}</div>
    </div>
  )
}