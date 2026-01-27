'use client'

import { motion } from 'framer-motion'

export interface ToneCurveProps {
  expectedTone: 1 | 2 | 3 | 4 | 5  // 1-4 standard tones, 5 = neutral
  userTone?: 1 | 2 | 3 | 4 | 5 | null
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
}

// SVG path data for each tone pattern
// Normalized to 0-100 coordinate system
const TONE_PATHS: Record<number, string> = {
  1: 'M 10,25 L 90,25',                           // 平 - flat high
  2: 'M 10,70 Q 50,50 90,20',                     // 升 - rising
  3: 'M 10,40 Q 30,70 50,75 Q 70,70 90,35',       // 降升 - dipping (fall-rise)
  4: 'M 10,20 Q 50,50 90,80',                     // 降 - falling
  5: 'M 10,50 L 90,50',                           // 輕聲 - neutral (short, mid)
}

// Tone labels in Chinese
const TONE_LABELS: Record<number, string> = {
  1: '一聲 (平)',
  2: '二聲 (升)',
  3: '三聲 (降升)',
  4: '四聲 (降)',
  5: '輕聲',
}

// Size configurations
const SIZE_CONFIG = {
  sm: { width: 40, height: 30, strokeWidth: 2 },
  md: { width: 60, height: 45, strokeWidth: 2.5 },
  lg: { width: 80, height: 60, strokeWidth: 3 },
}

export function ToneCurve({
  expectedTone,
  userTone,
  size = 'md',
  showLabels = false
}: ToneCurveProps) {
  const config = SIZE_CONFIG[size]
  const isCorrect = userTone === expectedTone
  const hasUserTone = userTone !== null && userTone !== undefined

  // Determine status color
  const getUserColor = () => {
    if (!hasUserTone) return '#9CA3AF' // gray
    if (isCorrect) return '#10B981' // green
    return '#F59E0B' // orange for wrong tone
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={config.width}
        height={config.height}
        viewBox="0 0 100 100"
        className="overflow-visible"
      >
        {/* Background grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="2,2" />

        {/* Expected tone curve (blue, always shown) */}
        <motion.path
          d={TONE_PATHS[expectedTone]}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* User tone curve (if different from expected) */}
        {hasUserTone && !isCorrect && (
          <motion.path
            d={TONE_PATHS[userTone!]}
            fill="none"
            stroke={getUserColor()}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray="4,3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.8 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
          />
        )}

        {/* Correct indicator */}
        {hasUserTone && isCorrect && (
          <motion.circle
            cx="90"
            cy="25"
            r="6"
            fill="#10B981"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, delay: 0.5 }}
          />
        )}
      </svg>

      {/* Labels */}
      {showLabels && (
        <div className="flex gap-2 text-[10px]">
          <span className="text-blue-500">預期: {TONE_LABELS[expectedTone]}</span>
          {hasUserTone && !isCorrect && (
            <span className="text-orange-500">你的: {TONE_LABELS[userTone!]}</span>
          )}
        </div>
      )}
    </div>
  )
}

// Compact inline version for syllable cards
export function ToneBadge({
  tone,
  isCorrect = true,
  size = 'sm'
}: {
  tone: 1 | 2 | 3 | 4 | 5
  isCorrect?: boolean
  size?: 'sm' | 'md'
}) {
  const sizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
  }

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full flex items-center justify-center font-bold
        ${isCorrect
          ? 'bg-blue-100 text-blue-700'
          : 'bg-orange-100 text-orange-700'
        }
      `}
    >
      {tone === 5 ? '·' : tone}
    </div>
  )
}

export default ToneCurve
