/**
 * 題目顯示組件
 * 顯示題目內容、拼音、英文提示和 TTS 播放按鈕
 */

import { TTSService } from '../services/ttsService'
import { AppButton } from '@/components/ui/AppButton'
import { Volume2 } from 'lucide-react'

interface QuestionDisplayProps {
  questionText: string
  pinyin?: string
  englishHint?: string
  lessonId: string
  stepId: number
}

export function QuestionDisplay({
  questionText,
  pinyin,
  englishHint,
  lessonId,
  stepId
}: QuestionDisplayProps) {
  // 🔍 調試日誌：確認題目載入
  console.log('📋 QuestionDisplay 載入:', {
    lessonId,
    stepId,
    questionText,
    pinyin,
    englishHint,
    hasQuestion: !!questionText
  })

  const handlePlayTTS = () => {
    console.log('🔊 播放 TTS:', questionText)
    TTSService.playText(questionText)
  }

  // 🔍 檢查題目是否為空
  if (!questionText) {
    console.error('❌ 題目文字為空！', { lessonId, stepId })
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
        <h3 className="font-bold mb-2">⚠️ 題目載入失敗</h3>
        <p>題目文字為空，請檢查資料是否正確</p>
        <pre className="mt-2 text-xs">{JSON.stringify({ lessonId, stepId }, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 課程資訊卡片 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          {lessonId}: Question {stepId}
        </h1>
        <p className="text-blue-100">Practice Mode - Take your time!</p>
      </div>

      {/* 題目顯示卡片 */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          {questionText}
        </h2>

        {pinyin && (
          <p className="text-xl text-gray-600 text-center mb-2">
            {pinyin}
          </p>
        )}

        {englishHint && (
          <p className="text-lg text-blue-600 text-center mb-6">
            💡 {englishHint}
          </p>
        )}

        {/* TTS 播放按鈕 - 使用 AppButton */}
        <div className="flex justify-center">
          <AppButton
            icon={Volume2}
            onClick={handlePlayTTS}
            className="max-w-none w-auto px-8 py-4"
          >
            Listen to Question
          </AppButton>
        </div>
      </div>
    </div>
  )
}
