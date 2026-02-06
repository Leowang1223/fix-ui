/**
 * 智能課程推薦系統
 * 基於學習歷史和表現生成個性化推薦
 */

import { getScoreHistory, getLessonHistory, getWeeklyStats, ScoreRecord } from './scoreHistory'

export type RecommendationType =
  | 'continue'      // 繼續上次課程
  | 'review'        // 複習需要加強的課程
  | 'new'           // 嘗試新課程
  | 'challenge'     // 挑戰更難的內容
  | 'practice'      // 練習特定技能

export interface Recommendation {
  id: string
  type: RecommendationType
  lessonId: string
  lessonTitle: string
  reason: string          // 推薦原因
  priority: number        // 優先級 (1-10)
  confidence: number      // 推薦信心度 (0-100)
  metrics?: {
    lastScore?: number
    bestScore?: number
    attempts?: number
    lastAttempt?: number  // timestamp
    averageScore?: number
  }
  icon: string           // 圖標名稱
  color: string          // 主題顏色
}

export interface LessonInfo {
  id: string
  title: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  totalQuestions: number
}

// 課程資料（實際應從 API 獲取）
const LESSON_DATA: LessonInfo[] = [
  { id: 'L1', title: '基礎問候', difficulty: 'beginner', category: '日常對話', totalQuestions: 5 },
  { id: 'L2', title: '自我介紹', difficulty: 'beginner', category: '日常對話', totalQuestions: 6 },
  { id: 'L3', title: '數字與時間', difficulty: 'beginner', category: '基礎詞彙', totalQuestions: 8 },
  { id: 'L4', title: '購物對話', difficulty: 'intermediate', category: '情境對話', totalQuestions: 7 },
  { id: 'L5', title: '餐廳點餐', difficulty: 'intermediate', category: '情境對話', totalQuestions: 6 },
  { id: 'L6', title: '問路指引', difficulty: 'intermediate', category: '情境對話', totalQuestions: 5 },
  { id: 'L7', title: '職場對話', difficulty: 'intermediate', category: '商務中文', totalQuestions: 8 },
  { id: 'L8', title: '電話溝通', difficulty: 'intermediate', category: '商務中文', totalQuestions: 6 },
  { id: 'L9', title: '會議討論', difficulty: 'advanced', category: '商務中文', totalQuestions: 7 },
  { id: 'L10', title: '面試技巧', difficulty: 'advanced', category: '商務中文', totalQuestions: 10 },
]

/**
 * 生成推薦列表
 */
export function getRecommendations(maxCount: number = 5): Recommendation[] {
  const recommendations: Recommendation[] = []
  const history = getScoreHistory()
  const weeklyStats = getWeeklyStats()

  // 1. 繼續學習推薦
  const continueRec = getContinueRecommendation(history)
  if (continueRec) recommendations.push(continueRec)

  // 2. 複習推薦
  const reviewRecs = getReviewRecommendations(history)
  recommendations.push(...reviewRecs)

  // 3. 新課程推薦
  const newRecs = getNewLessonRecommendations(history)
  recommendations.push(...newRecs)

  // 4. 挑戰推薦
  const challengeRec = getChallengeRecommendation(history, weeklyStats.averageScore)
  if (challengeRec) recommendations.push(challengeRec)

  // 排序並限制數量
  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxCount)
}

/**
 * 獲取「繼續學習」推薦
 */
function getContinueRecommendation(history: ScoreRecord[]): Recommendation | null {
  if (history.length === 0) return null

  const lastRecord = history[0]
  const lessonHistory = getLessonHistory(lastRecord.lessonId)
  const lessonInfo = LESSON_DATA.find(l => l.id === lastRecord.lessonId)

  if (!lessonInfo) return null

  // 如果最後一次練習是今天，且分數不高，建議繼續
  const isToday = new Date(lastRecord.timestamp).toDateString() === new Date().toDateString()
  const needsPractice = lastRecord.score < 85

  if (isToday && needsPractice) {
    return {
      id: `continue-${lastRecord.lessonId}`,
      type: 'continue',
      lessonId: lastRecord.lessonId,
      lessonTitle: lessonInfo.title,
      reason: '繼續完成今天的練習，保持學習動力！',
      priority: 10,
      confidence: 95,
      metrics: {
        lastScore: lastRecord.score,
        attempts: lessonHistory.length,
        lastAttempt: lastRecord.timestamp,
      },
      icon: 'play-circle',
      color: 'blue',
    }
  }

  return null
}

/**
 * 獲取「複習」推薦
 */
function getReviewRecommendations(history: ScoreRecord[]): Recommendation[] {
  const recommendations: Recommendation[] = []
  const lessonScores: Record<string, { scores: number[], lastAttempt: number }> = {}

  // 統計每個課程的分數
  history.forEach(record => {
    if (!lessonScores[record.lessonId]) {
      lessonScores[record.lessonId] = { scores: [], lastAttempt: record.timestamp }
    }
    lessonScores[record.lessonId].scores.push(record.score)
    lessonScores[record.lessonId].lastAttempt = Math.max(
      lessonScores[record.lessonId].lastAttempt,
      record.timestamp
    )
  })

  // 找出需要複習的課程
  Object.entries(lessonScores).forEach(([lessonId, data]) => {
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length
    const daysSinceLastAttempt = (Date.now() - data.lastAttempt) / (1000 * 60 * 60 * 24)
    const lessonInfo = LESSON_DATA.find(l => l.id === lessonId)

    if (!lessonInfo) return

    // 條件：平均分數低於 75，或超過 7 天未練習
    if (avgScore < 75 || (avgScore < 90 && daysSinceLastAttempt > 7)) {
      const priority = avgScore < 60 ? 8 : avgScore < 75 ? 7 : 5
      const reason = avgScore < 60
        ? '這個課程需要加強練習'
        : daysSinceLastAttempt > 7
          ? `已經 ${Math.floor(daysSinceLastAttempt)} 天沒練習了，來複習一下吧`
          : '再多練習幾次會更熟練'

      recommendations.push({
        id: `review-${lessonId}`,
        type: 'review',
        lessonId,
        lessonTitle: lessonInfo.title,
        reason,
        priority,
        confidence: 80,
        metrics: {
          averageScore: Math.round(avgScore),
          bestScore: Math.max(...data.scores),
          attempts: data.scores.length,
          lastAttempt: data.lastAttempt,
        },
        icon: 'refresh-cw',
        color: 'orange',
      })
    }
  })

  return recommendations.slice(0, 2) // 最多返回 2 個複習推薦
}

/**
 * 獲取「新課程」推薦
 */
function getNewLessonRecommendations(history: ScoreRecord[]): Recommendation[] {
  const completedLessons = new Set(history.map(r => r.lessonId))
  const recommendations: Recommendation[] = []

  // 找出未完成的課程
  const uncompletedLessons = LESSON_DATA.filter(l => !completedLessons.has(l.id))

  if (uncompletedLessons.length === 0) return []

  // 按難度排序，優先推薦適合的難度
  const avgScore = history.length > 0
    ? history.reduce((sum, r) => sum + r.score, 0) / history.length
    : 0

  // 根據平均分數決定推薦難度
  let recommendedDifficulty: 'beginner' | 'intermediate' | 'advanced'
  if (avgScore < 70 || history.length < 5) {
    recommendedDifficulty = 'beginner'
  } else if (avgScore < 85) {
    recommendedDifficulty = 'intermediate'
  } else {
    recommendedDifficulty = 'advanced'
  }

  // 按推薦難度排序
  const sortedLessons = uncompletedLessons.sort((a, b) => {
    const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 }
    const targetOrder = difficultyOrder[recommendedDifficulty]
    const aDiff = Math.abs(difficultyOrder[a.difficulty] - targetOrder)
    const bDiff = Math.abs(difficultyOrder[b.difficulty] - targetOrder)
    return aDiff - bDiff
  })

  // 取前 2 個
  sortedLessons.slice(0, 2).forEach((lesson, index) => {
    const difficultyLabel = {
      beginner: '入門',
      intermediate: '進階',
      advanced: '高級',
    }[lesson.difficulty]

    recommendations.push({
      id: `new-${lesson.id}`,
      type: 'new',
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      reason: `嘗試${difficultyLabel}課程：${lesson.category}`,
      priority: 6 - index,
      confidence: 75,
      metrics: {
        attempts: 0,
      },
      icon: 'book-open',
      color: 'green',
    })
  })

  return recommendations
}

/**
 * 獲取「挑戰」推薦
 */
function getChallengeRecommendation(
  history: ScoreRecord[],
  weeklyAvgScore: number
): Recommendation | null {
  if (history.length < 10 || weeklyAvgScore < 80) return null

  // 找出已完成且分數高的課程的下一級課程
  const highScoreLessons = history
    .filter(r => r.score >= 90)
    .map(r => r.lessonId)

  const completedDifficulties = new Set(
    highScoreLessons.map(id => LESSON_DATA.find(l => l.id === id)?.difficulty)
  )

  // 如果完成了 beginner，推薦 intermediate；完成了 intermediate，推薦 advanced
  let targetDifficulty: 'intermediate' | 'advanced' | null = null
  if (completedDifficulties.has('beginner') && !completedDifficulties.has('intermediate')) {
    targetDifficulty = 'intermediate'
  } else if (completedDifficulties.has('intermediate') && !completedDifficulties.has('advanced')) {
    targetDifficulty = 'advanced'
  }

  if (!targetDifficulty) return null

  const challengeLesson = LESSON_DATA.find(
    l => l.difficulty === targetDifficulty && !highScoreLessons.includes(l.id)
  )

  if (!challengeLesson) return null

  return {
    id: `challenge-${challengeLesson.id}`,
    type: 'challenge',
    lessonId: challengeLesson.id,
    lessonTitle: challengeLesson.title,
    reason: '你已經準備好挑戰更高難度的內容了！',
    priority: 7,
    confidence: 85,
    metrics: {},
    icon: 'zap',
    color: 'purple',
  }
}

/**
 * 獲取單一最優推薦
 */
export function getTopRecommendation(): Recommendation | null {
  const recommendations = getRecommendations(1)

  if (recommendations.length > 0) {
    return recommendations[0]
  }

  // Default: recommend first uncompleted lesson
  const history = getScoreHistory()
  const completedLessons = new Set(history.map(r => r.lessonId))
  const nextLesson = LESSON_DATA.find(l => !completedLessons.has(l.id))

  if (nextLesson) {
    return {
      id: `new-${nextLesson.id}`,
      type: 'new',
      lessonId: nextLesson.id,
      lessonTitle: nextLesson.title,
      reason: completedLessons.size === 0
        ? 'Start your Chinese learning journey!'
        : 'Continue to the next lesson',
      priority: 10,
      confidence: 100,
      icon: 'book-open',
      color: 'green',
    }
  }

  // All lessons completed - recommend first lesson for review
  return {
    id: 'review-L1',
    type: 'review',
    lessonId: 'L1',
    lessonTitle: LESSON_DATA[0].title,
    reason: 'Review your first lesson to stay sharp!',
    priority: 5,
    confidence: 80,
    icon: 'refresh-cw',
    color: 'orange',
  }
}

/**
 * 根據時間段獲取推薦
 */
export function getTimeBasedRecommendation(): Recommendation | null {
  const hour = new Date().getHours()
  const recommendations = getRecommendations(5)

  if (recommendations.length === 0) {
    // 如果沒有推薦，返回第一個課程
    return {
      id: 'default-L1',
      type: 'new',
      lessonId: 'L1',
      lessonTitle: '基礎問候',
      reason: '從這裡開始你的中文學習之旅！',
      priority: 5,
      confidence: 100,
      icon: 'book-open',
      color: 'blue',
    }
  }

  // 早上推薦新課程，下午推薦複習，晚上推薦挑戰
  if (hour >= 6 && hour < 12) {
    return recommendations.find(r => r.type === 'new') || recommendations[0]
  } else if (hour >= 12 && hour < 18) {
    return recommendations.find(r => r.type === 'review') || recommendations[0]
  } else {
    return recommendations.find(r => r.type === 'challenge' || r.type === 'continue') || recommendations[0]
  }
}

export default {
  getRecommendations,
  getTopRecommendation,
  getTimeBasedRecommendation,
}
