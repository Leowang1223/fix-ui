'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { LucideIcon, BookOpen, MessageSquare, History, Trophy, Mic, Target } from 'lucide-react'

type EmptyStateType = 'history' | 'conversation' | 'achievement' | 'lesson' | 'recording' | 'custom'

interface EmptyStateProps {
  type?: EmptyStateType
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: LucideIcon
  customIllustration?: ReactNode
}

// 預設配置
const EMPTY_STATE_CONFIG: Record<EmptyStateType, {
  icon: LucideIcon
  title: string
  description: string
  actionLabel: string
  color: string
}> = {
  history: {
    icon: History,
    title: '還沒有學習記錄',
    description: '開始你的第一堂課，所有練習記錄都會保存在這裡',
    actionLabel: '開始第一課',
    color: 'blue',
  },
  conversation: {
    icon: MessageSquare,
    title: '還沒有對話記錄',
    description: '嘗試與 AI 進行一次中文對話吧！',
    actionLabel: '開始對話',
    color: 'purple',
  },
  achievement: {
    icon: Trophy,
    title: '繼續學習解鎖成就',
    description: '完成課程和練習來獲得徽章獎勵',
    actionLabel: '查看所有成就',
    color: 'yellow',
  },
  lesson: {
    icon: BookOpen,
    title: '課程載入中...',
    description: '如果持續顯示，請檢查網絡連接',
    actionLabel: '重新載入',
    color: 'green',
  },
  recording: {
    icon: Mic,
    title: '準備好錄音了嗎？',
    description: '點擊下方的麥克風按鈕開始練習發音',
    actionLabel: '開始錄音',
    color: 'red',
  },
  custom: {
    icon: Target,
    title: '暫無內容',
    description: '這裡還沒有任何內容',
    actionLabel: '了解更多',
    color: 'gray',
  },
}

const COLOR_MAP: Record<string, { bg: string; text: string; button: string }> = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-500',
    button: 'bg-blue-500 hover:bg-blue-600',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-500',
    button: 'bg-purple-500 hover:bg-purple-600',
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-500',
    button: 'bg-yellow-500 hover:bg-yellow-600',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-500',
    button: 'bg-green-500 hover:bg-green-600',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-500',
    button: 'bg-red-500 hover:bg-red-600',
  },
  gray: {
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    button: 'bg-gray-500 hover:bg-gray-600',
  },
}

export function EmptyState({
  type = 'custom',
  title,
  description,
  actionLabel,
  onAction,
  icon,
  customIllustration,
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type]
  const colors = COLOR_MAP[config.color]
  const Icon = icon || config.icon

  const displayTitle = title || config.title
  const displayDescription = description || config.description
  const displayActionLabel = actionLabel || config.actionLabel

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      {/* 插圖/圖標 */}
      {customIllustration || (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className={`w-24 h-24 rounded-full ${colors.bg} flex items-center justify-center mb-6`}
        >
          <Icon size={40} className={colors.text} />
        </motion.div>
      )}

      {/* 標題 */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-bold text-gray-800 text-center mb-2"
      >
        {displayTitle}
      </motion.h3>

      {/* 描述 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-gray-500 text-center max-w-sm mb-6"
      >
        {displayDescription}
      </motion.p>

      {/* 行動按鈕 */}
      {onAction && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className={`px-6 py-3 rounded-xl text-white font-medium shadow-lg transition-colors ${colors.button}`}
        >
          {displayActionLabel}
        </motion.button>
      )}
    </motion.div>
  )
}

// 內嵌空狀態（用於卡片內）
export function EmptyStateInline({
  icon: Icon = Target,
  message = '暫無內容',
  className = '',
}: {
  icon?: LucideIcon
  message?: string
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 text-gray-400 ${className}`}>
      <Icon size={32} className="mb-2 opacity-50" />
      <span className="text-sm">{message}</span>
    </div>
  )
}

export default EmptyState
