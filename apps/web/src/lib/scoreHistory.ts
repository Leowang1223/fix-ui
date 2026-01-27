/**
 * 學習分數歷史記錄系統
 * 使用 localStorage 追蹤學習進度
 */

export interface ScoreRecord {
  id: string
  lessonId: string
  lessonTitle: string
  questionIndex: number
  score: number
  timestamp: number
  type: 'lesson' | 'conversation'
  details?: {
    pronunciation?: number
    fluency?: number
    accuracy?: number
    comprehension?: number
  }
}

export interface DailyStats {
  date: string // YYYY-MM-DD
  totalSessions: number
  averageScore: number
  bestScore: number
  totalMinutes: number
  lessonsCompleted: number
  conversationsCompleted: number
}

export interface WeeklyStats {
  weekStart: string // YYYY-MM-DD
  dailyStats: DailyStats[]
  averageScore: number
  totalSessions: number
  improvement: number // 與上週相比
}

const SCORE_HISTORY_KEY = 'scoreHistory'
const DAILY_STATS_KEY = 'dailyStats'
const MAX_HISTORY_ITEMS = 500

/**
 * 獲取所有分數記錄
 */
export function getScoreHistory(): ScoreRecord[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(SCORE_HISTORY_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * 添加新的分數記錄
 */
export function addScoreRecord(record: Omit<ScoreRecord, 'id' | 'timestamp'>): ScoreRecord {
  const history = getScoreHistory()

  const newRecord: ScoreRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  }

  history.unshift(newRecord)

  // 限制歷史記錄數量
  if (history.length > MAX_HISTORY_ITEMS) {
    history.splice(MAX_HISTORY_ITEMS)
  }

  localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(history))

  // 更新每日統計
  updateDailyStats(newRecord)

  return newRecord
}

/**
 * 獲取每日統計數據
 */
export function getDailyStats(): Record<string, DailyStats> {
  if (typeof window === 'undefined') return {}

  try {
    const stored = localStorage.getItem(DAILY_STATS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * 更新每日統計
 */
function updateDailyStats(record: ScoreRecord): void {
  const stats = getDailyStats()
  const dateKey = new Date(record.timestamp).toISOString().split('T')[0]

  const dayStats = stats[dateKey] || {
    date: dateKey,
    totalSessions: 0,
    averageScore: 0,
    bestScore: 0,
    totalMinutes: 0,
    lessonsCompleted: 0,
    conversationsCompleted: 0,
  }

  // 更新統計
  const oldTotal = dayStats.averageScore * dayStats.totalSessions
  dayStats.totalSessions += 1
  dayStats.averageScore = Math.round((oldTotal + record.score) / dayStats.totalSessions)
  dayStats.bestScore = Math.max(dayStats.bestScore, record.score)
  dayStats.totalMinutes += 2 // 估計每次練習約 2 分鐘

  if (record.type === 'lesson') {
    dayStats.lessonsCompleted += 1
  } else {
    dayStats.conversationsCompleted += 1
  }

  stats[dateKey] = dayStats
  localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(stats))
}

/**
 * 獲取最近 N 天的統計數據
 */
export function getRecentDailyStats(days: number = 7): DailyStats[] {
  const stats = getDailyStats()
  const result: DailyStats[] = []

  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]

    result.push(stats[dateKey] || {
      date: dateKey,
      totalSessions: 0,
      averageScore: 0,
      bestScore: 0,
      totalMinutes: 0,
      lessonsCompleted: 0,
      conversationsCompleted: 0,
    })
  }

  return result
}

/**
 * 獲取週統計
 */
export function getWeeklyStats(): WeeklyStats {
  const dailyStats = getRecentDailyStats(7)
  const lastWeekStats = getRecentDailyStats(14).slice(0, 7)

  const currentWeekAvg = calculateAverageScore(dailyStats)
  const lastWeekAvg = calculateAverageScore(lastWeekStats)

  const weekStart = dailyStats[0]?.date || new Date().toISOString().split('T')[0]

  return {
    weekStart,
    dailyStats,
    averageScore: currentWeekAvg,
    totalSessions: dailyStats.reduce((sum, d) => sum + d.totalSessions, 0),
    improvement: currentWeekAvg - lastWeekAvg,
  }
}

/**
 * 計算平均分數
 */
function calculateAverageScore(stats: DailyStats[]): number {
  const validStats = stats.filter(s => s.totalSessions > 0)
  if (validStats.length === 0) return 0

  const totalScore = validStats.reduce((sum, s) => sum + s.averageScore * s.totalSessions, 0)
  const totalSessions = validStats.reduce((sum, s) => sum + s.totalSessions, 0)

  return Math.round(totalScore / totalSessions)
}

/**
 * 獲取特定課程的歷史記錄
 */
export function getLessonHistory(lessonId: string): ScoreRecord[] {
  return getScoreHistory().filter(r => r.lessonId === lessonId)
}

/**
 * 獲取最佳分數
 */
export function getBestScore(lessonId?: string): number {
  const history = lessonId ? getLessonHistory(lessonId) : getScoreHistory()
  if (history.length === 0) return 0
  return Math.max(...history.map(r => r.score))
}

/**
 * 獲取學習連續天數
 */
export function getStreak(): number {
  const stats = getDailyStats()
  const dates = Object.keys(stats).sort().reverse()

  if (dates.length === 0) return 0

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // 檢查今天或昨天是否有學習
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0
  }

  let streak = 1
  let currentDate = new Date(dates[0])

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(currentDate)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevDateStr = prevDate.toISOString().split('T')[0]

    if (dates[i] === prevDateStr) {
      streak++
      currentDate = prevDate
    } else {
      break
    }
  }

  return streak
}

/**
 * 獲取進步趨勢
 * 返回正數表示進步，負數表示退步
 */
export function getProgressTrend(days: number = 7): number {
  const stats = getRecentDailyStats(days * 2)
  const recent = stats.slice(days)
  const previous = stats.slice(0, days)

  const recentAvg = calculateAverageScore(recent)
  const previousAvg = calculateAverageScore(previous)

  return recentAvg - previousAvg
}

/**
 * 清除所有歷史記錄
 */
export function clearHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SCORE_HISTORY_KEY)
  localStorage.removeItem(DAILY_STATS_KEY)
}

export default {
  getScoreHistory,
  addScoreRecord,
  getDailyStats,
  getRecentDailyStats,
  getWeeklyStats,
  getLessonHistory,
  getBestScore,
  getStreak,
  getProgressTrend,
  clearHistory,
}
