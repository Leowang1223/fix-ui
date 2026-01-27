'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'
import type { UnlockedAchievement } from '@/lib/achievements'

interface AchievementToastProps {
  achievement: UnlockedAchievement | null
  onClose: () => void
  duration?: number // 自動關閉時間（毫秒）
}

const RARITY_STYLES = {
  common: {
    bg: 'from-gray-600 to-gray-700',
    glow: 'shadow-gray-500/30',
  },
  rare: {
    bg: 'from-blue-500 to-blue-600',
    glow: 'shadow-blue-500/30',
  },
  epic: {
    bg: 'from-purple-500 to-purple-600',
    glow: 'shadow-purple-500/30',
  },
  legendary: {
    bg: 'from-yellow-500 via-orange-500 to-red-500',
    glow: 'shadow-yellow-500/50',
  },
}

export function AchievementToast({
  achievement,
  onClose,
  duration = 5000,
}: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (achievement) {
      setIsVisible(true)

      // 自動關閉
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // 等待動畫完成
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [achievement, duration, onClose])

  if (!achievement) return null

  const styles = RARITY_STYLES[achievement.rarity]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4"
        >
          <div
            className={`
              relative overflow-hidden rounded-2xl
              bg-gradient-to-r ${styles.bg}
              shadow-2xl ${styles.glow}
              p-4
            `}
          >
            {/* 背景裝飾 */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.1 }}
                className="absolute inset-0"
                style={{
                  backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 2, repeat: Infinity },
                }}
                className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
              />
            </div>

            {/* 內容 */}
            <div className="relative flex items-center gap-4">
              {/* 徽章 */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="flex-shrink-0 w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
              >
                <span className="text-4xl">{achievement.emoji}</span>
              </motion.div>

              {/* 文字 */}
              <div className="flex-1 min-w-0">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <Sparkles size={16} className="text-yellow-300" />
                  <span className="text-xs text-white/80 font-medium uppercase tracking-wider">
                    成就解鎖
                  </span>
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg font-bold text-white truncate mt-1"
                >
                  {achievement.nameZh}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-white/70 truncate"
                >
                  {achievement.descriptionZh}
                </motion.p>
              </div>

              {/* 關閉按鈕 */}
              <button
                onClick={() => {
                  setIsVisible(false)
                  setTimeout(onClose, 300)
                }}
                className="absolute top-2 right-2 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* 進度條 */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 origin-left"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 多個成就通知管理器
interface AchievementToastManagerProps {
  achievements: UnlockedAchievement[]
  onAllClosed?: () => void
}

export function AchievementToastManager({
  achievements,
  onAllClosed,
}: AchievementToastManagerProps) {
  const [queue, setQueue] = useState<UnlockedAchievement[]>([])
  const [current, setCurrent] = useState<UnlockedAchievement | null>(null)

  useEffect(() => {
    if (achievements.length > 0) {
      setQueue(prev => [...prev, ...achievements])
    }
  }, [achievements])

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0])
      setQueue(prev => prev.slice(1))
    }
  }, [current, queue])

  const handleClose = () => {
    setCurrent(null)
    if (queue.length === 0 && onAllClosed) {
      onAllClosed()
    }
  }

  return <AchievementToast achievement={current} onClose={handleClose} />
}

export default AchievementToast
