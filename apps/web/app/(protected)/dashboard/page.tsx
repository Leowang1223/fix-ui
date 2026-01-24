"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  ChevronRight,
  ChevronDown,
  Trophy,
  Flame,
  Target,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  Map
} from "lucide-react"
import DailyGoalCard from "@/components/goals/DailyGoalCard"
import LearningPathCard from "@/components/path/LearningPathCard"

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

const CHAPTER_TITLES: Record<string, string> = {
  'C1': 'Basic Chinese',
  'C2': 'Intermediate Conversations',
  'C3': 'Advanced Topics',
  'C4': 'Daily Life',
  'C5': 'Social Situations',
  'C6': 'Business Chinese',
  'C7': 'Travel & Leisure',
  'C8': 'Cultural Topics',
  'C9': 'Professional Communication',
  'C10': 'Advanced Mastery'
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
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${colorClasses[color]} min-w-[140px]`}>
      <div className={`p-2 rounded-xl ${color === 'blue' ? 'bg-blue-100' : color === 'amber' ? 'bg-amber-100' : color === 'green' ? 'bg-green-100' : 'bg-purple-100'}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-xs opacity-70">{label}</div>
      </div>
    </div>
  )
}

// Chapter accordion item
function ChapterItem({
  chapter,
  lessons,
  lessonProgress,
  isExpanded,
  onToggle,
  onLessonClick
}: {
  chapter: Chapter
  lessons: LessonSummary[]
  lessonProgress: Record<string, number>
  isExpanded: boolean
  onToggle: () => void
  onLessonClick: (lessonId: string) => void
}) {
  const chapterLessons = lessons.filter(l => l.chapterId === chapter.id)
  const completedCount = chapterLessons.filter(l => (lessonProgress[l.lesson_id] || 0) === 100).length
  const totalCount = chapterLessons.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors touch-manipulation"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`
            flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl font-bold text-sm sm:text-base
            ${progressPercent === 100
              ? 'bg-green-100 text-green-600'
              : progressPercent > 0
                ? 'bg-blue-100 text-blue-600'
                : 'bg-slate-100 text-slate-500'
            }
          `}>
            {chapter.id.replace('C', '')}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
              {CHAPTER_TITLES[chapter.id] || chapter.id}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 w-20 sm:w-24 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs text-slate-500">{completedCount}/{totalCount}</span>
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-2">
              {chapterLessons.map((lesson) => {
                const progress = lessonProgress[lesson.lesson_id] || 0
                const isCompleted = progress === 100
                const isInProgress = progress > 0 && progress < 100

                return (
                  <button
                    key={lesson.lesson_id}
                    onClick={() => onLessonClick(lesson.lesson_id)}
                    className={`
                      w-full flex items-center justify-between p-3 sm:p-4 rounded-xl
                      transition-all touch-manipulation
                      ${isCompleted
                        ? 'bg-green-50 border border-green-100'
                        : isInProgress
                          ? 'bg-blue-50 border border-blue-100'
                          : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold
                        ${isCompleted
                          ? 'bg-green-100 text-green-600'
                          : isInProgress
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-slate-200 text-slate-500'
                        }
                      `}>
                        {isCompleted ? <CheckCircle2 size={16} /> : lesson.lessonNumber}
                      </div>
                      <div className="text-left">
                        <span className={`text-sm font-medium ${isCompleted ? 'text-green-700' : 'text-slate-700'}`}>
                          {lesson.title}
                        </span>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {lesson.stepCount} steps
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isInProgress && (
                        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          {progress}%
                        </span>
                      )}
                      <ChevronRight size={18} className={isCompleted ? 'text-green-400' : 'text-slate-400'} />
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [lessonProgress, setLessonProgress] = useState<Record<string, number>>({})
  const [expandedChapter, setExpandedChapter] = useState<string | null>('C1')
  const [nextLesson, setNextLesson] = useState<LessonSummary | null>(null)

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
    // First, find in-progress lessons
    const inProgressLesson = allLessons.find(lesson => {
      const p = progress[lesson.lesson_id] || 0
      return p > 0 && p < 100
    })
    if (inProgressLesson) return inProgressLesson

    // Then find first incomplete lesson
    const incompleteLesson = allLessons.find(lesson => {
      const p = progress[lesson.lesson_id] || 0
      return p < 100
    })
    if (incompleteLesson) return incompleteLesson

    // If all complete, return first lesson
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

          const chapterMap = new Map<string, LessonSummary[]>()
          allLessons.forEach(lesson => {
            if (!chapterMap.has(lesson.chapterId)) {
              chapterMap.set(lesson.chapterId, [])
            }
            chapterMap.get(lesson.chapterId)!.push(lesson)
          })

          const chapterList: Chapter[] = Array.from(chapterMap.entries()).map(([id, lessons]) => ({
            id,
            title: CHAPTER_TITLES[id] || id,
            description: CHAPTER_DESCRIPTIONS[id],
            lessons: lessons.sort((a, b) => a.lessonNumber - b.lessonNumber)
          }))

          setChapters(chapterList.sort((a, b) => {
            const numA = parseInt(a.id.replace('C', ''))
            const numB = parseInt(b.id.replace('C', ''))
            return numA - numB
          }))

          const progressData = calculateLessonProgress()
          setLessonProgress(progressData)

          // Find and set next lesson
          const next = findNextLesson(allLessons, progressData)
          setNextLesson(next)

          // Auto-expand chapter with next lesson
          if (next) {
            setExpandedChapter(next.chapterId)
          }
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

  const todayGoal = stats.streak > 0 ? "Keep your streak going!" : "Complete 1 lesson today"
  const nextLessonProgress = nextLesson ? (lessonProgress[nextLesson.lesson_id] || 0) : 0

  return (
    <div className="w-full h-full flex flex-col text-slate-900">
      <div className="flex-1 space-y-6 sm:space-y-8">
        {/* Hero Section - Today's Goal */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-6 sm:p-8 text-white shadow-xl">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            {/* Daily Goal Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
              <Target size={16} />
              <span className="text-sm font-medium">Today's Goal</span>
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

            {/* Big CTA Button */}
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

        {/* Quick Stats - Horizontal Scroll on Mobile */}
        <section className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
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
            <StatCard
              icon={Flame}
              label="Streak"
              value={`${stats.streak} days`}
              color="green"
            />
          </div>
        </section>

        {/* Daily Goals & Learning Path Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DailyGoalCard />
          <LearningPathCard />
        </div>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={() => router.push('/quiz')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 hover:border-purple-200 transition-all touch-manipulation"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-purple-800">TOCFL Practice</p>
              <p className="text-xs text-purple-600">Test your skills</p>
            </div>
          </motion.button>

          <motion.button
            onClick={() => router.push('/conversation')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 hover:border-emerald-200 transition-all touch-manipulation"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-emerald-800">AI Conversation</p>
              <p className="text-xs text-emerald-600">Practice speaking</p>
            </div>
          </motion.button>
        </section>

        {/* Chapter List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">
              Learning Path
            </h2>
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {chapters.length} Chapters
            </span>
          </div>

          <div className="space-y-3">
            {chapters.map((chapter) => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                lessons={lessons}
                lessonProgress={lessonProgress}
                isExpanded={expandedChapter === chapter.id}
                onToggle={() => setExpandedChapter(
                  expandedChapter === chapter.id ? null : chapter.id
                )}
                onLessonClick={handleLessonClick}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
