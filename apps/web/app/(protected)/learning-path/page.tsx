"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  BookOpen,
  Trophy,
  TrendingUp,
} from "lucide-react"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageGuide } from "@/components/onboarding"

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
  results: unknown[]
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
  const { chapterLessons, completedCount, totalCount, progressPercent } = useMemo<{
    chapterLessons: LessonSummary[]
    completedCount: number
    totalCount: number
    progressPercent: number
  }>(() => {
    const filtered = lessons.filter(l => l.chapterId === chapter.id)
    const completed = filtered.filter(l => (lessonProgress[l.lesson_id] || 0) === 100).length
    const total = filtered.length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { chapterLessons: filtered, completedCount: completed, totalCount: total, progressPercent: percent }
  }, [lessons, chapter.id, lessonProgress])

  const chapterId = `chapter-${chapter.id}`
  const panelId = `panel-${chapter.id}`

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <div
      className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm"
      role="region"
      aria-labelledby={chapterId}
    >
      <button
        id={chapterId}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors touch-manipulation min-h-[64px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`
            flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-bold text-sm sm:text-base
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
            {CHAPTER_DESCRIPTIONS[chapter.id] && (
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                {CHAPTER_DESCRIPTIONS[chapter.id]}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <div
                className="flex-1 h-1.5 w-20 sm:w-24 bg-slate-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Chapter progress: ${progressPercent}%`}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs text-slate-500" aria-hidden="true">{completedCount}/{totalCount}</span>
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden="true"
        >
          <ChevronDown size={20} className="text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={chapterId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-2" role="list">
              {chapterLessons.map((lesson) => {
                const progress = lessonProgress[lesson.lesson_id] || 0
                const isCompleted = progress === 100
                const isInProgress = progress > 0 && progress < 100

                return (
                  <button
                    key={lesson.lesson_id}
                    onClick={() => onLessonClick(lesson.lesson_id)}
                    role="listitem"
                    aria-label={`${lesson.title}, ${lesson.stepCount} steps${isCompleted ? ', completed' : isInProgress ? `, ${progress}% complete` : ''}`}
                    className={`
                      w-full flex items-center justify-between p-3 sm:p-4 rounded-xl
                      transition-all touch-manipulation min-h-[56px]
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
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
                        flex items-center justify-center w-9 h-9 rounded-lg text-xs font-semibold
                        ${isCompleted
                          ? 'bg-green-100 text-green-600'
                          : isInProgress
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-slate-200 text-slate-500'
                        }
                      `}>
                        {isCompleted ? <CheckCircle2 size={16} aria-hidden="true" /> : lesson.lessonNumber}
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
                      <ChevronRight size={18} className={isCompleted ? 'text-green-400' : 'text-slate-400'} aria-hidden="true" />
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

export default function LearningPathPage() {
  const router = useRouter()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [lessonProgress, setLessonProgress] = useState<Record<string, number>>({})
  const [expandedChapter, setExpandedChapter] = useState<string | null>('C1')

  // Overall stats
  const [completedCount, setCompletedCount] = useState(0)
  const [totalLessons, setTotalLessons] = useState(0)
  const [avgScore, setAvgScore] = useState(0)

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
    } catch {
      return {}
    }
  }

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
          setTotalLessons(allLessons.length)

          const chapterMap: Record<string, LessonSummary[]> = {}
          allLessons.forEach(lesson => {
            if (!chapterMap[lesson.chapterId]) {
              chapterMap[lesson.chapterId] = []
            }
            chapterMap[lesson.chapterId].push(lesson)
          })

          const chapterList: Chapter[] = Object.entries(chapterMap).map(([id, chapterLessons]) => ({
            id,
            title: CHAPTER_TITLES[id] || id,
            description: CHAPTER_DESCRIPTIONS[id],
            lessons: chapterLessons.sort((a, b) => a.lessonNumber - b.lessonNumber)
          }))

          setChapters(chapterList.sort((a, b) => {
            const numA = parseInt(a.id.replace('C', ''))
            const numB = parseInt(b.id.replace('C', ''))
            return numA - numB
          }))

          const progressData = calculateLessonProgress()
          setLessonProgress(progressData)

          // Calculate stats
          const completed = Object.values(progressData).filter(p => p === 100).length
          setCompletedCount(completed)

          // Calculate avg score
          try {
            const historyRaw = localStorage.getItem('lessonHistory')
            if (historyRaw) {
              const history: LessonHistoryEntry[] = JSON.parse(historyRaw)
              const scores = history.filter(e => e.totalScore > 0).map(e => e.totalScore)
              if (scores.length > 0) {
                setAvgScore(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))
              }
            }
          } catch { /* ignore */ }

          // Auto-expand chapter with next incomplete lesson
          const nextIncomplete = allLessons.find(l => (progressData[l.lesson_id] || 0) < 100)
          if (nextIncomplete) {
            setExpandedChapter(nextIncomplete.chapterId)
          }
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

  const overallProgress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  return (
    <div className="w-full h-full flex flex-col text-slate-900">
      <div className="flex-1 space-y-6 sm:space-y-8">
        {/* Header with overall progress */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-600 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
              <BookOpen size={16} />
              <span className="text-sm font-medium">Learning Path</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
              Your Chinese Journey
            </h1>
            <p className="text-purple-100 text-sm sm:text-base mb-6">
              Master Chinese step by step through structured chapters and lessons.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div className="text-lg font-bold">{completedCount}/{totalLessons}</div>
                  <div className="text-xs text-purple-200">Lessons</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <Trophy size={18} />
                </div>
                <div>
                  <div className="text-lg font-bold">{avgScore}%</div>
                  <div className="text-xs text-purple-200">Avg Score</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div className="text-lg font-bold">{overallProgress}%</div>
                  <div className="text-xs text-purple-200">Complete</div>
                </div>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="mt-4">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Chapter List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">
              Chapters
            </h2>
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {chapters.length} Chapters
            </span>
          </div>

          <div className="space-y-3">
            {chapters.length > 0 ? (
              chapters.map((chapter) => (
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
              ))
            ) : (
              <EmptyState
                type="lesson"
                title="Loading courses..."
                description="If this persists, please check your network connection"
                actionLabel="Retry"
                onAction={() => window.location.reload()}
              />
            )}
          </div>
        </section>
      </div>

      {/* First-visit feature guide */}
      <PageGuide
        pageId="learning-path"
        steps={[
          {
            title: 'Chapter Structure',
            description: 'Lessons are organized into chapters by topic. Tap a chapter to expand and see its lessons.',
            icon: BookOpen,
          },
          {
            title: 'Track Your Progress',
            description: 'Each lesson shows a completion percentage. Green means fully completed!',
            icon: CheckCircle2,
          },
          {
            title: 'Start a Lesson',
            description: 'Tap any lesson to begin practicing pronunciation with step-by-step guidance.',
            icon: ChevronRight,
          },
        ]}
      />
    </div>
  )
}
