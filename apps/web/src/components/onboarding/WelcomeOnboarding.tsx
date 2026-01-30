'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  Map,
  MessageSquare,
  Layers,
  History,
  Sparkles,
  Rocket
} from 'lucide-react'

const STORAGE_KEY = 'hasCompletedWelcomeOnboarding'

interface OnboardingStep {
  id: number
  title: string
  description: string
  icon: typeof LayoutDashboard
  gradient: string
  iconBg: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 0,
    title: 'Welcome to Talk Learning!',
    description: 'Your AI-powered Chinese learning platform. Let us show you around the key features.',
    icon: Sparkles,
    gradient: 'from-violet-500 to-purple-600',
    iconBg: 'from-violet-400 to-purple-500',
  },
  {
    id: 1,
    title: 'Dashboard',
    description: 'Your learning hub — view progress stats, daily goals, recent activity, and quick access to all features.',
    icon: LayoutDashboard,
    gradient: 'from-blue-500 to-cyan-500',
    iconBg: 'from-blue-400 to-cyan-400',
  },
  {
    id: 2,
    title: 'Learning Path',
    description: 'Structured chapters and lessons with step-by-step pronunciation practice. Track your progress through each chapter.',
    icon: Map,
    gradient: 'from-emerald-500 to-teal-500',
    iconBg: 'from-emerald-400 to-teal-400',
  },
  {
    id: 3,
    title: 'AI Conversation',
    description: 'Practice speaking Chinese with an AI partner. Choose from free talk, lesson practice, or real-world scenarios.',
    icon: MessageSquare,
    gradient: 'from-orange-500 to-amber-500',
    iconBg: 'from-orange-400 to-amber-400',
  },
  {
    id: 4,
    title: 'Flashcards',
    description: 'Review vocabulary and phrases with spaced repetition. Reinforce what you\'ve learned in lessons.',
    icon: Layers,
    gradient: 'from-pink-500 to-rose-500',
    iconBg: 'from-pink-400 to-rose-400',
  },
  {
    id: 5,
    title: 'History',
    description: 'Access detailed reports, replay past sessions, and track your improvement over time.',
    icon: History,
    gradient: 'from-indigo-500 to-blue-600',
    iconBg: 'from-indigo-400 to-blue-500',
  },
  {
    id: 6,
    title: 'You\'re all set!',
    description: 'Start exploring and begin your Chinese learning journey. You can always revisit this guide from settings.',
    icon: Rocket,
    gradient: 'from-green-500 to-emerald-500',
    iconBg: 'from-green-400 to-emerald-400',
  },
]

interface WelcomeOnboardingProps {
  onComplete?: () => void
  forceShow?: boolean
}

export function WelcomeOnboarding({ onComplete, forceShow = false }: WelcomeOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
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
    if (currentStep < ONBOARDING_STEPS.length - 1) {
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
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsVisible(false)
    onComplete?.()
  }

  if (!isVisible) return null

  const step = ONBOARDING_STEPS[currentStep]
  const Icon = step.icon
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1
  const isFirstStep = currentStep === 0

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Gradient header bar */}
            <div className={`h-2 bg-gradient-to-r ${step.gradient}`} />

            {/* Close / Skip button */}
            <button
              onClick={handleComplete}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
              title="Skip introduction"
            >
              <X size={20} className="text-gray-400" />
            </button>

            {/* Progress dots */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? `w-6 bg-gradient-to-r ${step.gradient}`
                      : index < currentStep
                        ? 'w-1.5 bg-blue-300'
                        : 'w-1.5 bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="pt-14 pb-6 px-8">
              {/* Icon */}
              <motion.div
                key={currentStep}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br ${step.iconBg} flex items-center justify-center shadow-lg`}
              >
                <Icon size={44} className="text-white" />
              </motion.div>

              {/* Text */}
              <motion.div
                key={`text-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  {step.title}
                </h2>
                <p className="text-gray-500 leading-relaxed max-w-sm mx-auto">
                  {step.description}
                </p>
              </motion.div>

              {/* Step indicator badge (for feature steps) */}
              {currentStep > 0 && currentStep < ONBOARDING_STEPS.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex justify-center"
                >
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${step.gradient}`}>
                    Feature {currentStep} of 5
                  </span>
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={`flex items-center gap-1 px-4 py-2.5 rounded-xl transition-all ${
                  isFirstStep
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft size={18} />
                <span>Back</span>
              </button>

              <button
                onClick={handleComplete}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip
              </button>

              <button
                onClick={handleNext}
                className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-white font-medium shadow-md transition-all hover:shadow-lg bg-gradient-to-r ${step.gradient}`}
              >
                <span>{isLastStep ? 'Get Started' : 'Next'}</span>
                {!isLastStep && <ChevronRight size={18} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function resetWelcomeOnboarding() {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasCompletedWelcomeOnboarding(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export default WelcomeOnboarding
