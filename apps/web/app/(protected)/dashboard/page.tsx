
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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

  // 從 lessonHistory 計算統計數據
  const calculateStats = (): StatsState => {
    if (typeof window === 'undefined') {
      return { lessons: 0, avgScore: 0, levelIndex: 0, streak: 0 }
    }

    try {
      const historyRaw = localStorage.getItem('lessonHistory')
      if (!historyRaw) {
        return { lessons: 0, avgScore: 0, levelIndex: 0, streak: 0 }
      }

      const history: LessonHistoryEntry[] = JSON.parse(historyRaw)

      // 計算每個課程的最高進度和分數
      const lessonProgressMap: Record<string, { progress: number, score: number }> = {}

      history.forEach((entry) => {
        const lessonId = entry.lessonId
        const questionsCount = entry.questionsCount || 0
        const answeredCount = entry.results?.length || 0
        const progress = questionsCount > 0
          ? Math.round((answeredCount / questionsCount) * 100)
          : 0
        const score = entry.totalScore || 0

        // 同一課程取最高進度記錄
        if (!lessonProgressMap[lessonId] || lessonProgressMap[lessonId].progress < progress) {
          lessonProgressMap[lessonId] = { progress, score }
        }
      })

      // 1. Completed Lessons: 只計算進度 = 100% 的課程
      const completedLessons = Object.values(lessonProgressMap).filter(
        (data) => data.progress === 100
      )
      const completedCount = completedLessons.length

      // 2. Average Score: 只計算已完成課程的平均分數
      const avgScore = completedCount > 0
        ? Math.round(
            completedLessons.reduce((sum, data) => sum + data.score, 0) / completedCount
          )
        : 0

      // 3. Level Index: 完成課程數 / 10
      const levelIndex = parseFloat((completedCount / 10).toFixed(1))

      // 4. Streak Days: 計算連續學習天數
      const streak = calculateStreakDays(history)

      console.log('📊 統計數據計算完成:', {
        completedCount,
        avgScore,
        levelIndex,
        streak
      })

      return {
        lessons: completedCount,
        avgScore,
        levelIndex,
        streak
      }
    } catch (error) {
      console.error('❌ 計算統計數據失敗:', error)
      return { lessons: 0, avgScore: 0, levelIndex: 0, streak: 0 }
    }
  }

  // 計算連續學習天數
  const calculateStreakDays = (history: LessonHistoryEntry[]): number => {
    if (history.length === 0) return 0

    // 提取所有完成日期（只取日期，忽略時間）
    const completionDates = history
      .map((entry) => {
        const date = new Date(entry.completedAt)
        return new Date(date.getFullYear(), date.getMonth(), date.getDate())
      })
      .sort((a, b) => b.getTime() - a.getTime()) // 最新到最舊

    // 去重：同一天可能完成多個課程
    const uniqueDates = Array.from(
      new Set(completionDates.map(d => d.getTime()))
    ).map(time => new Date(time))

    if (uniqueDates.length === 0) return 0

    // 檢查今天或昨天是否有學習記錄
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const latestDate = uniqueDates[0]
    const latestTime = latestDate.getTime()
    const todayTime = today.getTime()
    const yesterdayTime = yesterday.getTime()

    // 如果最新記錄不是今天或昨天，streak 中斷
    if (latestTime !== todayTime && latestTime !== yesterdayTime) {
      return 0
    }

    // 從最新日期開始計算連續天數
    let streakCount = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = uniqueDates[i]
      const previousDate = uniqueDates[i - 1]
      const diffInDays = Math.round(
        (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // 相差正好 1 天，繼續 streak
      if (diffInDays === 1) {
        streakCount++
      } else {
        break // 否則中斷
      }
    }

    return streakCount
  }

  // 數據遷移：首次登入時將 localStorage 數據遷移到 Supabase
  useEffect(() => {
    const checkMigration = async () => {
      const migrated = localStorage.getItem('data_migrated')
      if (!migrated) {
        try {
          const { migrateUserData } = await import('@/lib/migration/migrate')
          await migrateUserData()
          localStorage.setItem('data_migrated', 'true')
        } catch (error) {
          console.error('Migration failed:', error)
        }
      }
    }

    checkMigration()
  }, [])

  // 從 localStorage 計算統計數據（客戶端計算，不需後端 API）
  useEffect(() => {
    const calculatedStats = calculateStats()
    setStats(calculatedStats)
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

  // 當 lessonProgress 更新時，重新計算統計數據
  useEffect(() => {
    const calculatedStats = calculateStats()
    setStats(calculatedStats)
  }, [lessonProgress])

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
    <div className="w-full h-full flex flex-col text-slate-900">
      <div className="flex-1 space-y-8 rounded-[34px] border border-white/80 bg-white/90 px-10 py-10 shadow-[0_40px_80px_rgba(15,23,42,0.12)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
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
  )
}
