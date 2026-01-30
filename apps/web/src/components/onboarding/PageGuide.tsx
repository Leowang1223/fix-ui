'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react'

interface GuideStep {
  title: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

interface PageGuideProps {
  pageId: string
  steps: GuideStep[]
  onComplete?: () => void
  forceShow?: boolean
}

function getStorageKey(pageId: string) {
  return `hasSeenGuide_${pageId}`
}

export function PageGuide({ pageId, steps, onComplete, forceShow = false }: PageGuideProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true)
      return
    }
    const hasSeen = localStorage.getItem(getStorageKey(pageId))
    if (!hasSeen) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setIsVisible(true), 600)
      return () => clearTimeout(timer)
    }
  }, [pageId, forceShow])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
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

  const handleComplete = () => {
    localStorage.setItem(getStorageKey(pageId), 'true')
    setIsVisible(false)
    onComplete?.()
  }

  if (!isVisible || steps.length === 0) return null

  const step = steps[currentStep]
  const Icon = step.icon
  const isLastStep = currentStep === steps.length - 1

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-[150] w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" />
                <span className="text-xs font-semibold text-blue-700">
                  Quick Guide — {currentStep + 1}/{steps.length}
                </span>
              </div>
              <button
                onClick={handleComplete}
                className="p-1 rounded-full hover:bg-blue-100 transition-colors"
                title="Dismiss guide"
              >
                <X size={16} className="text-blue-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-800 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Progress dots + navigation */}
            <div className="px-5 pb-4 flex items-center justify-between">
              {/* Progress dots */}
              <div className="flex gap-1.5">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? 'w-4 bg-blue-500'
                        : index < currentStep
                          ? 'w-1.5 bg-blue-300'
                          : 'w-1.5 bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-all shadow-sm"
                >
                  <span>{isLastStep ? 'Got it' : 'Next'}</span>
                  {!isLastStep && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function resetPageGuide(pageId: string) {
  localStorage.removeItem(getStorageKey(pageId))
}

export function hasSeenPageGuide(pageId: string): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(getStorageKey(pageId)) === 'true'
}

export default PageGuide
