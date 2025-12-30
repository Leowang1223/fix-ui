
"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

interface StatsState {
  lessons: number
  avgScore: number
  levelIndex: number
  streak: number
}

interface LessonStep {
  id: number
  title: string
  progress: number
  completed: boolean
}

interface LessonSummary {
  lesson_id: string
  chapterId: string
  lessonNumber: number
  title: string
  description?: string
  stepCount: number
}

interface Chapter {
  id: string
  title: string
  description?: string
  lessons: LessonSummary[]
}

interface LessonHistoryEntry {
  sessionId: string
  lessonId: string
  lessonTitle: string
  completedAt: string
  totalScore: number
  questionsCount: number
  results: any[]
}

// 水位杯組件
function WaterCup({ progress, lessonNumber, isCompleted }: { progress: number; lessonNumber: number; isCompleted: boolean }) {
  const waterHeight = Math.min(100, Math.max(0, progress))

  // 🔍 調試：檢查水位計算
  if (lessonNumber <= 3 && (isCompleted || progress > 90)) {
    console.log(`💧 WaterCup L${lessonNumber}:`, {
      progress,
      waterHeight,
      isCompleted,
      heightStyle: `${waterHeight}%`
    })
  }

  return (
    <div className="relative h-20 w-16">
      {/* 玻璃杯外框 */}
      <div className="absolute inset-0 rounded-b-2xl rounded-t-lg border-2 border-blue-300 bg-gradient-to-b from-blue-50/30 to-transparent overflow-hidden">
        {/* 水位 - 從底部開始，高度由 waterHeight 控制 */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out rounded-b-2xl"
          style={{ height: `${waterHeight}%` }}
        >
            {/* 水的漸變效果 */}
            <div className={`h-full w-full ${
              isCompleted
                ? 'bg-gradient-to-t from-blue-500 to-blue-400'
                : 'bg-gradient-to-t from-blue-300 to-blue-200'
            }`}>
              {/* 水波紋效果 */}
              <div className="h-full w-full opacity-40">
                <div
                  className="h-1 w-full bg-white/50 animate-pulse"
                  style={{
                    transform: 'translateY(2px)',
                    animation: 'wave 2s ease-in-out infinite'
                  }}
                />
              </div>
            </div>
        </div>

        {/* 課程編號 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`relative z-10 text-lg font-bold ${
            waterHeight > 50 ? 'text-white drop-shadow-md' : 'text-blue-600'
          }`}>
            {lessonNumber}
          </span>
        </div>

        {/* 完成徽章 */}
        {isCompleted && (
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] text-white shadow-lg">
            ✓
          </div>
        )}

        {/* 刻度線 */}
        <div className="absolute inset-x-0 top-1/4 h-px bg-blue-200/50" />
        <div className="absolute inset-x-0 top-2/4 h-px bg-blue-200/50" />
        <div className="absolute inset-x-0 top-3/4 h-px bg-blue-200/50" />
      </div>
    </div>
  )
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", description: "Overview & path" },
  { href: "/conversation", label: "AI Conversation", description: "Practice with AI" },
  { href: "/flashcards", label: "Flashcards", description: "Review mistakes" },
  { href: "/history", label: "History", description: "Reports & playback" },
]

const CHAPTER_TITLES: Record<string, string> = {
  'C1': 'Chapter 1: Basic Chinese',
  'C2': 'Chapter 2: Intermediate Conversations',
  'C3': 'Chapter 3: Advanced Topics',
  'C4': 'Chapter 4: Daily Life',
  'C5': 'Chapter 5: Social Situations',
  'C6': 'Chapter 6: Business Chinese',
  'C7': 'Chapter 7: Travel & Leisure',
  'C8': 'Chapter 8: Cultural Topics',
  'C9': 'Chapter 9: Professional Communication',
  'C10': 'Chapter 10: Advanced Mastery'
}

const CHAPTER_DESCRIPTIONS: Record<string, string> = {
  'C1': 'Master fundamental Chinese conversation skills',
  'C2': 'Expand your speaking abilities with practical scenarios',
  'C3': 'Handle complex conversations with confidence',
  'C4': 'Learn to discuss everyday activities and routines',
  'C5': 'Navigate social interactions with ease',
  'C6': 'Communicate effectively in business settings',
  'C7': 'Discuss travel plans and leisure activities',
  'C8': 'Explore Chinese culture and traditions',
  'C9': 'Master professional workplace communication',
  'C10': 'Achieve fluency in advanced Chinese topics'
}

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [stats, setStats] = useState<StatsState>({
    lessons: 5,
    avgScore: 81,
    levelIndex: 1.3,
    streak: 3,
  })
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapter, setSelectedChapter] = useState<string>('C1')
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [lessonProgress, setLessonProgress] = useState<Record<string, number>>({})

  // 從 lessonHistory 計算每個課程的完成進度
  const calculateLessonProgress = (): Record<string, number> => {
    if (typeof window === 'undefined') return {}

    try {
      const historyRaw = localStorage.getItem('lessonHistory')
      if (!historyRaw) return {}

      const history: LessonHistoryEntry[] = JSON.parse(historyRaw)
      const progressMap: Record<string, number> = {}

      // 為每個課程計算進度
      console.log('📚 開始計算課程進度，歷史記錄數量:', history.length)

      history.forEach((entry, index) => {
        const lessonId = entry.lessonId
        const questionsCount = entry.questionsCount || 0
        const answeredCount = entry.results?.length || 0

        console.log(`  記錄 ${index + 1}:`, {
          lessonId,
          lessonTitle: entry.lessonTitle,
          questionsCount,
          answeredCount,
          completedAt: entry.completedAt
        })

        if (questionsCount > 0) {
          // 計算完成百分比
          const percentage = Math.round((answeredCount / questionsCount) * 100)

          console.log(`    → 計算進度: ${answeredCount}/${questionsCount} = ${percentage}%`)

          // 如果同一課程有多條記錄，取最高進度
          if (!progressMap[lessonId] || progressMap[lessonId] < percentage) {
            progressMap[lessonId] = percentage
            console.log(`    → 更新進度: ${lessonId} = ${percentage}%`)
          }
        } else {
          console.log(`    ⚠️ 跳過: questionsCount = 0`)
        }
      })

      console.log('📊 課程進度計算完成:', progressMap)
      return progressMap
    } catch (error) {
      console.error('❌ 計算課程進度失敗:', error)
      return {}
    }
  }

  useEffect(() => {
    async function fetchStats() {
      try {
        const apiBase =
          (typeof window !== "undefined" && localStorage.getItem("api_base")) ||
          process.env.NEXT_PUBLIC_API_BASE ||
          "http://localhost:8082"

        const response = await fetch(`${apiBase}/api/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats({
            lessons: data.lessons ?? 5,
            avgScore: data.avgScore ?? 81,
            levelIndex: data.levelIndex ?? 1.3,
            streak: data.streak ?? 3,
          })
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    async function fetchLessons() {
      try {
        const apiBase =
          (typeof window !== "undefined" && localStorage.getItem("api_base")) ||
          process.env.NEXT_PUBLIC_API_BASE ||
          "http://localhost:8082"

        const response = await fetch(`${apiBase}/api/lessons`)
        if (response.ok) {
          const allLessons: LessonSummary[] = await response.json()
          setLessons(allLessons)

          // 按章节分组
          const chapterMap = new Map<string, LessonSummary[]>()
          allLessons.forEach(lesson => {
            if (!chapterMap.has(lesson.chapterId)) {
              chapterMap.set(lesson.chapterId, [])
            }
            chapterMap.get(lesson.chapterId)!.push(lesson)
          })

          // 构建章节列表
          const chapterList: Chapter[] = Array.from(chapterMap.entries()).map(([id, lessons]) => ({
            id,
            title: CHAPTER_TITLES[id] || id,
            description: CHAPTER_DESCRIPTIONS[id],
            lessons: lessons.sort((a, b) => a.lessonNumber - b.lessonNumber)
          }))

          // 按章节数字排序 (C1, C2, ..., C10)
          setChapters(chapterList.sort((a, b) => {
            const numA = parseInt(a.id.replace('C', ''))
            const numB = parseInt(b.id.replace('C', ''))
            return numA - numB
          }))

          // 加载进度（从 lessonHistory 計算實際完成進度）
          const progressData = calculateLessonProgress()
          setLessonProgress(progressData)
        }
      } catch (error) {
        console.error("Failed to fetch lessons:", error)
      }
    }

    fetchLessons()
  }, [])

  const handleLessonClick = (lessonId: string) => {
    router.push(`/lesson/${lessonId}`)
  }

  const handleStartLesson = () => {
    const filteredLessons = lessons.filter(l => l.chapterId === selectedChapter)
    const nextLesson = filteredLessons.find((lesson) => (lessonProgress[lesson.lesson_id] || 0) < 100)
    if (nextLesson) {
      handleLessonClick(nextLesson.lesson_id)
    } else if (filteredLessons.length > 0) {
      handleLessonClick(filteredLessons[0].lesson_id)
    }
  }

  const handleLogout = () => {
    router.push("/login")
  }

  const statCards = [
    { label: "Completed Lessons", value: stats.lessons.toString() },
    { label: "Average Score", value: `${stats.avgScore}%` },
    { label: "Level Index", value: stats.levelIndex.toString() },
    { label: "Streak Days", value: `${stats.streak} days` },
  ]

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-b from-[#f7f9ff] to-[#edf1f9] text-slate-900">
      <aside className="w-72 border-r border-white/70 bg-[#f6f8fe]/90 px-7 py-10 shadow-[0_15px_40px_rgba(148,163,184,0.25)] backdrop-blur">
        <button className="self-start rounded-full border border-blue-100 bg-white px-4 py-1.5 text-sm font-semibold text-blue-600 shadow-sm">
          Talk Learning
        </button>

        <div className="mt-7 space-y-4 text-[13px]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Navigate</div>
            <p className="mt-1 text-[11px] text-slate-400">
              Lessons, flashcards, and detailed history reports.
            </p>
          </div>

          <div className="space-y-3">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full rounded-3xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-white bg-white text-slate-900 shadow-[0_18px_35px_rgba(15,23,42,0.12)]"
                      : "border-transparent bg-white/30 text-slate-500 hover:bg-white/60"
                  }`}
                >
                  <span className={`text-[13px] ${isActive ? "font-semibold" : "font-medium"}`}>
                    {item.label}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">
                    {item.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      <main className="flex flex-1 justify-center overflow-y-auto border-l border-white/70">
        <div className="w-full max-w-[1050px] px-10 py-10">
          <div className="space-y-8 rounded-[34px] border border-white/80 bg-white/90 px-10 py-10 shadow-[0_40px_80px_rgba(15,23,42,0.12)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Welcome back
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">admin@test.com</h1>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-full border border-slate-100 bg-white px-5 py-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-600">
                    S
                  </span>
                  <div className="leading-tight">
                    <div className="text-[11px] font-semibold text-slate-600">Keep your streak</div>
                    <div className="text-[10px] text-slate-400">Log one conversation today</div>
                  </div>
                </div>

                <button
                  onClick={handleStartLesson}
                  className="rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(37,99,235,0.45)] transition hover:shadow-[0_12px_28px_rgba(37,99,235,0.55)]"
                >
                  Start lesson
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded-full px-2 py-1 text-[11px] text-slate-500 transition hover:bg-slate-100"
                >
                  log out
                </button>

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                  A
                </div>
              </div>
            </div>

            <section className="relative rounded-[30px] border border-white bg-white px-8 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-1 pr-32">
                <h2 className="text-sm font-semibold text-slate-800">Talk Learning</h2>
                <p className="text-[11px] text-slate-500">
                  Experience real conversational scenarios. Feel the overall rhythm and tone.
                  <span className="font-medium text-amber-500"> After completing courses, you'll respond faster </span>
                  in actual situations and speak confidently.
                </p>
              </div>

              <button
                onClick={handleStartLesson}
                className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2 text-xs font-semibold text-white shadow-[0_15px_30px_rgba(37,99,235,0.45)] transition hover:scale-105"
              >
                Resume Daily Routine
              </button>
            </section>

            <section className="grid grid-cols-4 gap-5">
              {statCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[26px] border border-white bg-white px-6 py-5 shadow-[0_15px_30px_rgba(15,23,42,0.08)]"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
                    {item.value}
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-5 rounded-[32px] border border-white bg-white px-8 py-7 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-800">Chinese Learning Course Path</h2>
                <p className="text-[11px] text-slate-500">
                  Complete each step. The course pace will guide you from daily conversations to advanced scenarios.
                </p>

                {/* 章节选择器 - 添加横向滚动 */}
                {chapters.length > 0 && (
                  <div className="relative -mx-2 px-2">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400">
                      {chapters.map(chapter => {
                        const isActive = selectedChapter === chapter.id
                        return (
                          <button
                            key={chapter.id}
                            onClick={() => setSelectedChapter(chapter.id)}
                            className={`flex-shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                              isActive
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'border border-blue-200 text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            {CHAPTER_TITLES[chapter.id] || chapter.id}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 课程卡片 - 水位杯 UI */}
              <div className="relative -mx-2 px-2">
                <div className="flex items-end gap-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400">
                  {lessons.filter(l => l.chapterId === selectedChapter).map((lesson) => {
                    // 🔒 只使用精確的 lesson_id 匹配，避免跨章節混淆
                    const progress = lessonProgress[lesson.lesson_id] || 0
                    const completed = progress === 100

                    // 🔍 調試：檢查進度和完成狀態
                    if (lesson.lessonNumber <= 3) {
                      console.log(`📊 ${lesson.lesson_id} (${lesson.title}):`, {
                        progress,
                        completed,
                        displayText: completed ? '✓ Complete' : `${progress}%`
                      })
                    }

                    return (
                      <button
                        key={lesson.lesson_id}
                        onClick={() => handleLessonClick(lesson.lesson_id)}
                        className="group flex min-w-[100px] flex-shrink-0 flex-col items-center gap-3 transition hover:scale-105"
                      >
                        {/* 水位杯 */}
                        <WaterCup
                          progress={progress}
                          lessonNumber={lesson.lessonNumber}
                          isCompleted={completed}
                        />

                        {/* 課程資訊 */}
                        <div className="text-center leading-tight">
                          <p className="text-[11px] font-medium text-slate-700 group-hover:text-blue-600">
                            {lesson.title}
                          </p>
                          <p className={`text-[10px] font-semibold ${
                            completed ? 'text-green-600' : 'text-blue-500'
                          }`}>
                            {completed ? "✓ Complete" : `${progress}%`}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
