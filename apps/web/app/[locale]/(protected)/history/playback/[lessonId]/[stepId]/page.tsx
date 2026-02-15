'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from '@/i18n/navigation'
import { ArrowLeft, Home } from 'lucide-react'
import { AppButton } from '@/components/ui/AppButton'
import { getPlaybackQuestion, type PlaybackAttempt } from '../../../utils/playbackStorage'

// Hooks
import { usePlaybackQuestion } from '../../hooks/usePlaybackQuestion'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'

// Services
import { ScoringService } from '../../services/scoringService'

// Components
import { LoadingScreen } from '../../components/LoadingScreen'
import { ErrorScreen } from '../../components/ErrorScreen'
import { QuestionDisplay } from '../../components/QuestionDisplay'
import { RecordingControls } from '../../components/RecordingControls'
import { ScoreDisplay } from '../../components/ScoreDisplay'

export default function PlaybackQuestionPage() {
  const router = useRouter()
  const params = useParams()
  const lessonId = params.lessonId as string
  const stepId = parseInt(params.stepId as string)

  // 資料載入
  const { question, lessonData, loading, error } = usePlaybackQuestion(lessonId, stepId)
  
  // 錄音控制
  const { 
    isRecording, 
    isPlaying, 
    audioBlob, 
    startRecording, 
    stopRecording, 
    playRecording 
  } = useAudioRecorder()

  // 評分狀態
  const [latestScore, setLatestScore] = useState<PlaybackAttempt | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 載入最後一次評分
  useEffect(() => {
    if (question && question.attempts && question.attempts.length > 0) {
      const lastAttempt = question.attempts[question.attempts.length - 1]
      setLatestScore(lastAttempt)
    }
  }, [question])

  // 錄音完成後自動送出評分
  useEffect(() => {
    if (audioBlob && !isRecording && !isSubmitting && question) {
      handleSubmitScoring()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, isRecording])

  // 送出評分
  const handleSubmitScoring = async () => {
    if (!question || !audioBlob) return
    
    setIsSubmitting(true)

    try {
      const attempt = await ScoringService.submitForScoring({
        audioBlob,
        lessonId,
        stepId,
        expectedAnswer: question.expectedAnswer
      })

      // 更新最新分數
      setLatestScore(attempt)
      
      // 重新載入題目資料以更新最高分
      const updatedQ = getPlaybackQuestion(lessonId, stepId)
      if (updatedQ) {
        // 這裡可以觸發 question 的更新，但因為 usePlaybackQuestion 不支持刷新
        // 所以我們直接更新頁面會在下次進入時看到新的最高分
      }
    } catch (error) {
      console.error('Scoring error:', error)
      alert('評分失敗，請重試')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 處理錄音開始
  const handleStartRecording = async () => {
    await startRecording()
  }

  // 處理錄音停止
  const handleStopRecording = () => {
    stopRecording()
  }

  // Loading 狀態
  if (loading) {
    return <LoadingScreen />
  }

  // 錯誤狀態
  if (!question) {
    return (
      <ErrorScreen
        error={error}
        lessonId={lessonId}
        stepId={stepId}
        onRetry={() => window.location.reload()}
        onBack={() => router.push('/history?tab=playback')}
      />
    )
  }

  // 主畫面
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 🆕 雙按鈕：返回報表 + 返回首頁 */}
        <div className="mb-6 flex gap-4">
          <AppButton
            icon={ArrowLeft}
            onClick={() => router.back()}
            className="max-w-none w-auto"
          >
            Back to Report
          </AppButton>

          <AppButton
            icon={Home}
            onClick={() => router.push('/dashboard')}
            className="max-w-none w-auto"
          >
            Home
          </AppButton>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* 左側：題目和錄音區 */}
          <div className="col-span-2 space-y-6">
            <QuestionDisplay
              questionText={question.questionText}
              pinyin={question.pinyin}
              englishHint={question.englishHint}
              lessonId={lessonId}
              stepId={stepId}
            />

            <RecordingControls
              isRecording={isRecording}
              isPlaying={isPlaying}
              audioBlob={audioBlob}
              isSubmitting={isSubmitting}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onPlayRecording={playRecording}
            />
          </div>

          {/* 右側：分數卡片 */}
          <div className="col-span-1">
            <ScoreDisplay
              question={question}
              latestScore={latestScore}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
