'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Calendar, Target, Flame } from 'lucide-react'
import { DailyStats, getRecentDailyStats, getStreak, getProgressTrend } from '@/lib/scoreHistory'

interface TrendChartProps {
  days?: number
  height?: number
  showLabels?: boolean
  showStats?: boolean
  animated?: boolean
}

export function TrendChart({
  days = 7,
  height = 120,
  showLabels = true,
  showStats = true,
  animated = true,
}: TrendChartProps) {
  const t = useTranslations('trendChart')
  const data = useMemo(() => getRecentDailyStats(days), [days])
  const streak = useMemo(() => getStreak(), [])
  const trend = useMemo(() => getProgressTrend(days), [days])

  // 計算圖表數據
  const maxScore = 100
  const minScore = 0

  // 獲取有數據的最高和最低分
  const scores = data.filter(d => d.totalSessions > 0).map(d => d.averageScore)
  const hasData = scores.length > 0

  // 生成 SVG 路徑
  const chartWidth = 100
  const chartHeight = height - (showLabels ? 24 : 0)

  const points = data.map((d, i) => {
    const x = (i / (days - 1)) * chartWidth
    const y = d.totalSessions > 0
      ? chartHeight - ((d.averageScore - minScore) / (maxScore - minScore)) * chartHeight
      : chartHeight // 無數據時放在底部
    return { x, y, hasData: d.totalSessions > 0 }
  })

  // 創建曲線路徑 (使用貝塞爾曲線)
  const createPath = () => {
    const validPoints = points.filter(p => p.hasData)
    if (validPoints.length < 2) return ''

    let path = `M ${validPoints[0].x} ${validPoints[0].y}`

    for (let i = 1; i < validPoints.length; i++) {
      const prev = validPoints[i - 1]
      const curr = validPoints[i]
      const cpX = (prev.x + curr.x) / 2
      path += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`
    }

    return path
  }

  // 創建填充區域
  const createAreaPath = () => {
    const linePath = createPath()
    if (!linePath) return ''

    const validPoints = points.filter(p => p.hasData)
    const lastPoint = validPoints[validPoints.length - 1]
    const firstPoint = validPoints[0]

    return `${linePath} L ${lastPoint.x} ${chartHeight} L ${firstPoint.x} ${chartHeight} Z`
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    return weekdays[date.getDay()]
  }

  // 趨勢圖標
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-400'

  return (
    <div className="w-full">
      {/* 統計摘要 */}
      {showStats && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Streak days */}
            <div className="flex items-center gap-1.5">
              <Flame className={`w-4 h-4 ${streak > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
              <span className="text-sm font-medium text-gray-700">{streak}</span>
              <span className="text-xs text-gray-500">{t('days')}</span>
            </div>

            {/* 趨勢指標 */}
            <div className="flex items-center gap-1.5">
              <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              <span className={`text-sm font-medium ${trendColor}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </div>
          </div>

          {/* Period */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>{t('lastDays', { days })}</span>
          </div>
        </div>
      )}

      {/* 圖表區域 */}
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* 網格線 */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 背景參考線 */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = chartHeight - (value / 100) * chartHeight
            return (
              <line
                key={value}
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            )
          })}

          {hasData ? (
            <>
              {/* 填充區域 */}
              <motion.path
                d={createAreaPath()}
                fill="url(#areaGradient)"
                initial={animated ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              />

              {/* 主曲線 */}
              <motion.path
                d={createPath()}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                initial={animated ? { pathLength: 0 } : false}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
              />

              {/* 數據點 */}
              {points.map((point, i) => point.hasData && (
                <motion.circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="white"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  initial={animated ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                />
              ))}
            </>
          ) : (
            /* Empty state - just show dashed baseline */
            <line
              x1="0"
              y1={chartHeight / 2}
              x2={chartWidth}
              y2={chartHeight / 2}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}
        </svg>

        {/* X 軸標籤 */}
        {showLabels && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
            {data.map((d, i) => (
              <div
                key={i}
                className={`text-xs ${d.totalSessions > 0 ? 'text-gray-600' : 'text-gray-300'}`}
              >
                {formatDate(d.date)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 迷你趨勢線（用於列表項）
interface MiniTrendProps {
  data: number[] // 最近幾次的分數
  width?: number
  height?: number
  color?: string
}

export function MiniTrend({
  data,
  width = 60,
  height = 24,
  color = '#3b82f6',
}: MiniTrendProps) {
  if (data.length < 2) return null

  const max = Math.max(...data, 100)
  const min = Math.min(...data, 0)
  const range = max - min || 1

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const isUpward = data[data.length - 1] >= data[0]

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isUpward ? '#22c55e' : '#ef4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 每日目標進度條
interface DailyGoalProps {
  current: number
  goal: number
  label?: string
}

export function DailyGoal({
  current,
  goal,
  label,
}: DailyGoalProps) {
  const t = useTranslations('trendChart')
  const displayLabel = label || t('todayProgress')
  const progress = Math.min((current / goal) * 100, 100)
  const isComplete = current >= goal

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{displayLabel}</span>
        <div className="flex items-center gap-1">
          <Target className={`w-4 h-4 ${isComplete ? 'text-green-500' : 'text-gray-400'}`} />
          <span className={`text-sm font-medium ${isComplete ? 'text-green-600' : 'text-gray-700'}`}>
            {current}/{goal}
          </span>
        </div>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-green-600 flex items-center gap-1"
        >
          <span>🎉</span>
          <span>{t('todayGoalReached')}</span>
        </motion.div>
      )}
    </div>
  )
}

// 統計卡片
interface StatsSummaryProps {
  stats: DailyStats
  showTrend?: boolean
  compact?: boolean
}

export function StatsSummary({
  stats,
  showTrend = true,
  compact = false,
}: StatsSummaryProps) {
  const t = useTranslations('trendChart')
  const trend = getProgressTrend(7)

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">{t('average')}</span>
          <span className="font-semibold text-gray-800">{stats.averageScore}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">{t('practices')}</span>
          <span className="font-semibold text-gray-800">{stats.totalSessions}</span>
        </div>
        {showTrend && (
          <div className={`flex items-center gap-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{trend >= 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-blue-50 rounded-xl p-4">
        <div className="text-sm text-blue-600 mb-1">{t('averageScore')}</div>
        <div className="text-2xl font-bold text-blue-700">{stats.averageScore}</div>
      </div>
      <div className="bg-green-50 rounded-xl p-4">
        <div className="text-sm text-green-600 mb-1">{t('bestScore')}</div>
        <div className="text-2xl font-bold text-green-700">{stats.bestScore}</div>
      </div>
      <div className="bg-purple-50 rounded-xl p-4">
        <div className="text-sm text-purple-600 mb-1">{t('practiceCount')}</div>
        <div className="text-2xl font-bold text-purple-700">{stats.totalSessions}</div>
      </div>
      <div className="bg-orange-50 rounded-xl p-4">
        <div className="text-sm text-orange-600 mb-1">{t('studyTime')}</div>
        <div className="text-2xl font-bold text-orange-700">{stats.totalMinutes}<span className="text-sm font-normal">{t('minutes')}</span></div>
      </div>
    </div>
  )
}

export default TrendChart
