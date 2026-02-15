/**
 * 回放練習資料管理模組
 */

// ==================== 資料結構定義 ====================

export interface PlaybackAttempt {
  attemptId: string
  timestamp: string
  audioBase64?: string  // 使用 Base64 儲存最後一次錄音
  score: number
  detailedScores: {
    pronunciation: number
    fluency: number
    accuracy: number
    comprehension: number
    confidence: number
  }
  suggestions?: {
    pronunciation?: string
    fluency?: string
    accuracy?: string
    comprehension?: string
    confidence?: string
  }
  overallPractice?: string
  transcript?: string
}

export interface PlaybackQuestion {
  stepId: number
  questionText: string
  pinyin?: string
  englishHint: string
  expectedAnswer: string | string[]
  videoUrl?: string
  
  // 練習記錄
  attempts: PlaybackAttempt[]
  highestScore: number
  lastAttemptDate: string
  practiceCount: number
}

export interface PlaybackLesson {
  lessonId: string
  lessonTitle: string
  questions: PlaybackQuestion[]
  averageScore: number
  completedDate: string
  totalPracticeCount: number
}

// ==================== localStorage 鍵值 ====================

const PLAYBACK_STORAGE_KEY = 'playbackPractice'
const LESSON_HISTORY_KEY = 'lessonHistory'

// ==================== 資料讀取 ====================

/**
 * 從 localStorage 讀取回放練習資料
 */
export function getPlaybackData(): PlaybackLesson[] {
  try {
    const data = localStorage.getItem(PLAYBACK_STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load playback data:', error)
    return []
  }
}

/**
 * 儲存回放練習資料到 localStorage
 */
export function savePlaybackData(data: PlaybackLesson[]): void {
  try {
    localStorage.setItem(PLAYBACK_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save playback data:', error)
  }
}

/**
 * 從學習歷史初始化回放練習資料
 */
export function initializePlaybackFromHistory(): PlaybackLesson[] {
  try {
    const historyData = localStorage.getItem(LESSON_HISTORY_KEY)
    if (!historyData) return []

    const history = JSON.parse(historyData)
    const playbackLessons: PlaybackLesson[] = []

    // 將學習歷史轉換為回放練習格式
    history.forEach((session: any) => {
      // 檢查是否已存在該課程
      let lesson = playbackLessons.find(l => l.lessonId === session.lessonId)
      
      if (!lesson) {
        lesson = {
          lessonId: session.lessonId,
          lessonTitle: session.lessonTitle,
          questions: [],
          averageScore: session.totalScore || 0,
          completedDate: session.completedAt,
          totalPracticeCount: 0
        }
        playbackLessons.push(lesson)
      }

      // 添加題目
      if (session.results && Array.isArray(session.results)) {
        session.results.forEach((result: any) => {
          // 檢查題目是否已存在
          let question = lesson!.questions.find(q => q.stepId === result.stepId)
          
          if (!question) {
            question = {
              stepId: result.stepId,
              questionText: result.question,
              englishHint: result.englishHint || '',
              expectedAnswer: result.expectedAnswer || '',
              attempts: [],
              highestScore: result.score || 0,
              lastAttemptDate: session.completedAt,
              practiceCount: 0
            }
            lesson!.questions.push(question)
          } else {
            // 更新最高分數
            if (result.score > question.highestScore) {
              question.highestScore = result.score
            }
            // 更新最後練習日期
            if (new Date(session.completedAt) > new Date(question.lastAttemptDate)) {
              question.lastAttemptDate = session.completedAt
            }
          }

          // 添加練習記錄
          const attempt: PlaybackAttempt = {
            attemptId: `${session.sessionId}-${result.stepId}`,
            timestamp: session.completedAt,
            score: result.score || 0,
            detailedScores: result.detailedScores || {
              pronunciation: result.score || 0,
              fluency: result.score || 0,
              accuracy: result.score || 0,
              comprehension: result.score || 0,
              confidence: result.score || 0
            },
            suggestions: result.suggestions,
            overallPractice: result.overallPractice,
            transcript: result.transcript
          }
          question.attempts.push(attempt)
          question.practiceCount++
          lesson!.totalPracticeCount++
        })
      }
    })

    // 排序題目（按 stepId）
    playbackLessons.forEach(lesson => {
      lesson.questions.sort((a, b) => a.stepId - b.stepId)
    })

    // 排序課程（按完成日期）
    playbackLessons.sort((a, b) => 
      new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
    )

    return playbackLessons
  } catch (error) {
    console.error('Failed to initialize playback data:', error)
    return []
  }
}

/**
 * 獲取單個課程的回放資料
 */
export function getPlaybackLesson(lessonId: string): PlaybackLesson | null {
  const data = getPlaybackData()
  return data.find(l => l.lessonId === lessonId) || null
}

/**
 * 獲取單個題目的回放資料
 */
export function getPlaybackQuestion(lessonId: string, stepId: number): PlaybackQuestion | null {
  const lesson = getPlaybackLesson(lessonId)
  if (!lesson) return null
  return lesson.questions.find(q => q.stepId === stepId) || null
}

// ==================== 資料更新 ====================

/**
 * 添加新的練習記錄
 */
export function addPlaybackAttempt(
  lessonId: string,
  stepId: number,
  attempt: PlaybackAttempt
): void {
  let data = getPlaybackData()
  
  // 如果還沒有資料，從歷史初始化
  if (data.length === 0) {
    data = initializePlaybackFromHistory()
  }

  let lesson = data.find(l => l.lessonId === lessonId)
  if (!lesson) {
    console.error(`Lesson ${lessonId} not found`)
    return
  }

  let question = lesson.questions.find(q => q.stepId === stepId)
  if (!question) {
    console.error(`Question ${stepId} not found in lesson ${lessonId}`)
    return
  }

  // 添加練習記錄
  question.attempts.push(attempt)
  question.practiceCount++
  question.lastAttemptDate = attempt.timestamp
  lesson.totalPracticeCount++

  // 更新最高分數
  if (attempt.score > question.highestScore) {
    question.highestScore = attempt.score
  }

  // 重新計算課程平均分
  const totalScore = lesson.questions.reduce((sum, q) => sum + q.highestScore, 0)
  lesson.averageScore = Math.round(totalScore / lesson.questions.length)

  savePlaybackData(data)
}

/**
 * 清除所有回放練習資料
 */
export function clearPlaybackData(): void {
  localStorage.removeItem(PLAYBACK_STORAGE_KEY)
}

/**
 * 刪除特定課程的回放資料
 */
export function deletePlaybackLesson(lessonId: string): void {
  const data = getPlaybackData()
  const filtered = data.filter(l => l.lessonId !== lessonId)
  savePlaybackData(filtered)
}
