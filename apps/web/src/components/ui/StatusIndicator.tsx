'use client'

import { motion } from 'framer-motion'
import {
  Mic,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Volume2,
  AlertCircle
} from 'lucide-react'

export type LessonStatus =
  | 'question'    // Viewing question, ready to record
  | 'listening'   // TTS is playing
  | 'recording'   // User is recording
  | 'processing'  // AI is analyzing/scoring
  | 'feedback'    // Showing results
  | 'completed'   // Question completed
  | 'error'       // Error occurred

interface StatusConfig {
  icon: typeof Mic
  label: string
  sublabel: string
  color: string
  bgColor: string
  borderColor: string
  animate?: boolean
  pulse?: boolean
}

const STATUS_CONFIG: Record<LessonStatus, StatusConfig> = {
  question: {
    icon: HelpCircle,
    label: 'Ready',
    sublabel: 'Tap to record',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  listening: {
    icon: Volume2,
    label: 'Listening',
    sublabel: 'Playing audio...',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    animate: true
  },
  recording: {
    icon: Mic,
    label: 'Recording',
    sublabel: 'Speak now...',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    pulse: true
  },
  processing: {
    icon: Loader2,
    label: 'Analyzing',
    sublabel: 'Scoring your pronunciation...',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    animate: true
  },
  feedback: {
    icon: CheckCircle2,
    label: 'Complete',
    sublabel: 'View your results',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  completed: {
    icon: CheckCircle2,
    label: 'Done',
    sublabel: 'Question completed',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    sublabel: 'Please try again',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
}

interface StatusIndicatorProps {
  status: LessonStatus
  className?: string
  size?: 'compact' | 'normal' | 'large'
  showLabel?: boolean
}

export function StatusIndicator({
  status,
  className = '',
  size = 'normal',
  showLabel = true
}: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  const sizeClasses = {
    compact: {
      container: 'px-3 py-1.5 gap-2',
      icon: 14,
      iconWrapper: 'p-1.5',
      label: 'text-xs',
      sublabel: 'text-[10px]'
    },
    normal: {
      container: 'px-4 py-2 gap-3',
      icon: 18,
      iconWrapper: 'p-2',
      label: 'text-sm',
      sublabel: 'text-xs'
    },
    large: {
      container: 'px-5 py-3 gap-4',
      icon: 22,
      iconWrapper: 'p-2.5',
      label: 'text-base',
      sublabel: 'text-sm'
    }
  }

  const sizes = sizeClasses[size]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        inline-flex items-center
        ${sizes.container}
        rounded-full
        ${config.bgColor}
        border ${config.borderColor}
        ${className}
      `}
    >
      {/* Icon */}
      <div className={`
        ${sizes.iconWrapper}
        rounded-full
        ${config.bgColor}
        ${config.color}
        ${config.pulse ? 'animate-pulse' : ''}
      `}>
        {config.animate ? (
          <motion.div
            animate={{ rotate: config.icon === Loader2 ? 360 : [0, 10, -10, 0] }}
            transition={{
              duration: config.icon === Loader2 ? 1 : 0.5,
              repeat: Infinity,
              ease: config.icon === Loader2 ? 'linear' : 'easeInOut'
            }}
          >
            <Icon size={sizes.icon} />
          </motion.div>
        ) : (
          <Icon size={sizes.icon} />
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <div className="flex flex-col">
          <span className={`font-semibold ${config.color} ${sizes.label}`}>
            {config.label}
          </span>
          <span className={`text-slate-500 ${sizes.sublabel}`}>
            {config.sublabel}
          </span>
        </div>
      )}

      {/* Recording indicator dot */}
      {status === 'recording' && (
        <motion.div
          className="w-2 h-2 rounded-full bg-red-500"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

// Minimal floating indicator for bottom-right corner
interface FloatingStatusProps {
  status: LessonStatus
  className?: string
}

export function FloatingStatus({ status, className = '' }: FloatingStatusProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  // Only show for active states
  if (status === 'question' || status === 'completed') return null

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`
        fixed bottom-24 right-4 z-40
        lg:bottom-6 lg:right-6
        flex items-center gap-2
        px-4 py-2
        rounded-full
        ${config.bgColor}
        border ${config.borderColor}
        shadow-lg
        ${className}
      `}
    >
      <div className={`${config.color} ${config.pulse ? 'animate-pulse' : ''}`}>
        {config.animate ? (
          <motion.div
            animate={{ rotate: config.icon === Loader2 ? 360 : [0, 10, -10, 0] }}
            transition={{
              duration: config.icon === Loader2 ? 1 : 0.5,
              repeat: Infinity,
              ease: config.icon === Loader2 ? 'linear' : 'easeInOut'
            }}
          >
            <Icon size={18} />
          </motion.div>
        ) : (
          <Icon size={18} />
        )}
      </div>
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>

      {status === 'recording' && (
        <motion.div
          className="w-2 h-2 rounded-full bg-red-500"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

// Progress steps indicator
interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  status: LessonStatus
  className?: string
}

export function StepProgressIndicator({
  currentStep,
  totalSteps,
  status,
  className = ''
}: StepIndicatorProps) {
  const progress = ((currentStep) / totalSteps) * 100
  const config = STATUS_CONFIG[status]

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Info row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} size="compact" showLabel={false} />
          <span className="text-sm text-slate-600">
            Question <span className="font-semibold">{currentStep}</span> of {totalSteps}
          </span>
        </div>
        <span className={`text-sm font-medium ${config.color}`}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}
