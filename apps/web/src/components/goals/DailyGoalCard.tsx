'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, Flame, BookOpen, MessageSquare, Brain, HelpCircle,
  Check, ChevronRight, Settings, Trophy, Sparkles
} from 'lucide-react'
import { useDailyGoals, type DailyGoalConfig } from '@/hooks/useDailyGoals'

interface GoalItemProps {
  icon: typeof BookOpen
  label: string
  current: number
  target: number
  color: string
  unit?: string
}

function GoalItem({ icon: Icon, label, current, target, color, unit = '' }: GoalItemProps) {
  const percentage = Math.min(100, Math.round((current / target) * 100))
  const isComplete = current >= target

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-600 truncate">{label}</span>
          <span className="text-xs text-slate-500">
            {current}/{target}{unit}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : color.replace('bg-', 'bg-').replace('/20', '')}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
      {isComplete && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      )}
    </div>
  )
}

interface GoalSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentGoals: DailyGoalConfig
  onSave: (goals: DailyGoalConfig) => void
}

function GoalSettingsModal({ isOpen, onClose, currentGoals, onSave }: GoalSettingsModalProps) {
  const t = useTranslations('goals')
  const tCommon = useTranslations('common')
  const [goals, setGoals] = useState<DailyGoalConfig>(currentGoals)

  const handleSave = () => {
    onSave(goals)
    onClose()
  }

  const goalItems = [
    { key: 'lessonsToComplete' as const, label: t('lessonsPerDay'), icon: BookOpen, min: 1, max: 10, color: 'bg-blue-500' },
    { key: 'vocabToReview' as const, label: t('vocabWords'), icon: Brain, min: 5, max: 50, step: 5, color: 'bg-purple-500' },
    { key: 'conversationMinutes' as const, label: t('conversationMinutes'), icon: MessageSquare, min: 1, max: 30, color: 'bg-emerald-500' },
    { key: 'practiceQuestions' as const, label: t('practiceQuestions'), icon: HelpCircle, min: 5, max: 30, step: 5, color: 'bg-amber-500' }
  ]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">{t('dailyGoalSettings')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('setDailyTargets')}</p>
          </div>

          <div className="p-5 space-y-6">
            {goalItems.map(item => (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md ${item.color} flex items-center justify-center`}>
                    <item.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={item.min}
                    max={item.max}
                    step={item.step || 1}
                    value={goals[item.key]}
                    onChange={(e) => setGoals(prev => ({ ...prev, [item.key]: parseInt(e.target.value) }))}
                    className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="w-10 text-center text-sm font-bold text-slate-900">
                    {goals[item.key]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('saveGoals')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function DailyGoalCard() {
  const t = useTranslations('goals')
  const {
    data,
    isLoading,
    updateGoals,
    getCompletionPercentage,
    getGoalProgress,
    isTodayCompleted
  } = useDailyGoals()

  const [showSettings, setShowSettings] = useState(false)

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl bg-white/70 border border-white/50 p-5 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-slate-200 rounded" />
          <div className="h-10 bg-slate-200 rounded" />
          <div className="h-10 bg-slate-200 rounded" />
        </div>
      </div>
    )
  }

  const completionPercentage = getCompletionPercentage()
  const isCompleted = isTodayCompleted()
  const streak = data.streak

  const lessonsProgress = getGoalProgress('lessonsCompleted')
  const vocabProgress = getGoalProgress('vocabReviewed')
  const conversationProgress = getGoalProgress('conversationMinutes')
  const questionsProgress = getGoalProgress('questionsAnswered')

  return (
    <>
      <motion.div
        className={`rounded-2xl border p-5 transition-all ${
          isCompleted
            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200'
            : 'bg-white/70 border-white/50'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            }`}>
              {isCompleted ? (
                <Trophy className="w-4 h-4 text-white" />
              ) : (
                <Target className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{t('todaysGoals')}</h3>
              <p className="text-xs text-slate-500">
                {isCompleted ? t('allGoalsCompleted') : t('percentComplete', { percentage: completionPercentage })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-600">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{streak}</span>
              </div>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors touch-manipulation"
            >
              <Settings className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-200"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                {t('greatJobCompleted')}
              </span>
            </div>
          </motion.div>
        )}

        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="6" fill="none" />
              <motion.circle
                cx="32" cy="32" r="28"
                stroke={isCompleted ? '#10b981' : '#3b82f6'}
                strokeWidth="6" fill="none" strokeLinecap="round"
                initial={{ strokeDashoffset: 176 }}
                animate={{ strokeDashoffset: 176 - (176 * completionPercentage) / 100 }}
                strokeDasharray="176"
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-slate-800">{completionPercentage}%</span>
            </div>
          </div>

          <div className="flex-1 text-sm text-slate-600">
            <p>{t('completeDaily')}</p>
          </div>
        </div>

        <div className="space-y-3">
          <GoalItem icon={BookOpen} label={t('lessons')} current={lessonsProgress.current} target={lessonsProgress.target} color="bg-blue-500" />
          <GoalItem icon={Brain} label={t('vocabulary')} current={vocabProgress.current} target={vocabProgress.target} color="bg-purple-500" unit={` ${t('wordsUnit')}`} />
          <GoalItem icon={MessageSquare} label={t('conversation')} current={conversationProgress.current} target={conversationProgress.target} color="bg-emerald-500" unit={` ${t('minUnit')}`} />
          <GoalItem icon={HelpCircle} label={t('practiceLabel')} current={questionsProgress.current} target={questionsProgress.target} color="bg-amber-500" />
        </div>
      </motion.div>

      <GoalSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentGoals={data.goals}
        onSave={updateGoals}
      />
    </>
  )
}

export function DailyGoalMini() {
  const t = useTranslations('goals')
  const { data, isLoading, getCompletionPercentage, isTodayCompleted } = useDailyGoals()

  if (isLoading || !data) {
    return <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
  }

  const percentage = getCompletionPercentage()
  const isCompleted = isTodayCompleted()
  const streak = data.streak

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
      isCompleted ? 'bg-emerald-50' : 'bg-blue-50'
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        isCompleted ? 'bg-emerald-500' : 'bg-blue-500'
      }`}>
        {isCompleted ? (
          <Check className="w-5 h-5 text-white" />
        ) : (
          <span className="text-sm font-bold text-white">{percentage}%</span>
        )}
      </div>

      <div className="flex-1">
        <p className={`text-sm font-medium ${isCompleted ? 'text-emerald-700' : 'text-blue-700'}`}>
          {isCompleted ? t('goalsComplete') : t('dailyProgress')}
        </p>
        <p className="text-xs text-slate-500">
          {streak > 0 ? t('dayStreak', { count: streak }) : t('startStreak')}
        </p>
      </div>

      {streak > 0 && (
        <div className="flex items-center gap-1 text-orange-500">
          <Flame className="w-5 h-5" />
          <span className="text-sm font-bold">{streak}</span>
        </div>
      )}

      <ChevronRight className="w-5 h-5 text-slate-400" />
    </div>
  )
}
