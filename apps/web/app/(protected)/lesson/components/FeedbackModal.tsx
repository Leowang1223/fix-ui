/**
 * 即時反饋彈窗組件 - 優化版
 * 分層顯示：核心結果優先，詳細分析可收合
 */

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Volume2,
  Mic,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  BarChart3,
  MessageSquare,
  Lightbulb
} from 'lucide-react'

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

// Collapsible section component
function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
  badge
}: {
  title: string
  icon: typeof BarChart3
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors touch-manipulation"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100">
            <Icon size={18} className="text-slate-600" />
          </div>
          <span className="font-semibold text-slate-700">{title}</span>
          {badge}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Score circle component
function ScoreCircle({ score, size = 'large' }: { score: number; size?: 'large' | 'small' }) {
  const passed = score >= 75
  const excellent = score >= 90

  const sizeClasses = size === 'large'
    ? 'w-24 h-24 text-4xl'
    : 'w-12 h-12 text-lg'

  return (
    <div className={`
      relative ${sizeClasses} rounded-full flex items-center justify-center font-bold
      ${excellent
        ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-[0_8px_30px_rgba(34,197,94,0.4)]'
        : passed
          ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-[0_8px_30px_rgba(59,130,246,0.4)]'
          : 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-[0_8px_30px_rgba(251,146,60,0.4)]'
      }
    `}>
      {score}
      {excellent && size === 'large' && (
        <Sparkles size={16} className="absolute -top-1 -right-1 text-amber-400" />
      )}
    </div>
  )
}

// Mini score badge
function MiniScoreBadge({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? 'text-green-600 bg-green-50'
    : value >= 75 ? 'text-blue-600 bg-blue-50'
    : value >= 60 ? 'text-orange-600 bg-orange-50'
    : 'text-red-600 bg-red-50'

  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-xl ${color}`}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[10px] font-medium capitalize opacity-80">{label}</span>
    </div>
  )
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
  const excellent = score >= 90
  const correctCount = characterAnalysis.filter(c => c.status === 'correct').length
  const wrongCount = characterAnalysis.filter(c => c.status !== 'correct').length
  const hasSuggestions = Object.values(suggestions).some(v => v)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-gradient-to-b from-slate-50 to-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header - Always visible */}
        <div className={`
          relative p-6 text-center
          ${excellent
            ? 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500'
            : passed
              ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600'
              : 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500'
          }
        `}>
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-16 h-16 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />

          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              <ScoreCircle score={score} />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {excellent ? 'Excellent!' : passed ? 'Great Job!' : 'Keep Practicing!'}
            </h2>
            <p className="text-white/80 text-sm">
              {excellent
                ? 'Perfect pronunciation!'
                : passed
                  ? 'You\'re doing well!'
                  : 'A little more practice needed'
              }
            </p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Answer Comparison - Always visible */}
          <div className="space-y-3">
            {/* Your Answer */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Mic size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-blue-600 mb-1">Your Answer</div>
                <div className="text-base font-medium text-slate-800 break-words">
                  {userTranscript || '(No speech detected)'}
                </div>
              </div>
              {audioBlob && (
                <button
                  onClick={playUserRecording}
                  disabled={isPlayingUser}
                  className={`
                    p-2 rounded-full transition-all touch-manipulation
                    ${isPlayingUser
                      ? 'bg-blue-500 text-white animate-pulse'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }
                  `}
                >
                  <Volume2 size={18} />
                </button>
              )}
            </div>

            {/* Correct Answer */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-green-50 border border-green-100">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <CheckCircle2 size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-green-600 mb-1">Correct Answer</div>
                <div className="text-base font-medium text-slate-800 break-words">
                  {expectedAnswer}
                </div>
                {expectedPinyin && (
                  <div className="text-sm text-slate-500 mt-1">{expectedPinyin}</div>
                )}
              </div>
              <button
                onClick={playCorrectAnswer}
                disabled={isPlayingCorrect}
                className={`
                  p-2 rounded-full transition-all touch-manipulation
                  ${isPlayingCorrect
                    ? 'bg-green-500 text-white animate-pulse'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }
                `}
              >
                <Volume2 size={18} />
              </button>
            </div>
          </div>

          {/* Collapsible Sections */}
          <div className="space-y-3">
            {/* Character Analysis */}
            {characterAnalysis.length > 0 && (
              <CollapsibleSection
                title="Character Analysis"
                icon={MessageSquare}
                badge={
                  <span className={`
                    text-xs font-medium px-2 py-0.5 rounded-full
                    ${wrongCount === 0 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}
                  `}>
                    {correctCount}/{characterAnalysis.length} correct
                  </span>
                }
              >
                <div className="flex flex-wrap gap-2">
                  {characterAnalysis.map((item, index) => (
                    <div
                      key={index}
                      className={`
                        px-3 py-2 rounded-lg text-center min-w-[48px]
                        ${item.status === 'correct'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : item.status === 'tone-error'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }
                      `}
                    >
                      <div className="text-lg font-bold">{item.char}</div>
                      <div className="text-[10px] opacity-75">{item.message}</div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Detailed Scores */}
            <CollapsibleSection
              title="Score Breakdown"
              icon={BarChart3}
            >
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(detailedScores).map(([key, value]) => (
                  <MiniScoreBadge key={key} label={key.slice(0, 4)} value={value} />
                ))}
              </div>
            </CollapsibleSection>

            {/* Suggestions */}
            {hasSuggestions && (
              <CollapsibleSection
                title="Improvement Tips"
                icon={Lightbulb}
              >
                <div className="space-y-2">
                  {Object.entries(suggestions).map(([key, value]) => (
                    value && (
                      <div
                        key={key}
                        className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100"
                      >
                        <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-700 capitalize text-sm">{key}: </span>
                          <span className="text-slate-600 text-sm">{value}</span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Practice Method - Simplified */}
            {overallPractice && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-purple-500" />
                  <span className="font-semibold text-purple-700 text-sm">Practice Tips</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {overallPractice.length > 150
                    ? overallPractice.slice(0, 150) + '...'
                    : overallPractice
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Always visible at bottom */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={onRetry}
              className="
                flex items-center justify-center gap-2
                px-4 py-4
                bg-slate-100 text-slate-700
                rounded-2xl
                font-semibold text-base
                hover:bg-slate-200
                transition-all
                touch-manipulation
              "
              whileTap={{ scale: 0.98 }}
            >
              <RotateCcw size={20} />
              <span>Retry</span>
            </motion.button>

            <motion.button
              onClick={onNext}
              className={`
                flex items-center justify-center gap-2
                px-4 py-4
                rounded-2xl
                font-semibold text-base
                transition-all
                touch-manipulation
                ${passed
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_8px_20px_rgba(34,197,94,0.3)]'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_8px_20px_rgba(59,130,246,0.3)]'
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              <span>Next</span>
              <ArrowRight size={20} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
