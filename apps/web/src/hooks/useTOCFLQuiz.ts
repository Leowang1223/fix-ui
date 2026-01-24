'use client'

import { useState, useCallback } from 'react'

export type TOCFLLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type QuestionType = 'listening' | 'reading' | 'vocabulary' | 'grammar'

export interface TOCFLQuestion {
  id: string
  level: TOCFLLevel
  type: QuestionType
  category: string
  question: {
    text?: string
    textZh?: string
    audio?: string
    image?: string
  }
  options: {
    text: string
    textZh?: string
  }[]
  correctAnswer: number
  explanation?: string
  explanationZh?: string
  relatedVocab?: string[]
}

export interface QuizResult {
  questionId: string
  selectedAnswer: number
  isCorrect: boolean
  timeSpent: number
}

export interface QuizSession {
  id: string
  level: TOCFLLevel
  type: QuestionType | 'mixed'
  questions: TOCFLQuestion[]
  results: QuizResult[]
  currentIndex: number
  startTime: string
  endTime?: string
  score?: number
}

export interface QuizStats {
  totalQuestions: number
  correctAnswers: number
  accuracy: number
  averageTime: number
  byLevel: Record<TOCFLLevel, { total: number; correct: number }>
  byType: Record<QuestionType, { total: number; correct: number }>
}

// Sample questions (in production, these would come from an API)
const SAMPLE_QUESTIONS: TOCFLQuestion[] = [
  // A1 Level - Basic
  {
    id: 'A1-V-001',
    level: 'A1',
    type: 'vocabulary',
    category: 'Greetings',
    question: {
      text: 'What does "你好" mean?',
      textZh: '「你好」是什麼意思？'
    },
    options: [
      { text: 'Goodbye', textZh: '再見' },
      { text: 'Hello', textZh: '你好' },
      { text: 'Thank you', textZh: '謝謝' },
      { text: 'Sorry', textZh: '對不起' }
    ],
    correctAnswer: 1,
    explanation: '"你好" (nǐ hǎo) is the most common Chinese greeting, meaning "Hello".',
    explanationZh: '「你好」是最常見的中文問候語。',
    relatedVocab: ['你好', '您好', '嗨']
  },
  {
    id: 'A1-V-002',
    level: 'A1',
    type: 'vocabulary',
    category: 'Numbers',
    question: {
      text: 'How do you say "five" in Chinese?',
      textZh: '「五」用中文怎麼說？'
    },
    options: [
      { text: '三 (sān)', textZh: '三' },
      { text: '四 (sì)', textZh: '四' },
      { text: '五 (wǔ)', textZh: '五' },
      { text: '六 (liù)', textZh: '六' }
    ],
    correctAnswer: 2,
    explanation: '"五" (wǔ) means "five" in Chinese.',
    explanationZh: '「五」的發音是 wǔ。'
  },
  {
    id: 'A1-G-001',
    level: 'A1',
    type: 'grammar',
    category: 'Basic Sentence',
    question: {
      text: 'Choose the correct sentence: "I am a student."',
      textZh: '選擇正確的句子：「我是學生」'
    },
    options: [
      { text: '我是學生。', textZh: '我是學生。' },
      { text: '我學生是。', textZh: '我學生是。' },
      { text: '學生是我。', textZh: '學生是我。' },
      { text: '是我學生。', textZh: '是我學生。' }
    ],
    correctAnswer: 0,
    explanation: 'Chinese follows Subject + Verb + Object order: 我(I) + 是(am) + 學生(student)',
    explanationZh: '中文的基本句型是「主詞 + 動詞 + 受詞」。'
  },
  {
    id: 'A1-V-003',
    level: 'A1',
    type: 'vocabulary',
    category: 'Food',
    question: {
      text: 'What does "水" mean?',
      textZh: '「水」是什麼意思？'
    },
    options: [
      { text: 'Rice', textZh: '飯' },
      { text: 'Tea', textZh: '茶' },
      { text: 'Water', textZh: '水' },
      { text: 'Juice', textZh: '果汁' }
    ],
    correctAnswer: 2,
    explanation: '"水" (shuǐ) means "water" in Chinese.',
    explanationZh: '「水」的發音是 shuǐ。'
  },
  // A2 Level - Elementary
  {
    id: 'A2-V-001',
    level: 'A2',
    type: 'vocabulary',
    category: 'Time',
    question: {
      text: 'What time is "下午三點"?',
      textZh: '「下午三點」是幾點？'
    },
    options: [
      { text: '3:00 AM', textZh: '凌晨三點' },
      { text: '3:00 PM', textZh: '下午三點' },
      { text: '5:00 PM', textZh: '下午五點' },
      { text: '8:00 PM', textZh: '晚上八點' }
    ],
    correctAnswer: 1,
    explanation: '"下午" means afternoon/PM, "三點" means 3 o\'clock.',
    explanationZh: '「下午」指的是中午之後，「三點」是3:00。'
  },
  {
    id: 'A2-G-001',
    level: 'A2',
    type: 'grammar',
    category: 'Questions',
    question: {
      text: 'How do you ask "Where are you going?" in Chinese?',
      textZh: '「你要去哪裡？」怎麼說？'
    },
    options: [
      { text: '你去哪裡？', textZh: '你去哪裡？' },
      { text: '哪裡你去？', textZh: '哪裡你去？' },
      { text: '去你哪裡？', textZh: '去你哪裡？' },
      { text: '你哪裡去？', textZh: '你哪裡去？' }
    ],
    correctAnswer: 0,
    explanation: 'The question word "哪裡" (where) comes at the end in Chinese questions.',
    explanationZh: '疑問詞「哪裡」放在句尾。'
  },
  {
    id: 'A2-R-001',
    level: 'A2',
    type: 'reading',
    category: 'Signs',
    question: {
      text: 'What does this sign mean: "出口"?',
      textZh: '這個標誌「出口」是什麼意思？'
    },
    options: [
      { text: 'Entrance', textZh: '入口' },
      { text: 'Exit', textZh: '出口' },
      { text: 'Toilet', textZh: '廁所' },
      { text: 'Information', textZh: '服務台' }
    ],
    correctAnswer: 1,
    explanation: '"出口" means "Exit". "出" = out, "口" = opening/mouth.',
    explanationZh: '「出口」指離開的通道。「出」= 出去，「口」= 開口。'
  },
  // B1 Level - Intermediate
  {
    id: 'B1-G-001',
    level: 'B1',
    type: 'grammar',
    category: 'Aspect Markers',
    question: {
      text: 'Choose the correct sentence: "I have eaten."',
      textZh: '選擇正確的句子：「我已經吃了。」'
    },
    options: [
      { text: '我吃了。', textZh: '我吃了。' },
      { text: '我吃過。', textZh: '我吃過。' },
      { text: '我在吃。', textZh: '我在吃。' },
      { text: '我要吃。', textZh: '我要吃。' }
    ],
    correctAnswer: 0,
    explanation: '"了" indicates completed action. "我吃了" = I have eaten/I ate.',
    explanationZh: '「了」表示動作已完成。'
  },
  {
    id: 'B1-V-001',
    level: 'B1',
    type: 'vocabulary',
    category: 'Work',
    question: {
      text: 'What does "加班" mean?',
      textZh: '「加班」是什麼意思？'
    },
    options: [
      { text: 'Take a break', textZh: '休息' },
      { text: 'Work overtime', textZh: '加班' },
      { text: 'Get promoted', textZh: '升職' },
      { text: 'Quit job', textZh: '辭職' }
    ],
    correctAnswer: 1,
    explanation: '"加班" (jiā bān) means to work overtime or work extra hours.',
    explanationZh: '「加班」指在正常工作時間之外繼續工作。'
  },
  {
    id: 'B1-R-001',
    level: 'B1',
    type: 'reading',
    category: 'Conversation',
    question: {
      text: 'A: 你週末有空嗎？\nB: ______\nWhat is the best response?',
      textZh: 'A: 你週末有空嗎？\nB: ______\n最好的回答是什麼？'
    },
    options: [
      { text: '我很忙。', textZh: '我很忙。' },
      { text: '有空，怎麼了？', textZh: '有空，怎麼了？' },
      { text: '週末好。', textZh: '週末好。' },
      { text: '謝謝你。', textZh: '謝謝你。' }
    ],
    correctAnswer: 1,
    explanation: '"有空，怎麼了？" is a natural response asking what\'s up after confirming availability.',
    explanationZh: '先確認有空，再詢問原因是自然的回應方式。'
  }
]

const STORAGE_KEY = 'tocflQuizHistory'

function loadQuizHistory(): QuizSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveQuizHistory(sessions: QuizSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function useTOCFLQuiz() {
  const [currentSession, setCurrentSession] = useState<QuizSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Start a new quiz
  const startQuiz = useCallback((options: {
    level?: TOCFLLevel
    type?: QuestionType | 'mixed'
    count?: number
  } = {}) => {
    const { level, type = 'mixed', count = 5 } = options

    // Filter questions
    let filtered = [...SAMPLE_QUESTIONS]

    if (level) {
      filtered = filtered.filter(q => q.level === level)
    }

    if (type !== 'mixed') {
      filtered = filtered.filter(q => q.type === type)
    }

    // Shuffle and pick
    const shuffled = filtered.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(count, shuffled.length))

    const session: QuizSession = {
      id: `quiz-${Date.now()}`,
      level: level || 'A1',
      type,
      questions: selected,
      results: [],
      currentIndex: 0,
      startTime: new Date().toISOString()
    }

    setCurrentSession(session)
    return session
  }, [])

  // Submit answer
  const submitAnswer = useCallback((answer: number, timeSpent: number) => {
    if (!currentSession) return null

    const currentQuestion = currentSession.questions[currentSession.currentIndex]
    const isCorrect = answer === currentQuestion.correctAnswer

    const result: QuizResult = {
      questionId: currentQuestion.id,
      selectedAnswer: answer,
      isCorrect,
      timeSpent
    }

    const updatedResults = [...currentSession.results, result]
    const nextIndex = currentSession.currentIndex + 1
    const isComplete = nextIndex >= currentSession.questions.length

    const updatedSession: QuizSession = {
      ...currentSession,
      results: updatedResults,
      currentIndex: nextIndex,
      ...(isComplete && {
        endTime: new Date().toISOString(),
        score: Math.round((updatedResults.filter(r => r.isCorrect).length / updatedResults.length) * 100)
      })
    }

    setCurrentSession(updatedSession)

    // Save to history if complete
    if (isComplete) {
      const history = loadQuizHistory()
      history.unshift(updatedSession)
      saveQuizHistory(history.slice(0, 50)) // Keep last 50 sessions
    }

    return { isCorrect, isComplete, score: updatedSession.score }
  }, [currentSession])

  // Get current question
  const getCurrentQuestion = useCallback((): TOCFLQuestion | null => {
    if (!currentSession) return null
    return currentSession.questions[currentSession.currentIndex] || null
  }, [currentSession])

  // End quiz early
  const endQuiz = useCallback(() => {
    if (!currentSession) return

    const updatedSession: QuizSession = {
      ...currentSession,
      endTime: new Date().toISOString(),
      score: currentSession.results.length > 0
        ? Math.round((currentSession.results.filter(r => r.isCorrect).length / currentSession.results.length) * 100)
        : 0
    }

    const history = loadQuizHistory()
    history.unshift(updatedSession)
    saveQuizHistory(history.slice(0, 50))

    setCurrentSession(null)
  }, [currentSession])

  // Get quiz stats
  const getStats = useCallback((): QuizStats => {
    const history = loadQuizHistory()
    const allResults = history.flatMap(s => s.results)

    if (allResults.length === 0) {
      return {
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageTime: 0,
        byLevel: {
          A1: { total: 0, correct: 0 },
          A2: { total: 0, correct: 0 },
          B1: { total: 0, correct: 0 },
          B2: { total: 0, correct: 0 },
          C1: { total: 0, correct: 0 },
          C2: { total: 0, correct: 0 }
        },
        byType: {
          listening: { total: 0, correct: 0 },
          reading: { total: 0, correct: 0 },
          vocabulary: { total: 0, correct: 0 },
          grammar: { total: 0, correct: 0 }
        }
      }
    }

    const totalQuestions = allResults.length
    const correctAnswers = allResults.filter(r => r.isCorrect).length
    const averageTime = allResults.reduce((sum, r) => sum + r.timeSpent, 0) / totalQuestions

    // Calculate by level and type
    const byLevel: QuizStats['byLevel'] = {
      A1: { total: 0, correct: 0 },
      A2: { total: 0, correct: 0 },
      B1: { total: 0, correct: 0 },
      B2: { total: 0, correct: 0 },
      C1: { total: 0, correct: 0 },
      C2: { total: 0, correct: 0 }
    }

    const byType: QuizStats['byType'] = {
      listening: { total: 0, correct: 0 },
      reading: { total: 0, correct: 0 },
      vocabulary: { total: 0, correct: 0 },
      grammar: { total: 0, correct: 0 }
    }

    history.forEach(session => {
      session.results.forEach((result, index) => {
        const question = session.questions[index]
        if (question) {
          byLevel[question.level].total++
          if (result.isCorrect) byLevel[question.level].correct++

          byType[question.type].total++
          if (result.isCorrect) byType[question.type].correct++
        }
      })
    })

    return {
      totalQuestions,
      correctAnswers,
      accuracy: Math.round((correctAnswers / totalQuestions) * 100),
      averageTime: Math.round(averageTime),
      byLevel,
      byType
    }
  }, [])

  return {
    currentSession,
    isLoading,
    startQuiz,
    submitAnswer,
    getCurrentQuestion,
    endQuiz,
    getStats,
    SAMPLE_QUESTIONS
  }
}
