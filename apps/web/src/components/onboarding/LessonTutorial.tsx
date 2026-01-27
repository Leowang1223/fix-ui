'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Volume2, Mic, CheckCircle, BarChart3 } from 'lucide-react'

const STORAGE_KEY = 'hasCompletedLessonTutorial'

interface TutorialStep {
  id: number
  title: string
  titleZh: string
  description: string
  descriptionZh: string
  icon: typeof Volume2
  highlight?: string // CSS selector to highlight
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Welcome to your lesson!',
    titleZh: '歡迎來到課程！',
    description: 'This tutorial will guide you through the learning experience.',
    descriptionZh: '這個教程將引導你了解學習流程。',
    icon: CheckCircle,
  },
  {
    id: 2,
    title: 'Listen to the teacher',
    titleZh: '聽老師說',
    description: 'Click the speaker icon or wait for the video/TTS to play the pronunciation.',
    descriptionZh: '點擊喇叭圖標或等待視頻/TTS 播放正確發音。',
    icon: Volume2,
  },
  {
    id: 3,
    title: 'Record your pronunciation',
    titleZh: '錄製你的發音',
    description: 'Click the big blue button to start recording. Click again to stop.',
    descriptionZh: '點擊藍色大按鈕開始錄音，再次點擊停止。',
    icon: Mic,
  },
  {
    id: 4,
    title: 'Get instant feedback',
    titleZh: '獲得即時反饋',
    description: 'After recording, you\'ll see syllable-by-syllable analysis with tone curves.',
    descriptionZh: '錄音後，你會看到逐字分析和聲調曲線。',
    icon: BarChart3,
  },
  {
    id: 5,
    title: 'Keep practicing!',
    titleZh: '繼續練習！',
    description: 'Use "Retry" to practice again or "Next" to move forward. Good luck!',
    descriptionZh: '使用「重試」按鈕再次練習，或「下一題」繼續前進。加油！',
    icon: CheckCircle,
  },
]

interface LessonTutorialProps {
  onComplete?: () => void
  forceShow?: boolean
}

export function LessonTutorial({ onComplete, forceShow = false }: LessonTutorialProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // 檢查是否已完成教程
    if (forceShow) {
      setIsVisible(true)
      return
    }

    const hasCompleted = localStorage.getItem(STORAGE_KEY)
    if (!hasCompleted) {
      setIsVisible(true)
    }
  }, [forceShow])

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsVisible(false)
    onComplete?.()
  }

  if (!isVisible) return null

  const step = TUTORIAL_STEPS[currentStep]
  const Icon = step.icon
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          {/* Tutorial card */}
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
              title="Skip tutorial"
            >
              <X size={20} className="text-gray-500" />
            </button>

            {/* Progress dots */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
              {TUTORIAL_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'bg-blue-500 w-6'
                      : index < currentStep
                        ? 'bg-blue-300'
                        : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="pt-14 pb-6 px-6">
              {/* Icon */}
              <motion.div
                key={currentStep}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg"
              >
                <Icon size={36} className="text-white" />
              </motion.div>

              {/* Text */}
              <motion.div
                key={`text-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  {step.title}
                </h2>
                <p className="text-lg text-blue-600 mb-4">
                  {step.titleZh}
                </p>
                <p className="text-gray-600 mb-2">
                  {step.description}
                </p>
                <p className="text-gray-500 text-sm">
                  {step.descriptionZh}
                </p>
              </motion.div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  currentStep === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft size={18} />
                <span>上一步</span>
              </button>

              <button
                onClick={handleSkip}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                跳過教程
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md"
              >
                <span>{isLastStep ? '開始學習' : '下一步'}</span>
                {!isLastStep && <ChevronRight size={18} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 重置教程狀態的輔助函數（可用於設定頁面）
export function resetLessonTutorial() {
  localStorage.removeItem(STORAGE_KEY)
}

// 檢查是否已完成教程
export function hasCompletedLessonTutorial(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export default LessonTutorial
