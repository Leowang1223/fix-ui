'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Circle } from 'lucide-react'

interface StepResult {
  stepIndex: number
  score: number
}

interface StepProgressBarProps {
  totalSteps: number
  currentStep: number
  completedSteps: StepResult[]
  onStepClick?: (stepIndex: number) => void
  stepPreviews?: string[] // 每題的預覽文字
  compact?: boolean // 移動端緊湊模式
}

export function StepProgressBar({
  totalSteps,
  currentStep,
  completedSteps,
  onStepClick,
  stepPreviews = [],
  compact = false,
}: StepProgressBarProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)

  const getStepStatus = (index: number) => {
    const result = completedSteps.find(r => r.stepIndex === index)
    if (result) return { status: 'completed' as const, score: result.score }
    if (index === currentStep) return { status: 'current' as const, score: null }
    return { status: 'pending' as const, score: null }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 70) return 'text-blue-600 bg-blue-100'
    if (score >= 50) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  // 移動端緊湊版本
  if (compact) {
    const completedCount = completedSteps.length
    return (
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="font-medium text-gray-700">
          第 {currentStep + 1} 題
        </span>
        <span className="text-gray-400">/</span>
        <span className="text-gray-500">共 {totalSteps} 題</span>
        {completedCount > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            已完成 {completedCount}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 進度條容器 */}
      <div className="relative flex items-center justify-between">
        {/* 背景連接線 */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />

        {/* 已完成進度線 */}
        <motion.div
          className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-green-400 to-blue-500 -translate-y-1/2 z-0"
          initial={{ width: '0%' }}
          animate={{
            width: `${(Math.max(0, currentStep) / (totalSteps - 1)) * 100}%`
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* 步驟圓點 */}
        {Array.from({ length: totalSteps }).map((_, index) => {
          const { status, score } = getStepStatus(index)
          const isClickable = onStepClick && (status === 'completed' || index <= currentStep)

          return (
            <div
              key={index}
              className="relative z-10"
              onMouseEnter={() => setHoveredStep(index)}
              onMouseLeave={() => setHoveredStep(null)}
            >
              {/* 圓點按鈕 */}
              <motion.button
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={`
                  relative w-8 h-8 rounded-full flex items-center justify-center
                  transition-all duration-200 border-2
                  ${status === 'completed'
                    ? 'bg-green-500 border-green-500 text-white'
                    : status === 'current'
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }
                  ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                `}
                whileHover={isClickable ? { scale: 1.1 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
              >
                {status === 'completed' ? (
                  <Check size={16} strokeWidth={3} />
                ) : status === 'current' ? (
                  <motion.div
                    className="w-3 h-3 bg-white rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                ) : (
                  <Circle size={12} />
                )}
              </motion.button>

              {/* 分數標籤 (已完成的步驟) */}
              {status === 'completed' && score !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`
                    absolute -bottom-6 left-1/2 -translate-x-1/2
                    text-xs font-bold px-1.5 py-0.5 rounded
                    ${getScoreColor(score)}
                  `}
                >
                  {score}
                </motion.div>
              )}

              {/* 懸停預覽 Tooltip */}
              {hoveredStep === index && stepPreviews[index] && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap max-w-[200px] truncate z-50"
                >
                  <div className="font-medium mb-0.5">第 {index + 1} 題</div>
                  <div className="text-gray-300 truncate">{stepPreviews[index]}</div>
                  {/* 小三角 */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      {/* 底部文字說明 */}
      <div className="mt-8 flex justify-between text-xs text-gray-500">
        <span>開始</span>
        <span className="font-medium text-gray-700">
          {currentStep + 1} / {totalSteps}
        </span>
        <span>完成</span>
      </div>
    </div>
  )
}

export default StepProgressBar
