'use client'

import { motion } from 'framer-motion'
import {
  PlayCircle,
  RefreshCw,
  BookOpen,
  Zap,
  Target,
  ChevronRight,
  Clock,
  Star,
  TrendingUp,
} from 'lucide-react'
import { Recommendation, RecommendationType } from '@/lib/recommendations'

const TYPE_CONFIG: Record<RecommendationType, {
  icon: typeof PlayCircle
  gradient: string
  badge: string
}> = {
  continue: {
    icon: PlayCircle,
    gradient: 'from-blue-500 to-blue-600',
    badge: '繼續學習',
  },
  review: {
    icon: RefreshCw,
    gradient: 'from-orange-500 to-orange-600',
    badge: '複習推薦',
  },
  new: {
    icon: BookOpen,
    gradient: 'from-green-500 to-green-600',
    badge: '新課程',
  },
  challenge: {
    icon: Zap,
    gradient: 'from-purple-500 to-purple-600',
    badge: '挑戰',
  },
  practice: {
    icon: Target,
    gradient: 'from-pink-500 to-pink-600',
    badge: '練習',
  },
}

interface RecommendationCardProps {
  recommendation: Recommendation
  onClick?: () => void
  variant?: 'default' | 'compact' | 'hero'
  showMetrics?: boolean
  animated?: boolean
}

export function RecommendationCard({
  recommendation,
  onClick,
  variant = 'default',
  showMetrics = true,
  animated = true,
}: RecommendationCardProps) {
  const config = TYPE_CONFIG[recommendation.type]
  const Icon = config.icon

  if (variant === 'hero') {
    return (
      <motion.div
        initial={animated ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`
          relative overflow-hidden rounded-2xl p-6 cursor-pointer
          bg-gradient-to-br ${config.gradient} text-white shadow-lg
        `}
      >
        {/* 背景裝飾 */}
        <div className="absolute top-0 right-0 w-40 h-40 -mr-10 -mt-10 opacity-20">
          <Icon className="w-full h-full" />
        </div>

        {/* 徽章 */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
          <Icon className="w-4 h-4" />
          <span>{config.badge}</span>
        </div>

        {/* 標題 */}
        <h3 className="text-2xl font-bold mb-2">{recommendation.lessonTitle}</h3>

        {/* 原因 */}
        <p className="text-white/80 mb-4">{recommendation.reason}</p>

        {/* 指標 */}
        {showMetrics && recommendation.metrics && (
          <div className="flex items-center gap-4 text-sm text-white/70 mb-4">
            {recommendation.metrics.lastScore !== undefined && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                <span>上次 {recommendation.metrics.lastScore}分</span>
              </div>
            )}
            {recommendation.metrics.attempts !== undefined && recommendation.metrics.attempts > 0 && (
              <div className="flex items-center gap-1">
                <RefreshCw className="w-4 h-4" />
                <span>練習 {recommendation.metrics.attempts} 次</span>
              </div>
            )}
            {recommendation.metrics.averageScore !== undefined && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>平均 {recommendation.metrics.averageScore}分</span>
              </div>
            )}
          </div>
        )}

        {/* 行動按鈕 */}
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span>開始學習</span>
          <ChevronRight className="w-5 h-5" />
        </div>
      </motion.div>
    )
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={animated ? { opacity: 0, x: -10 } : false}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: 4 }}
        onClick={onClick}
        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
      >
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-800 truncate">{recommendation.lessonTitle}</h4>
          <p className="text-xs text-gray-500 truncate">{recommendation.reason}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </motion.div>
    )
  }

  // Default variant
  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md cursor-pointer transition-all"
    >
      <div className="flex items-start gap-4">
        {/* 圖標 */}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          {/* 徽章 */}
          <div className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600 mb-1">
            {config.badge}
          </div>

          {/* 標題 */}
          <h4 className="font-semibold text-gray-800 mb-1">{recommendation.lessonTitle}</h4>

          {/* 原因 */}
          <p className="text-sm text-gray-500 line-clamp-2">{recommendation.reason}</p>

          {/* 指標 */}
          {showMetrics && recommendation.metrics && (
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              {recommendation.metrics.lastScore !== undefined && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {recommendation.metrics.lastScore}分
                </span>
              )}
              {recommendation.metrics.lastAttempt !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(recommendation.metrics.lastAttempt)}
                </span>
              )}
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
      </div>
    </motion.div>
  )
}

// 推薦列表
interface RecommendationListProps {
  recommendations: Recommendation[]
  onSelect?: (rec: Recommendation) => void
  variant?: 'default' | 'compact'
  maxItems?: number
}

export function RecommendationList({
  recommendations,
  onSelect,
  variant = 'default',
  maxItems = 5,
}: RecommendationListProps) {
  const displayItems = recommendations.slice(0, maxItems)

  return (
    <div className={variant === 'compact' ? 'space-y-2' : 'space-y-3'}>
      {displayItems.map((rec, index) => (
        <motion.div
          key={rec.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <RecommendationCard
            recommendation={rec}
            variant={variant}
            onClick={() => onSelect?.(rec)}
          />
        </motion.div>
      ))}

      {recommendations.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>開始學習後會出現推薦</p>
        </div>
      )}
    </div>
  )
}

// 智能推薦橫幅
interface SmartRecommendationBannerProps {
  recommendation: Recommendation | null
  onStart?: () => void
  onDismiss?: () => void
}

export function SmartRecommendationBanner({
  recommendation,
  onStart,
  onDismiss,
}: SmartRecommendationBannerProps) {
  if (!recommendation) return null

  const config = TYPE_CONFIG[recommendation.type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        relative overflow-hidden rounded-xl p-4
        bg-gradient-to-r ${config.gradient} text-white
      `}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm text-white/80 mb-0.5">{config.badge}</div>
          <h4 className="font-semibold truncate">{recommendation.lessonTitle}</h4>
        </div>

        <button
          onClick={onStart}
          className="px-4 py-2 bg-white text-gray-800 rounded-lg font-medium hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          開始
        </button>
      </div>

      {/* 關閉按鈕 */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white/80"
        >
          ×
        </button>
      )}
    </motion.div>
  )
}

// 輔助函數：格式化時間
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return '剛剛'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分鐘前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小時前`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} 天前`

  return new Date(timestamp).toLocaleDateString('zh-TW')
}

export default RecommendationCard
