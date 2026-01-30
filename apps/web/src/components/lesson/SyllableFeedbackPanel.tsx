'use client'

import { motion } from 'framer-motion'
import { Volume2, Check, X, AlertTriangle, BookmarkPlus } from 'lucide-react'
import { ToneCurve, ToneBadge } from './ToneCurve'

export interface SyllableData {
  char: string
  expectedPinyin: string
  userPinyin?: string
  status: 'correct' | 'wrong' | 'tone-error' | 'missing' | 'extra'
  expectedTone?: 1 | 2 | 3 | 4 | 5
  userTone?: 1 | 2 | 3 | 4 | 5 | null
}

export interface SyllableFeedbackPanelProps {
  syllables: SyllableData[]
  overallScore: number
  englishHint?: string
  onPlayTTS?: (text: string) => void
  onRetry?: () => void
  onNext?: () => void
  onSaveFlashcard?: () => void
  showToneCurve?: boolean
  compact?: boolean
}

// Extract tone number from pinyin (e.g., "yong4" -> 4)
function extractTone(pinyin: string): 1 | 2 | 3 | 4 | 5 {
  const match = pinyin.match(/[1-5]$/)
  return match ? (parseInt(match[0]) as 1 | 2 | 3 | 4 | 5) : 5
}

// Status to color mapping
const STATUS_COLORS = {
  correct: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: Check,
    iconColor: 'text-green-500',
  },
  'tone-error': {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
  },
  wrong: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: X,
    iconColor: 'text-red-500',
  },
  missing: {
    bg: 'bg-gray-50',
    border: 'border-gray-300 border-dashed',
    text: 'text-gray-400',
    icon: X,
    iconColor: 'text-gray-400',
  },
  extra: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    icon: AlertTriangle,
    iconColor: 'text-purple-500',
  },
}

// Single syllable card component
function SyllableCard({
  syllable,
  index,
  showToneCurve,
  compact,
  onPlayTTS,
}: {
  syllable: SyllableData
  index: number
  showToneCurve?: boolean
  compact?: boolean
  onPlayTTS?: (text: string) => void
}) {
  const colors = STATUS_COLORS[syllable.status]
  const Icon = colors.icon
  const expectedTone = syllable.expectedTone || extractTone(syllable.expectedPinyin)
  const userTone = syllable.userTone || (syllable.userPinyin ? extractTone(syllable.userPinyin) : null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.08,
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      className={`
        relative flex flex-col items-center
        ${compact ? 'p-2 min-w-[50px]' : 'p-3 min-w-[70px]'}
        rounded-xl border-2 ${colors.bg} ${colors.border}
        ${syllable.status !== 'correct' ? 'animate-pulse-subtle' : ''}
      `}
    >
      {/* Status icon */}
      <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center`}>
        <Icon size={12} className={colors.iconColor} />
      </div>

      {/* Chinese character */}
      <div
        className={`
          ${compact ? 'text-xl' : 'text-2xl'} font-bold ${colors.text}
          ${onPlayTTS ? 'cursor-pointer hover:scale-110 transition-transform' : ''}
        `}
        onClick={() => onPlayTTS?.(syllable.char)}
      >
        {syllable.status === 'missing' ? '?' : syllable.char}
      </div>

      {/* Pinyin comparison */}
      <div className={`mt-1 ${compact ? 'text-[10px]' : 'text-xs'} text-center space-y-0.5`}>
        {/* Expected pinyin */}
        <div className="text-blue-600 font-medium">
          {syllable.expectedPinyin}
        </div>

        {/* User pinyin (if different) */}
        {syllable.userPinyin && syllable.userPinyin !== syllable.expectedPinyin && (
          <div className="text-orange-500 line-through">
            {syllable.userPinyin}
          </div>
        )}
      </div>

      {/* Tone indicator */}
      <div className="mt-1.5">
        <ToneBadge
          tone={expectedTone}
          isCorrect={syllable.status === 'correct' || syllable.status !== 'tone-error'}
          size={compact ? 'sm' : 'md'}
        />
      </div>

      {/* Tone curve (optional, for non-compact mode) */}
      {showToneCurve && !compact && (
        <div className="mt-2">
          <ToneCurve
            expectedTone={expectedTone}
            userTone={userTone}
            size="sm"
          />
        </div>
      )}
    </motion.div>
  )
}

// Score display component
function ScoreDisplay({ score }: { score: number }) {
  const getScoreColor = () => {
    if (score >= 90) return 'from-green-400 to-emerald-500'
    if (score >= 70) return 'from-blue-400 to-blue-500'
    if (score >= 50) return 'from-orange-400 to-amber-500'
    return 'from-red-400 to-red-500'
  }

  const getMessage = () => {
    if (score >= 90) return 'Excellent!'
    if (score >= 70) return 'Good job!'
    if (score >= 50) return 'Keep practicing!'
    return 'Try again!'
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
      className="flex flex-col items-center"
    >
      <div
        className={`
          w-16 h-16 rounded-full bg-gradient-to-br ${getScoreColor()}
          flex items-center justify-center shadow-lg
        `}
      >
        <span className="text-xl font-bold text-white">{score}</span>
      </div>
      <p className="mt-1 text-xs font-medium text-gray-500">{getMessage()}</p>
    </motion.div>
  )
}

// Legend component
function FeedbackLegend({ compact }: { compact?: boolean }) {
  const items = [
    { status: 'correct', label: 'Correct' },
    { status: 'tone-error', label: 'Tone Error' },
    { status: 'wrong', label: 'Wrong' },
    { status: 'missing', label: 'Missing' },
  ]

  return (
    <div className={`flex flex-wrap gap-2 justify-center ${compact ? 'text-[10px]' : 'text-xs'}`}>
      {items.map((item) => {
        const colors = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS]
        return (
          <div key={item.status} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded ${colors.bg} ${colors.border} border`} />
            <span className="text-gray-400">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// Main component
export function SyllableFeedbackPanel({
  syllables,
  overallScore,
  englishHint,
  onPlayTTS,
  onRetry,
  onNext,
  onSaveFlashcard,
  showToneCurve = true,
  compact = false,
}: SyllableFeedbackPanelProps) {
  // Calculate statistics
  const correctCount = syllables.filter(s => s.status === 'correct').length
  const totalCount = syllables.filter(s => s.status !== 'extra').length

  // Play full sentence
  const handlePlayFullSentence = () => {
    const text = syllables
      .filter(s => s.status !== 'missing' && s.status !== 'extra')
      .map(s => s.char)
      .join('')
    onPlayTTS?.(text)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        relative bg-white rounded-2xl shadow-lg border border-gray-100
        ${compact ? 'p-4' : 'p-6'}
      `}
    >
      {/* Save to Flashcard icon button - top right */}
      {onSaveFlashcard && (
        <button
          onClick={onSaveFlashcard}
          className="absolute top-4 right-4 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
          title="Save to Flashcards"
        >
          <BookmarkPlus size={18} />
        </button>
      )}

      {/* Header with score */}
      <div className="flex items-center justify-between mb-4 pr-12">
        <div>
          <h3 className={`font-bold text-gray-800 ${compact ? 'text-base' : 'text-lg'}`}>
            Pronunciation
          </h3>
          <p className="text-sm text-gray-500">
            {correctCount}/{totalCount} Correct
          </p>
        </div>
        <ScoreDisplay score={overallScore} />
      </div>

      {/* Syllable cards */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {syllables.map((syllable, index) => (
          <SyllableCard
            key={index}
            syllable={syllable}
            index={index}
            showToneCurve={showToneCurve}
            compact={compact}
            onPlayTTS={onPlayTTS}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center mb-4">
        <FeedbackLegend compact={compact} />
      </div>

      {/* Play button */}
      {onPlayTTS && (
        <div className="flex justify-center mb-4">
          <button
            onClick={handlePlayFullSentence}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
          >
            <Volume2 size={16} />
            <span className="text-sm font-medium">Play Correct Pronunciation</span>
          </button>
        </div>
      )}

      {/* English hint - at bottom */}
      {englishHint && (
        <div className="text-center mb-4 pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">English: </span>
          <span className="text-sm font-medium text-gray-700">{englishHint}</span>
        </div>
      )}

      {/* Action buttons */}
      {(onRetry || onNext) && (
        <div className="flex gap-3 justify-center pt-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className={`
                px-6 py-2.5 rounded-xl font-medium transition-all
                bg-gray-100 text-gray-700 hover:bg-gray-200
                ${compact ? 'text-sm' : ''}
              `}
            >
              Retry
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              className={`
                px-6 py-2.5 rounded-xl font-medium transition-all
                bg-gradient-to-r from-blue-500 to-indigo-500 text-white
                hover:from-blue-600 hover:to-indigo-600 shadow-md
                ${compact ? 'text-sm' : ''}
              `}
            >
              Next
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default SyllableFeedbackPanel
