"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Play,
  Trophy,
  Flame,
  Target,
  TrendingUp,
  BookOpen,
  Clock,
  Sparkles,
  MessageCircle,
  Map,
  Layers
} from "lucide-react"
import DailyGoalCard from "@/components/goals/DailyGoalCard"
import LearningPathCard from "@/components/path/LearningPathCard"
import { TrendChart } from "@/components/ui/TrendChart"
import { SmartRecommendationBanner } from "@/components/ui/RecommendationCard"
import { getTopRecommendation, Recommendation } from "@/lib/recommendations"
import { Tooltip } from "@/components/ui/Tooltip"
import { PageGuide } from "@/components/onboarding"

interface StatsState {
  lessons: number
  avgScore: number
  levelIndex: number
  streak: number
}

interface LessonSummary {
  lesson_id: string
  chapterId: string
  lessonNumber: number
  title: string
  description?: string
  stepCount: number
}

interface LessonHistoryEntry {
  sessionId: string
  lessonId: string
  lessonTitle: string
  completedAt: string
  totalScore: number
  questionsCount: number
  results: unknown[]
}

// Quick stat card component
function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Trophy
  label: string
  value: string
  color: 'blue' | 'amber' | 'green' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100'
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border ${colorClasses[color]} flex-shrink-0 w-[110px] sm:w-auto sm:flex-1`}>
      <div className={`p-1.5 sm:p-2 rounded-xl flex-shrink-0 ${color === 'blue' ? 'bg-blue-100' : color === 'amber' ? 'bg-amber-100' : color === 'green' ? 'bg-green-100' : 'bg-purple-100'}`}>
        <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm sm:text-lg font-bold truncate">{value}</div>
        <div className="text-[10px] sm:text-xs opacity-70 truncate">{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatsState>({
    lessons: 0,
    avgScore: 0,
    levelIndex: 0,
    streak: 0,
  })
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [lessonProgress, setLessonProgress] = useState<Record<string, number>>({})
  const [nextLesson, setNextLesson] = useState<LessonSummary | null>(null)
  const [topRecommendation, setTopRecommendation] = useState<Recommendation | null>(null)
  const [showRecommendationBanner, setShowRecommendationBanner] = useState(true)

  // Calculate lesson progress from history
  const calculateLessonProgress = (): Record<string, number> => {
    if (typeof window === 'undefined') return {}

    try {
      const historyRaw = localStorage.getItem('lessonHistory')
      if (!historyRaw) return {}

      const history: LessonHistoryEntry[] = JSON.parse(historyRaw)
      const progressMap: Record<string, number> = {}

      history.forEach((entry) => {
        const lessonId = entry.lessonId
        const questionsCount = entry.questionsCount || 0
        const answeredCount = entry.results?.length || 0

        if (questionsCount > 0) {
          const percentage = Math.round((answeredCount / questionsCount) * 100)
          if (!progressMap[lessonId] || progressMap[lessonId] < percentage) {
            progressMap[lessonId] = percentage
          }
        }
      })

      return progressMap
    } catch (error) {
      console.error('Failed to calculate lesson progress:', error)
      return {}
    }
  }

  // Calculate stats from history
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
      const lessonProgressMap: Record<string, { progress: number, score: number }> = {}

      history.forEach((entry) => {
        const lessonId = entry.lessonId
        const questionsCount = entry.questionsCount || 0
        const answeredCount = entry.results?.length || 0
        const progress = questionsCount > 0
          ? Math.round((answeredCount / questionsCount) * 100)
          : 0
        const score = entry.totalScore || 0

        if (!lessonProgressMap[lessonId] || lessonProgressMap[lessonId].progress < progress) {
          lessonProgressMap[lessonId] = { progress, score }
        }
      })

      const completedLessons = Object.values(lessonProgressMap).filter(
        (data) => data.progress === 100
      )
      const completedCount = completedLessons.length

      const avgScore = completedCount > 0
        ? Math.round(
            completedLessons.reduce((sum, data) => sum + data.score, 0) / completedCount
          )
        : 0

      const levelIndex = parseFloat((completedCount / 10).toFixed(1))
      const streak = calculateStreakDays(history)

      return {
        lessons: completedCount,
        avgScore,
        levelIndex,
        streak
      }
    } catch (error) {
      console.error('Failed to calculate stats:', error)
      return { lessons: 0, avgScore: 0, levelIndex: 0, streak: 0 }
    }
  }

  // Calculate streak days
  const calculateStreakDays = (history: LessonHistoryEntry[]): number => {
    if (history.length === 0) return 0

    const completionDates = history
      .map((entry) => {
        const date = new Date(entry.completedAt)
        return new Date(date.getFullYear(), date.getMonth(), date.getDate())
      })
      .sort((a, b) => b.getTime() - a.getTime())

    const uniqueDates = Array.from(
      new Set(completionDates.map(d => d.getTime()))
    ).map(time => new Date(time))

    if (uniqueDates.length === 0) return 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const latestDate = uniqueDates[0]
    const latestTime = latestDate.getTime()
    const todayTime = today.getTime()
    const yesterdayTime = yesterday.getTime()

    if (latestTime !== todayTime && latestTime !== yesterdayTime) {
      return 0
    }

    let streakCount = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = uniqueDates[i]
      const previousDate = uniqueDates[i - 1]
      const diffInDays = Math.round(
        (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (diffInDays === 1) {
        streakCount++
      } else {
        break
      }
    }

    return streakCount
  }

  // Find next lesson to continue
  const findNextLesson = (allLessons: LessonSummary[], progress: Record<string, number>): LessonSummary | null => {
    const inProgressLesson = allLessons.find(lesson => {
      const p = progress[lesson.lesson_id] || 0
      return p > 0 && p < 100
    })
    if (inProgressLesson) return inProgressLesson

    const incompleteLesson = allLessons.find(lesson => {
      const p = progress[lesson.lesson_id] || 0
      return p < 100
    })
    if (incompleteLesson) return incompleteLesson

    return allLessons[0] || null
  }

  // Data migration
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

  // Calculate initial stats
  useEffect(() => {
    const calculatedStats = calculateStats()
    setStats(calculatedStats)
  }, [])

  // Fetch lessons
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

          const progressData = calculateLessonProgress()
          setLessonProgress(progressData)

          const next = findNextLesson(allLessons, progressData)
          setNextLesson(next)
        }
      } catch (error) {
        console.error("Failed to fetch lessons:", error)
      }
    }

    fetchLessons()
  }, [])

  // Recalculate stats when progress changes
  useEffect(() => {
    const calculatedStats = calculateStats()
    setStats(calculatedStats)
  }, [lessonProgress])

  // Load top recommendation for banner
  useEffect(() => {
    const top = getTopRecommendation()
    setTopRecommendation(top)
  }, [lessonProgress])

  const handleLessonClick = (lessonId: string) => {
    router.push(`/lesson/${lessonId}`)
  }

  const handleStartLesson = () => {
    if (nextLesson) {
      handleLessonClick(nextLesson.lesson_id)
    } else if (lessons.length > 0) {
      handleLessonClick(lessons[0].lesson_id)
    }
  }

  const handleRecommendationClick = (rec: Recommendation) => {
    router.push(`/lesson/${rec.lessonId}`)
  }

  const todayGoal = stats.streak > 0 ? "Keep your streak going!" : "Complete 1 lesson today"
  const nextLessonProgress = nextLesson ? (lessonProgress[nextLesson.lesson_id] || 0) : 0

  return (
    <div className="w-full h-full flex flex-col text-slate-900 overflow-x-hidden">
      <div className="flex-1 space-y-6 sm:space-y-8 overflow-x-hidden">
        {/* Hero Section - Today's Goal */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
              <Target size={16} />
              <span className="text-sm font-medium">Today&apos;s Goal</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
              {todayGoal}
            </h1>

            {nextLesson && (
              <p className="text-blue-100 text-sm sm:text-base mb-6">
                {nextLessonProgress > 0
                  ? `Continue "${nextLesson.title}" (${nextLessonProgress}% complete)`
                  : `Next up: ${nextLesson.title}`
                }
              </p>
            )}

            <motion.button
              onClick={handleStartLesson}
              className="
                flex items-center justify-center gap-3
                w-full sm:w-auto
                px-8 py-4 sm:py-5
                bg-white text-blue-600
                rounded-2xl
                font-bold text-base sm:text-lg
                shadow-[0_20px_40px_rgba(0,0,0,0.2)]
                hover:shadow-[0_25px_50px_rgba(0,0,0,0.25)]
                transition-all
                touch-manipulation
              "
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play size={24} fill="currentColor" />
              <span>Start Learning</span>
              <Sparkles size={20} className="text-amber-500" />
            </motion.button>
          </div>
        </section>

        {/* Quick Stats */}
        <section
          className="relative sm:overflow-visible"
          aria-label="Learning statistics"
        >
          <div className="sm:hidden absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#f7f9ff] to-transparent pointer-events-none z-10" />
          <div className="sm:hidden absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[#f7f9ff] to-transparent pointer-events-none z-10" />
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-thin">
            <div
              className="flex gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 pb-2 sm:pb-0"
              role="region"
              aria-live="polite"
              aria-atomic="true"
            >
            <StatCard
              icon={BookOpen}
              label="Completed"
              value={stats.lessons.toString()}
              color="blue"
            />
            <StatCard
              icon={Trophy}
              label="Avg Score"
              value={`${stats.avgScore}%`}
              color="amber"
            />
            <StatCard
              icon={TrendingUp}
              label="Level"
              value={stats.levelIndex.toString()}
              color="purple"
            />
            <Tooltip content="Complete lessons daily to build your streak!" position="bottom">
              <StatCard
                icon={Flame}
                label="Streak"
                value={`${stats.streak} days`}
                color="green"
              />
            </Tooltip>
            </div>
          </div>
        </section>

        {/* Smart Recommendation Banner */}
        {showRecommendationBanner && topRecommendation && (
          <section>
            <SmartRecommendationBanner
              recommendation={topRecommendation}
              onStart={() => handleRecommendationClick(topRecommendation)}
              onDismiss={() => setShowRecommendationBanner(false)}
            />
          </section>
        )}

        {/* Daily Goals & Learning Path Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DailyGoalCard />
          <LearningPathCard />
        </div>

        {/* Learning Trend Chart */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Learning Trend</h3>
            <span className="text-xs text-slate-400">Last 7 days</span>
          </div>
          <TrendChart days={7} height={140} showStats={true} />
        </section>

        {/* Quick Actions */}
        <section className="space-y-3">
          <h3 className="font-semibold text-slate-800">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={() => router.push('/learning-path')}
              className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 hover:border-indigo-200 transition-all touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                <Map className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-indigo-800">Learning Path</p>
                <p className="text-xs text-indigo-600">Browse chapters</p>
              </div>
            </motion.button>

            <motion.button
              onClick={() => router.push('/conversation')}
              className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 hover:border-emerald-200 transition-all touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-emerald-800">AI Conversation</p>
                <p className="text-xs text-emerald-600">Practice speaking</p>
              </div>
            </motion.button>

            <motion.button
              onClick={() => router.push('/flashcards')}
              className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 hover:border-sky-200 transition-all touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-sky-800">Flashcards</p>
                <p className="text-xs text-sky-600">Review vocabulary</p>
              </div>
            </motion.button>

            <motion.button
              onClick={() => router.push('/history')}
              className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 hover:border-amber-200 transition-all touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-amber-800">History</p>
                <p className="text-xs text-amber-600">Review progress</p>
              </div>
            </motion.button>
          </div>
        </section>
      </div>

      {/* First-visit feature guide */}
      <PageGuide
        pageId="dashboard"
        steps={[
          {
            title: 'Your Learning Overview',
            description: 'See your progress stats, streak count, and current level at a glance.',
            icon: TrendingUp,
          },
          {
            title: 'Daily Goals',
            description: 'Track your daily learning targets and build consistent study habits.',
            icon: Target,
          },
          {
            title: 'Quick Actions',
            description: 'Jump straight to Learning Path, AI Conversation, Flashcards, or History.',
            icon: Sparkles,
          },
          {
            title: 'Smart Recommendations',
            description: 'Get personalized suggestions based on your learning patterns and weak areas.',
            icon: BookOpen,
          },
        ]}
      />
    </div>
  )
}
