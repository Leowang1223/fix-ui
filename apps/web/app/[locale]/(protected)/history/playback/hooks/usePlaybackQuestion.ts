/**
 * Playback Question 資料載入 Hook
 * 負責從 localStorage 和 API 載入題目資料
 */

import { useState, useEffect } from 'react'
import { API_BASE } from '../../../config'
import { 
  getPlaybackQuestion, 
  initializePlaybackFromHistory, 
  type PlaybackQuestion 
} from '../../utils/playbackStorage'

interface UsePlaybackQuestionResult {
  question: PlaybackQuestion | null
  lessonData: any
  loading: boolean
  error: string
}

export function usePlaybackQuestion(lessonId: string, stepId: number): UsePlaybackQuestionResult {
  const [question, setQuestion] = useState<PlaybackQuestion | null>(null)
  const [lessonData, setLessonData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('=== Loading Playback Question ===')
        console.log('Lesson ID:', lessonId)
        console.log('Step ID:', stepId)
        
        // 1. 嘗試從 localStorage 讀取練習記錄
        let q = getPlaybackQuestion(lessonId, stepId)
        console.log('Question from storage (first attempt):', q)
        
        // 2. 如果找不到，嘗試初始化資料
        if (!q) {
          console.log('Question not found, initializing from history...')
          const initialized = initializePlaybackFromHistory()
          console.log('Initialized lessons:', initialized)
          
          // 再次嘗試讀取
          q = getPlaybackQuestion(lessonId, stepId)
          console.log('Question from storage (after init):', q)
        }
        
        // 3. 從 API 載入完整課程資料
        try {
          console.log('Fetching lesson from API...')
          const response = await fetch(`${API_BASE}/api/lessons/${lessonId}`)
          if (response.ok) {
            const lesson = await response.json()
            console.log('Lesson data from API:', lesson)
            setLessonData(lesson)
            
            // 找到對應的 step
            const step = lesson.steps?.find((s: any) => s.id === stepId)
            console.log('Found step:', step)
            
            if (step) {
              // 如果有 localStorage 資料，合併 API 資料
              if (q) {
                setQuestion({
                  ...q,
                  questionText: step.teacher || q.questionText,
                  pinyin: step.pinyin || q.pinyin,
                  englishHint: step.english_hint || q.englishHint,
                  expectedAnswer: step.expected_answer || q.expectedAnswer,
                  videoUrl: step.video_url
                })
              } else {
                // 如果沒有 localStorage 資料，從 API 創建最小結構
                console.log('Creating question from API data...')
                setQuestion({
                  stepId: stepId,
                  questionText: step.teacher || '',
                  pinyin: step.pinyin || '',
                  englishHint: step.english_hint || '',
                  expectedAnswer: step.expected_answer || '',
                  videoUrl: step.video_url,
                  attempts: [],
                  highestScore: 0,
                  lastAttemptDate: new Date().toISOString(),
                  practiceCount: 0
                })
              }
            } else {
              setError(`Step ${stepId} not found in lesson ${lessonId}`)
            }
          } else {
            console.error('API response not OK:', response.status)
            setError('Failed to load lesson data from server')
          }
        } catch (apiError) {
          console.error('Failed to load lesson from API:', apiError)
          setError('Cannot connect to server. Please check if backend is running.')
        }
      } catch (error) {
        console.error('Error loading data:', error)
        setError('An unexpected error occurred')
      } finally {
        console.log('=== Loading Complete ===')
        setLoading(false)
      }
    }

    loadData()
  }, [lessonId, stepId])

  return { question, lessonData, loading, error }
}
