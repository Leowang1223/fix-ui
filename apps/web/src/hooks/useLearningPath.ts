'use client'

import { useState, useEffect, useCallback } from 'react'

export type SkillLevel = 'beginner' | 'elementary' | 'intermediate' | 'upper-intermediate' | 'advanced' | 'fluent'

export interface LearningMilestone {
  id: string
  title: string
  titleZh: string
  description: string
  targetLevel: SkillLevel
  requiredLessons: number
  requiredVocab: number
  requiredConversationHours: number
  isCompleted: boolean
  completedAt?: string
}

export interface LearningPathConfig {
  currentLevel: SkillLevel
  targetLevel: SkillLevel
  weeklyLessonGoal: number
  targetDate?: string
  focusAreas: string[]
}

export interface LearningProgress {
  totalLessonsCompleted: number
  totalVocabLearned: number
  totalConversationMinutes: number
  currentStreak: number
  longestStreak: number
  startDate: string
  lastActivityDate: string
  weakAreas: string[]
  strongAreas: string[]
}

export interface LearningPathData {
  config: LearningPathConfig
  progress: LearningProgress
  milestones: LearningMilestone[]
  currentMilestoneIndex: number
}

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced', 'fluent']

const SKILL_LEVEL_NAMES: Record<SkillLevel, { en: string; zh: string }> = {
  beginner: { en: 'Beginner', zh: '入門' },
  elementary: { en: 'Elementary', zh: '基礎' },
  intermediate: { en: 'Intermediate', zh: '中級' },
  'upper-intermediate': { en: 'Upper Intermediate', zh: '中高級' },
  advanced: { en: 'Advanced', zh: '高級' },
  fluent: { en: 'Fluent', zh: '流利' }
}

const DEFAULT_MILESTONES: LearningMilestone[] = [
  {
    id: 'M1',
    title: 'First Steps',
    titleZh: '踏出第一步',
    description: 'Learn basic greetings and introductions',
    targetLevel: 'beginner',
    requiredLessons: 5,
    requiredVocab: 50,
    requiredConversationHours: 0.5,
    isCompleted: false
  },
  {
    id: 'M2',
    title: 'Daily Basics',
    titleZh: '日常基礎',
    description: 'Master everyday conversations and numbers',
    targetLevel: 'elementary',
    requiredLessons: 15,
    requiredVocab: 150,
    requiredConversationHours: 2,
    isCompleted: false
  },
  {
    id: 'M3',
    title: 'Confident Speaker',
    titleZh: '自信開口',
    description: 'Handle shopping, dining, and transportation',
    targetLevel: 'intermediate',
    requiredLessons: 30,
    requiredVocab: 400,
    requiredConversationHours: 5,
    isCompleted: false
  },
  {
    id: 'M4',
    title: 'Social Butterfly',
    titleZh: '社交達人',
    description: 'Navigate social situations and workplaces',
    targetLevel: 'upper-intermediate',
    requiredLessons: 50,
    requiredVocab: 800,
    requiredConversationHours: 10,
    isCompleted: false
  },
  {
    id: 'M5',
    title: 'Professional',
    titleZh: '專業水準',
    description: 'Communicate effectively in professional settings',
    targetLevel: 'advanced',
    requiredLessons: 80,
    requiredVocab: 1500,
    requiredConversationHours: 20,
    isCompleted: false
  },
  {
    id: 'M6',
    title: 'Mastery',
    titleZh: '精通掌握',
    description: 'Achieve fluency in complex topics',
    targetLevel: 'fluent',
    requiredLessons: 120,
    requiredVocab: 3000,
    requiredConversationHours: 40,
    isCompleted: false
  }
]

const STORAGE_KEY = 'learningPath'

function calculateProgressFromHistory(): Partial<LearningProgress> {
  try {
    const historyStr = localStorage.getItem('lessonHistory')
    if (!historyStr) return {}

    const history = JSON.parse(historyStr)
    const totalLessonsCompleted = history.length

    // Calculate vocabulary (estimate based on lessons)
    const totalVocabLearned = totalLessonsCompleted * 10 // ~10 vocab per lesson

    // Get dates
    const dates = history.map((h: any) => new Date(h.completedAt).toISOString().split('T')[0])
    const uniqueDates = Array.from(new Set(dates)) as string[]
    const startDate = uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : new Date().toISOString().split('T')[0]
    const lastActivityDate = uniqueDates.length > 0 ? uniqueDates[0] : new Date().toISOString().split('T')[0]

    return {
      totalLessonsCompleted,
      totalVocabLearned,
      startDate,
      lastActivityDate
    }
  } catch {
    return {}
  }
}

export function useLearningPath() {
  const [data, setData] = useState<LearningPathData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load data
  useEffect(() => {
    const loadData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const historyProgress = calculateProgressFromHistory()

        if (stored) {
          const parsed: LearningPathData = JSON.parse(stored)

          // Merge with actual progress from history
          const updatedProgress = {
            ...parsed.progress,
            totalLessonsCompleted: historyProgress.totalLessonsCompleted || parsed.progress.totalLessonsCompleted,
            totalVocabLearned: historyProgress.totalVocabLearned || parsed.progress.totalVocabLearned,
            lastActivityDate: historyProgress.lastActivityDate || parsed.progress.lastActivityDate
          }

          // Update milestones based on progress
          const updatedMilestones = parsed.milestones.map(milestone => {
            const isCompleted =
              updatedProgress.totalLessonsCompleted >= milestone.requiredLessons &&
              updatedProgress.totalVocabLearned >= milestone.requiredVocab &&
              updatedProgress.totalConversationMinutes >= milestone.requiredConversationHours * 60

            return {
              ...milestone,
              isCompleted,
              completedAt: isCompleted && !milestone.completedAt ? new Date().toISOString() : milestone.completedAt
            }
          })

          // Find current milestone
          const currentMilestoneIndex = updatedMilestones.findIndex(m => !m.isCompleted)

          const updatedData: LearningPathData = {
            ...parsed,
            progress: updatedProgress,
            milestones: updatedMilestones,
            currentMilestoneIndex: currentMilestoneIndex === -1 ? updatedMilestones.length - 1 : currentMilestoneIndex
          }

          setData(updatedData)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
        } else {
          // Initialize new user
          const newData: LearningPathData = {
            config: {
              currentLevel: 'beginner',
              targetLevel: 'intermediate',
              weeklyLessonGoal: 5,
              focusAreas: ['speaking', 'listening']
            },
            progress: {
              totalLessonsCompleted: historyProgress.totalLessonsCompleted || 0,
              totalVocabLearned: historyProgress.totalVocabLearned || 0,
              totalConversationMinutes: 0,
              currentStreak: 0,
              longestStreak: 0,
              startDate: historyProgress.startDate || new Date().toISOString().split('T')[0],
              lastActivityDate: historyProgress.lastActivityDate || new Date().toISOString().split('T')[0],
              weakAreas: [],
              strongAreas: []
            },
            milestones: DEFAULT_MILESTONES,
            currentMilestoneIndex: 0
          }

          setData(newData)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
        }
      } catch (error) {
        console.error('Failed to load learning path:', error)
      }
      setIsLoading(false)
    }

    loadData()
  }, [])

  // Save data
  const saveData = useCallback((newData: LearningPathData) => {
    setData(newData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
  }, [])

  // Update config
  const updateConfig = useCallback((updates: Partial<LearningPathConfig>) => {
    if (!data) return

    const updatedData: LearningPathData = {
      ...data,
      config: { ...data.config, ...updates }
    }
    saveData(updatedData)
  }, [data, saveData])

  // Get current milestone
  const getCurrentMilestone = useCallback((): LearningMilestone | null => {
    if (!data) return null
    return data.milestones[data.currentMilestoneIndex] || null
  }, [data])

  // Get milestone progress percentage
  const getMilestoneProgress = useCallback((milestone: LearningMilestone): number => {
    if (!data) return 0

    const lessonsProgress = Math.min(100, (data.progress.totalLessonsCompleted / milestone.requiredLessons) * 100)
    const vocabProgress = Math.min(100, (data.progress.totalVocabLearned / milestone.requiredVocab) * 100)
    const conversationProgress = Math.min(100, (data.progress.totalConversationMinutes / (milestone.requiredConversationHours * 60)) * 100)

    return Math.round((lessonsProgress + vocabProgress + conversationProgress) / 3)
  }, [data])

  // Get overall progress to target
  const getOverallProgress = useCallback((): number => {
    if (!data) return 0

    const currentLevelIndex = SKILL_LEVELS.indexOf(data.config.currentLevel)
    const targetLevelIndex = SKILL_LEVELS.indexOf(data.config.targetLevel)

    if (currentLevelIndex >= targetLevelIndex) return 100

    const completedMilestones = data.milestones.filter(m => m.isCompleted).length
    const targetMilestones = targetLevelIndex + 1

    return Math.round((completedMilestones / targetMilestones) * 100)
  }, [data])

  // Get estimated completion date
  const getEstimatedCompletion = useCallback((): string | null => {
    if (!data) return null

    const currentMilestone = getCurrentMilestone()
    if (!currentMilestone) return null

    const remainingLessons = Math.max(0, currentMilestone.requiredLessons - data.progress.totalLessonsCompleted)
    const weeksNeeded = Math.ceil(remainingLessons / data.config.weeklyLessonGoal)

    const estimatedDate = new Date()
    estimatedDate.setDate(estimatedDate.getDate() + weeksNeeded * 7)

    return estimatedDate.toISOString().split('T')[0]
  }, [data, getCurrentMilestone])

  return {
    data,
    isLoading,
    updateConfig,
    getCurrentMilestone,
    getMilestoneProgress,
    getOverallProgress,
    getEstimatedCompletion,
    SKILL_LEVELS,
    SKILL_LEVEL_NAMES
  }
}
