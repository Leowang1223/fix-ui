/**
 * 即時反饋彈窗組件
 * 顯示錄音評分結果、逐字分析、音頻播放
 */

'use client'

import { useEffect, useState } from 'react'

interface DetailedScores {
  pronunciation: number
  fluency: number
  accuracy: number
  comprehension: number
  confidence: number
}

interface Suggestions {
  pronunciation?: string
  fluency?: string
  accuracy?: string
  comprehension?: string
  confidence?: string
}

interface CharacterAnalysis {
  char: string
  pinyin?: string
  status: 'correct' | 'wrong' | 'tone-error'
  message?: string
}

interface FeedbackModalProps {
  isOpen: boolean
  score: number
  detailedScores: DetailedScores
  userTranscript: string
  expectedAnswer: string
  expectedPinyin?: string
  suggestions: Suggestions
  overallPractice?: string
  audioBlob: Blob | null
  onRetry: () => void
  onNext: () => void
}

export function FeedbackModal({
  isOpen,
  score,
  detailedScores,
  userTranscript,
  expectedAnswer,
  expectedPinyin,
  suggestions,
  overallPractice,
  audioBlob,
  onRetry,
  onNext
}: FeedbackModalProps) {
  const [isPlayingUser, setIsPlayingUser] = useState(false)
  const [isPlayingCorrect, setIsPlayingCorrect] = useState(false)
  const [characterAnalysis, setCharacterAnalysis] = useState<CharacterAnalysis[]>([])

  // 分析逐字差異
  useEffect(() => {
    if (!isOpen) return

    const analysis: CharacterAnalysis[] = []
    const userChars = userTranscript.trim().split('')
    const expectedChars = expectedAnswer.trim().split('')

    expectedChars.forEach((expectedChar, index) => {
      const userChar = userChars[index]
      
      if (!userChar) {
        analysis.push({
          char: expectedChar,
          status: 'wrong',
          message: 'Missing'
        })
      } else if (userChar === expectedChar) {
        analysis.push({
          char: userChar,
          status: 'correct',
          message: 'Correct'
        })
      } else {
        analysis.push({
          char: userChar,
          status: 'wrong',
          message: `Should be "${expectedChar}"`
        })
      }
    })

    setCharacterAnalysis(analysis)
  }, [isOpen, userTranscript, expectedAnswer])

  // 播放使用者錄音
  const playUserRecording = () => {
    if (!audioBlob || isPlayingUser) return
    
    const audio = new Audio(URL.createObjectURL(audioBlob))
    setIsPlayingUser(true)
    
    audio.onended = () => setIsPlayingUser(false)
    audio.onerror = () => setIsPlayingUser(false)
    
    audio.play().catch(err => {
      console.error('Failed to play user recording:', err)
      setIsPlayingUser(false)
    })
  }

  // 播放正確答案 TTS
  const playCorrectAnswer = () => {
    if (isPlayingCorrect) {
      window.speechSynthesis.cancel()
      setIsPlayingCorrect(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(expectedAnswer)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8
    utterance.pitch = 1.0
    
    utterance.onstart = () => setIsPlayingCorrect(true)
    utterance.onend = () => setIsPlayingCorrect(false)
    utterance.onerror = () => setIsPlayingCorrect(false)
    
    window.speechSynthesis.speak(utterance)
  }

  // 清理音頻
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  if (!isOpen) return null

  const passed = score >= 75

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* 標題區 */}
        <div className={`p-4 sm:p-5 md:p-6 rounded-t-2xl ${
          passed
            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
            : 'bg-gradient-to-r from-orange-500 to-amber-500'
        }`}>
          <div className="flex items-center justify-between text-white">
            <h2 className="text-xl sm:text-2xl font-bold">
              {passed ? '🎉 Great Job!' : '💪 Keep Practicing!'}
            </h2>
            <div className="text-right">
              <div className="text-xs sm:text-sm opacity-90">Score</div>
              <div className="text-3xl sm:text-4xl font-bold">{score}</div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
          {/* 答案對比 */}
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <div className="text-sm text-blue-600 font-semibold mb-2">Your Answer:</div>
              <div className="text-xl font-medium text-gray-800">{userTranscript || '(No speech detected)'}</div>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <div className="text-sm text-green-600 font-semibold mb-2">Correct Answer:</div>
              <div className="text-xl font-medium text-gray-800">{expectedAnswer}</div>
              {expectedPinyin && (
                <div className="text-base text-gray-600 mt-1">{expectedPinyin}</div>
              )}
            </div>
          </div>

          {/* 逐字分析 */}
          {characterAnalysis.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-sm font-semibold text-gray-700 mb-3">Character Analysis:</div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {characterAnalysis.map((item, index) => (
                  <div
                    key={index}
                    className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium ${
                      item.status === 'correct'
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : item.status === 'tone-error'
                        ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                        : 'bg-red-100 text-red-700 border-2 border-red-300'
                    }`}
                  >
                    <div className="text-base sm:text-lg">{item.char}</div>
                    {item.pinyin && (
                      <div className="text-xs opacity-75">{item.pinyin}</div>
                    )}
                    <div className="text-xs mt-1">{item.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 五維度分數 */}
          <div className="p-4 bg-purple-50 rounded-xl">
            <div className="text-sm font-semibold text-purple-700 mb-3">Detailed Scores:</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(detailedScores).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-xs text-gray-600 capitalize mb-1">{key}</div>
                  <div className={`text-2xl font-bold ${
                    value >= 90 ? 'text-green-600' :
                    value >= 75 ? 'text-blue-600' :
                    value >= 60 ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 建議 */}
          {Object.keys(suggestions).length > 0 && (
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="text-sm font-semibold text-blue-700 mb-3">💡 Suggestions:</div>
              <div className="space-y-2">
                {Object.entries(suggestions).map(([key, value]) => (
                  value && (
                    <div key={key} className="text-sm text-gray-700">
                      <span className="font-semibold capitalize text-blue-600">{key}:</span> {value}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* 總體練習建議 */}
          {overallPractice && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
              <div className="text-sm font-semibold text-purple-700 mb-2">📚 Practice Method:</div>
              <div className="text-sm text-gray-700">{overallPractice}</div>
            </div>
          )}

          {/* 音頻播放按鈕 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={playUserRecording}
              disabled={!audioBlob || isPlayingUser}
              className="px-4 py-3 sm:px-5 sm:py-3 md:px-6 md:py-4 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 touch-manipulation"
            >
              {isPlayingUser ? (
                <>
                  <span className="animate-pulse">🎤</span>
                  <span>Playing...</span>
                </>
              ) : (
                <>
                  <span>🎤</span>
                  <span>My Recording</span>
                </>
              )}
            </button>

            <button
              onClick={playCorrectAnswer}
              disabled={isPlayingCorrect}
              className="px-4 py-3 sm:px-5 sm:py-3 md:px-6 md:py-4 text-sm sm:text-base bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 touch-manipulation"
            >
              {isPlayingCorrect ? (
                <>
                  <span className="animate-pulse">🔊</span>
                  <span>Playing...</span>
                </>
              ) : (
                <>
                  <span>🔊</span>
                  <span>Correct Pronunciation</span>
                </>
              )}
            </button>
          </div>

          {/* 操作按鈕 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t-2 border-gray-200">
            <button
              onClick={onRetry}
              className="px-4 py-3 sm:px-5 sm:py-3 md:px-6 md:py-4 text-sm sm:text-base bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg font-semibold flex items-center justify-center gap-2 touch-manipulation"
            >
              <span>🔄</span>
              <span>Retry</span>
            </button>

            <button
              onClick={onNext}
              className="px-4 py-3 sm:px-5 sm:py-3 md:px-6 md:py-4 text-sm sm:text-base bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg font-semibold flex items-center justify-center gap-2 touch-manipulation"
            >
              <span>➡️</span>
              <span>Next Question</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
