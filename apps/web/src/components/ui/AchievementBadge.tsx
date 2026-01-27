'use client'

import { motion } from 'framer-motion'
import type { Achievement, UnlockedAchievement } from '@/lib/achievements'

interface AchievementBadgeProps {
  achievement: Achievement | UnlockedAchievement
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  locked?: boolean
}

const RARITY_COLORS = {
  common: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-700',
    glow: '',
  },
  rare: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-700',
    glow: 'shadow-blue-200',
  },
  epic: {
    bg: 'bg-purple-50',
    border: 'border-purple-400',
    text: 'text-purple-700',
    glow: 'shadow-purple-200',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-yellow-50 to-orange-50',
    border: 'border-yellow-400',
    text: 'text-yellow-700',
    glow: 'shadow-yellow-200',
  },
}

const RARITY_LABELS = {
  common: '普通',
  rare: '稀有',
  epic: '史詩',
  legendary: '傳說',
}

const SIZE_CONFIG = {
  sm: {
    badge: 'w-12 h-12',
    emoji: 'text-xl',
    padding: 'p-2',
  },
  md: {
    badge: 'w-16 h-16',
    emoji: 'text-2xl',
    padding: 'p-3',
  },
  lg: {
    badge: 'w-20 h-20',
    emoji: 'text-4xl',
    padding: 'p-4',
  },
}

export function AchievementBadge({
  achievement,
  size = 'md',
  showDetails = false,
  locked = false,
}: AchievementBadgeProps) {
  const colors = RARITY_COLORS[achievement.rarity]
  const sizeConfig = SIZE_CONFIG[size]
  const isUnlocked = 'unlockedAt' in achievement

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`
        flex flex-col items-center
        ${showDetails ? 'gap-2' : ''}
      `}
    >
      {/* 徽章圖標 */}
      <div
        className={`
          ${sizeConfig.badge} ${sizeConfig.padding}
          rounded-full border-2
          flex items-center justify-center
          transition-all duration-300
          ${locked || !isUnlocked
            ? 'bg-gray-200 border-gray-300 grayscale opacity-50'
            : `${colors.bg} ${colors.border} shadow-lg ${colors.glow}`
          }
        `}
      >
        <span className={`${sizeConfig.emoji} ${locked ? 'opacity-30' : ''}`}>
          {locked ? '🔒' : achievement.emoji}
        </span>
      </div>

      {/* 詳情 */}
      {showDetails && (
        <div className="text-center">
          <div className={`font-medium text-sm ${locked ? 'text-gray-400' : colors.text}`}>
            {achievement.nameZh}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {locked ? achievement.condition : achievement.descriptionZh}
          </div>
          {isUnlocked && !locked && (
            <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${colors.bg} ${colors.text}`}>
              {RARITY_LABELS[achievement.rarity]}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// 成就網格顯示
interface AchievementGridProps {
  achievements: Achievement[]
  unlockedIds: string[]
  size?: 'sm' | 'md' | 'lg'
}

export function AchievementGrid({
  achievements,
  unlockedIds,
  size = 'md',
}: AchievementGridProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
      {achievements.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          size={size}
          showDetails
          locked={!unlockedIds.includes(achievement.id)}
        />
      ))}
    </div>
  )
}

export default AchievementBadge
