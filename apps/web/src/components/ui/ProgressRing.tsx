'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ProgressRingProps {
  progress: number          // 0-100
  size?: number             // 圓環直徑
  strokeWidth?: number      // 線條寬度
  color?: string            // 進度條顏色
  bgColor?: string          // 背景軌道顏色
  showPercentage?: boolean  // 顯示百分比
  label?: string            // 中心標籤
  animated?: boolean        // 是否動畫
  children?: React.ReactNode // 自定義中心內容
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  color = '#3b82f6',
  bgColor = '#e5e7eb',
  showPercentage = true,
  label,
  animated = true,
  children,
}: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(animated ? 0 : progress)

  // 計算圓環參數
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (animatedProgress / 100) * circumference

  // 動畫效果
  useEffect(() => {
    if (!animated) {
      setAnimatedProgress(progress)
      return
    }

    // 數字遞增動畫
    const duration = 1000
    const startTime = Date.now()
    const startProgress = animatedProgress

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progressRatio = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progressRatio, 3)
      const current = startProgress + (progress - startProgress) * eased

      setAnimatedProgress(current)

      if (progressRatio < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [progress, animated])

  // 根據進度選擇顏色
  const getProgressColor = () => {
    if (color !== '#3b82f6') return color // 使用自定義顏色
    if (animatedProgress >= 80) return '#22c55e' // 綠色
    if (animatedProgress >= 50) return '#3b82f6' // 藍色
    if (animatedProgress >= 30) return '#f59e0b' // 橙色
    return '#ef4444' // 紅色
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* SVG 圓環 */}
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景軌道 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />

        {/* 進度條 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={animated ? { strokeDashoffset: circumference } : false}
          style={{
            transition: animated ? 'stroke-dashoffset 1s ease-out, stroke 0.3s' : 'none',
          }}
        />
      </svg>

      {/* 中心內容 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children || (
          <>
            {showPercentage && (
              <motion.span
                className="text-2xl font-bold text-gray-800"
                initial={animated ? { opacity: 0, scale: 0.5 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                {Math.round(animatedProgress)}%
              </motion.span>
            )}
            {label && (
              <span className="text-xs text-gray-500 mt-1">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// 迷你進度環（用於列表項）
interface MiniProgressRingProps {
  progress: number
  size?: number
  color?: string
}

export function MiniProgressRing({
  progress,
  size = 32,
  color,
}: MiniProgressRingProps) {
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  const getColor = () => {
    if (color) return color
    if (progress >= 80) return '#22c55e'
    if (progress >= 50) return '#3b82f6'
    if (progress >= 30) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-gray-700">
          {Math.round(progress)}
        </span>
      </div>
    </div>
  )
}

// 週目標進度卡片
interface WeeklyGoalCardProps {
  current: number
  goal: number
  unit?: string
  title?: string
}

export function WeeklyGoalCard({
  current,
  goal,
  unit = '課',
  title = '本週目標',
}: WeeklyGoalCardProps) {
  const progress = Math.min((current / goal) * 100, 100)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-6">
        <ProgressRing
          progress={progress}
          size={100}
          strokeWidth={8}
          showPercentage={false}
        >
          <div className="text-center">
            <span className="text-2xl font-bold text-gray-800">{current}</span>
            <span className="text-sm text-gray-400">/{goal}</span>
          </div>
        </ProgressRing>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">
            已完成 {current} {unit}，還差 {Math.max(0, goal - current)} {unit}
          </p>
          {progress >= 100 && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <span>🎉</span>
              <span>目標達成！</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgressRing
