'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Volume2, CheckCircle, Target, Sparkles } from 'lucide-react'
import { SyllableCorrectionCard } from './SyllableCorrectionCard'

interface SyllableError {
  userSyllable: string
  correctSyllable: string
  userPinyin?: string
  correctPinyin?: string
  errorType: 'tone' | 'pronunciation' | 'missing' | 'extra'
}

interface QuestionFeedbackSectionProps {
  questionNumber: number      // 第幾題
  questionText: string        // 題目文字
  userAnswer: string          // 用戶的回答
  correctAnswer: string       // 正確答案
  score: number               // 分數
  totalSyllables: number      // 總音節數
  correctSyllables: number    // 正確音節數
  errors: SyllableError[]     // 錯誤列表
  onPlayCorrect?: (text: string) => void // 播放正確發音
  defaultExpanded?: boolean   // 默認展開
}

// 根據正確率獲取鼓勵語
function getEncouragement(correctRate: number, score: number): { emoji: string; message: string; subMessage: string } {
  if (score >= 95) {
    return {
      emoji: '🌟',
      message: '完美表現！',
      subMessage: '發音非常標準，繼續保持！'
    }
  }
  if (score >= 85) {
    return {
      emoji: '👏',
      message: '做得很好！',
      subMessage: '只有小地方需要注意，再練習一下就完美了！'
    }
  }
  if (score >= 70) {
    return {
      emoji: '💪',
      message: '不錯的嘗試！',
      subMessage: '基礎很好，多練習下面標記的音節會更好！'
    }
  }
  if (score >= 50) {
    return {
      emoji: '🎯',
      message: '繼續加油！',
      subMessage: '重點練習下面標記的音節，你一定可以的！'
    }
  }
  return {
    emoji: '📚',
    message: '別灰心！',
    subMessage: '每個人都是從這裡開始的，多聽多練就會進步！'
  }
}

// 分數顏色
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 bg-green-100'
  if (score >= 70) return 'text-blue-600 bg-blue-100'
  if (score >= 50) return 'text-orange-600 bg-orange-100'
  return 'text-red-600 bg-red-100'
}

export function QuestionFeedbackSection({
  questionNumber,
  questionText,
  userAnswer,
  correctAnswer,
  score,
  totalSyllables,
  correctSyllables,
  errors,
  onPlayCorrect,
  defaultExpanded = false,
}: QuestionFeedbackSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const correctRate = totalSyllables > 0 ? correctSyllables / totalSyllables : 0
  const encouragement = getEncouragement(correctRate, score)
  const hasErrors = errors.length > 0

  const handlePlayCorrect = (text: string) => {
    if (onPlayCorrect) {
      onPlayCorrect(text)
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-TW'
      utterance.rate = 0.8
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* 頭部 - 可點擊展開 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
            {questionNumber}
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-800 line-clamp-1">{questionText}</div>
            <div className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
              <CheckCircle size={14} className="text-green-500" />
              <span>{correctSyllables}/{totalSyllables} 音節正確</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 分數 */}
          <div className={`px-3 py-1.5 rounded-full font-bold ${getScoreColor(score)}`}>
            {score} 分
          </div>

          {/* 展開/收起圖標 */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={20} className="text-gray-400" />
          </motion.div>
        </div>
      </button>

      {/* 展開內容 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-gray-100">
              {/* 鼓勵區塊 */}
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{encouragement.emoji}</span>
                  <div>
                    <div className="font-bold text-gray-800">{encouragement.message}</div>
                    <div className="text-sm text-gray-600 mt-1">{encouragement.subMessage}</div>
                  </div>
                </div>
              </div>

              {/* 答案對比 */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">你的回答</div>
                  <div className="text-gray-700">{userAnswer || '(未回答)'}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    正確答案
                    <button
                      onClick={() => handlePlayCorrect(correctAnswer)}
                      className="ml-1 p-1 rounded-full hover:bg-green-100 transition-colors"
                      title="播放正確發音"
                    >
                      <Volume2 size={14} className="text-green-600" />
                    </button>
                  </div>
                  <div className="text-green-700 font-medium">{correctAnswer}</div>
                </div>
              </div>

              {/* 需要改進的音節 */}
              {hasErrors && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={16} className="text-orange-500" />
                    <span className="font-medium text-gray-700">需要注意的地方</span>
                    <span className="text-xs text-gray-500">({errors.length} 個)</span>
                  </div>

                  <div className="space-y-3">
                    {errors.map((error, index) => (
                      <SyllableCorrectionCard
                        key={index}
                        userSyllable={error.userSyllable}
                        correctSyllable={error.correctSyllable}
                        userPinyin={error.userPinyin}
                        correctPinyin={error.correctPinyin}
                        errorType={error.errorType}
                        onPlayCorrect={() => handlePlayCorrect(error.correctSyllable)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 全對時的特殊顯示 */}
              {!hasErrors && score >= 90 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl flex items-center gap-3">
                  <Sparkles className="text-green-500" size={24} />
                  <div>
                    <div className="font-medium text-green-700">全部正確！</div>
                    <div className="text-sm text-green-600">這題你已經完全掌握了！</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default QuestionFeedbackSection
