'use client'

import { useState, useEffect, useCallback } from 'react'

export interface DailyGoalConfig {
  lessonsToComplete: number
  vocabToReview: number
  conversationMinutes: number
  practiceQuestions: number
}

export interface DailyProgress {
  lessonsCompleted: number
  vocabReviewed: number
  conversationMinutes: number
  questionsAnswered: number
}

export interface DailyGoalData {
  date: string
  goals: DailyGoalConfig
  progress: DailyProgress
  streak: number
  lastCompletedDate: string | null
}

const DEFAULT_GOALS: DailyGoalConfig = {
  lessonsToComplete: 1,
  vocabToReview: 10,
  conversationMinutes: 5,
  practiceQuestions: 5
}

const DEFAULT_PROGRESS: DailyProgress = {
  lessonsCompleted: 0,
  vocabReviewed: 0,
  conversationMinutes: 0,
  questionsAnswered: 0
}

const STORAGE_KEY = 'dailyGoals'

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function getYesterdayString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

export function useDailyGoals() {
  const [data, setData] = useState<DailyGoalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const today = getTodayString()
        const yesterday = getYesterdayString()

        if (stored) {
          const parsed: DailyGoalData = JSON.parse(stored)

          // Check if it's a new day
          if (parsed.date !== today) {
            // Calculate streak
            let newStreak = parsed.streak
            const wasCompletedYesterday = parsed.lastCompletedDate === yesterday
            const wasCompletedToday = parsed.lastCompletedDate === today

            if (!wasCompletedYesterday && !wasCompletedToday) {
              // Streak broken
              newStreak = 0
            }

            // Reset progress for new day, keep goals
            const newData: DailyGoalData = {
              date: today,
              goals: parsed.goals,
              progress: DEFAULT_PROGRESS,
              streak: newStreak,
              lastCompletedDate: parsed.lastCompletedDate
            }
            setData(newData)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
          } else {
            setData(parsed)
          }
        } else {
          // First time user
          const newData: DailyGoalData = {
            date: today,
            goals: DEFAULT_GOALS,
            progress: DEFAULT_PROGRESS,
            streak: 0,
            lastCompletedDate: null
          }
          setData(newData)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
        }
      } catch (error) {
        console.error('Failed to load daily goals:', error)
        // Reset to defaults on error
        const newData: DailyGoalData = {
          date: getTodayString(),
          goals: DEFAULT_GOALS,
          progress: DEFAULT_PROGRESS,
          streak: 0,
          lastCompletedDate: null
        }
        setData(newData)
      }
      setIsLoading(false)
    }

    loadData()
  }, [])

  // Save data to localStorage whenever it changes
  const saveData = useCallback((newData: DailyGoalData) => {
    setData(newData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
  }, [])

  // Update goals configuration
  const updateGoals = useCallback((newGoals: Partial<DailyGoalConfig>) => {
    if (!data) return

    const updatedData: DailyGoalData = {
      ...data,
      goals: { ...data.goals, ...newGoals }
    }
    saveData(updatedData)
  }, [data, saveData])

  // Update progress
  const updateProgress = useCallback((key: keyof DailyProgress, value: number) => {
    if (!data) return

    const newProgress = { ...data.progress, [key]: value }
    const today = getTodayString()

    // Check if all goals are completed
    const isCompleted =
      newProgress.lessonsCompleted >= data.goals.lessonsToComplete &&
      newProgress.vocabReviewed >= data.goals.vocabToReview &&
      newProgress.conversationMinutes >= data.goals.conversationMinutes &&
      newProgress.questionsAnswered >= data.goals.practiceQuestions

    let newStreak = data.streak
    let lastCompletedDate = data.lastCompletedDate

    if (isCompleted && lastCompletedDate !== today) {
      // Just completed today's goals
      newStreak = data.streak + 1
      lastCompletedDate = today
    }

    const updatedData: DailyGoalData = {
      ...data,
      progress: newProgress,
      streak: newStreak,
      lastCompletedDate
    }
    saveData(updatedData)
  }, [data, saveData])

  // Increment progress
  const incrementProgress = useCallback((key: keyof DailyProgress, amount: number = 1) => {
    if (!data) return
    const currentValue = data.progress[key]
    updateProgress(key, currentValue + amount)
  }, [data, updateProgress])

  // Calculate completion percentage
  const getCompletionPercentage = useCallback((): number => {
    if (!data) return 0

    const { goals, progress } = data
    const totalGoals = 4 // 4 categories

    let completed = 0
    if (progress.lessonsCompleted >= goals.lessonsToComplete) completed++
    if (progress.vocabReviewed >= goals.vocabToReview) completed++
    if (progress.conversationMinutes >= goals.conversationMinutes) completed++
    if (progress.questionsAnswered >= goals.practiceQuestions) completed++

    return Math.round((completed / totalGoals) * 100)
  }, [data])

  // Get individual goal progress
  const getGoalProgress = useCallback((key: keyof DailyProgress): { current: number; target: number; percentage: number } => {
    if (!data) return { current: 0, target: 1, percentage: 0 }

    const goalKeyMap: Record<keyof DailyProgress, keyof DailyGoalConfig> = {
      lessonsCompleted: 'lessonsToComplete',
      vocabReviewed: 'vocabToReview',
      conversationMinutes: 'conversationMinutes',
      questionsAnswered: 'practiceQuestions'
    }

    const current = data.progress[key]
    const target = data.goals[goalKeyMap[key]]
    const percentage = Math.min(100, Math.round((current / target) * 100))

    return { current, target, percentage }
  }, [data])

  // Check if today's goals are completed
  const isTodayCompleted = useCallback((): boolean => {
    if (!data) return false
    return data.lastCompletedDate === getTodayString()
  }, [data])

  return {
    data,
    isLoading,
    updateGoals,
    updateProgress,
    incrementProgress,
    getCompletionPercentage,
    getGoalProgress,
    isTodayCompleted
  }
}
