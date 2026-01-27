'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Map, Flag, Star, Lock, Check, ChevronRight,
  Trophy, Sparkles, Target, Calendar, Settings
} from 'lucide-react'
import { useLearningPath, type LearningMilestone, type LearningPathConfig, type SkillLevel } from '@/hooks/useLearningPath'

// Milestone node on the path
function MilestoneNode({
  milestone,
  index,
  progress,
  isActive,
  isCurrent
}: {
  milestone: LearningMilestone
  index: number
  progress: number
  isActive: boolean
  isCurrent: boolean
}) {
  const isCompleted = milestone.isCompleted
  const isLocked = !isActive && !isCompleted

  return (
    <div className="flex flex-col items-center">
      {/* Node */}
      <motion.div
        className={`
          relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-md
          ${isCompleted
            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
            : isCurrent
              ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white ring-4 ring-blue-200'
              : isLocked
                ? 'bg-slate-200 text-slate-400'
                : 'bg-white text-slate-600 border-2 border-slate-300'
          }
        `}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.1 }}
        whileHover={!isLocked ? { scale: 1.1 } : {}}
      >
        {isCompleted ? (
          <Check className="w-6 h-6" />
        ) : isLocked ? (
          <Lock className="w-5 h-5" />
        ) : isCurrent ? (
          <Star className="w-6 h-6" fill="currentColor" />
        ) : (
          <span className="text-sm font-bold">{index + 1}</span>
        )}

        {/* Progress ring for current */}
        {isCurrent && !isCompleted && (
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              stroke="#93c5fd"
              strokeWidth="3"
              fill="none"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="45%"
              stroke="#3b82f6"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 180 }}
              animate={{ strokeDashoffset: 180 - (180 * progress) / 100 }}
              strokeDasharray="180"
            />
          </svg>
        )}
      </motion.div>

      {/* Label */}
      <div className={`mt-2 text-center ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-slate-500'}`}>
        <p className="text-[10px] sm:text-xs font-semibold">{milestone.titleZh}</p>
        {isCurrent && (
          <p className="text-[9px] sm:text-[10px] text-blue-500">{progress}%</p>
        )}
      </div>
    </div>
  )
}

// Path connector line
function PathConnector({ isCompleted }: { isCompleted: boolean }) {
  return (
    <div className="flex-1 h-1 mx-1 sm:mx-2 rounded-full bg-slate-200 overflow-hidden">
      {isCompleted && (
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.5 }}
        />
      )}
    </div>
  )
}

// Settings modal for learning path
function PathSettingsModal({
  isOpen,
  onClose,
  config,
  onSave,
  skillLevels,
  skillLevelNames
}: {
  isOpen: boolean
  onClose: () => void
  config: LearningPathConfig
  onSave: (config: Partial<LearningPathConfig>) => void
  skillLevels: SkillLevel[]
  skillLevelNames: Record<SkillLevel, { en: string; zh: string }>
}) {
  const [localConfig, setLocalConfig] = useState(config)

  const handleSave = () => {
    onSave(localConfig)
    onClose()
  }

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
            <h2 className="text-lg font-bold text-slate-900">Learning Path Settings</h2>
            <p className="text-sm text-slate-500 mt-1">Customize your learning journey</p>
          </div>

          <div className="p-5 space-y-5">
            {/* Target Level */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Target Level</label>
              <div className="grid grid-cols-3 gap-2">
                {skillLevels.map(level => (
                  <button
                    key={level}
                    onClick={() => setLocalConfig(prev => ({ ...prev, targetLevel: level }))}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      localConfig.targetLevel === level
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {skillLevelNames[level].zh}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Goal */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Weekly Lesson Goal</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={14}
                  value={localConfig.weeklyLessonGoal}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, weeklyLessonGoal: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <span className="w-12 text-center text-sm font-bold text-slate-900">
                  {localConfig.weeklyLessonGoal}/week
                </span>
              </div>
            </div>

            {/* Focus Areas */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Focus Areas</label>
              <div className="flex flex-wrap gap-2">
                {['speaking', 'listening', 'reading', 'vocabulary', 'grammar'].map(area => (
                  <button
                    key={area}
                    onClick={() => {
                      setLocalConfig(prev => ({
                        ...prev,
                        focusAreas: prev.focusAreas.includes(area)
                          ? prev.focusAreas.filter(a => a !== area)
                          : [...prev.focusAreas, area]
                      }))
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      localConfig.focusAreas.includes(area)
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
                    }`}
                  >
                    {area.charAt(0).toUpperCase() + area.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function LearningPathCard() {
  const {
    data,
    isLoading,
    updateConfig,
    getCurrentMilestone,
    getMilestoneProgress,
    getOverallProgress,
    getEstimatedCompletion,
    SKILL_LEVELS,
    SKILL_LEVEL_NAMES
  } = useLearningPath()

  const [showSettings, setShowSettings] = useState(false)

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl bg-white/70 border border-white/50 p-5 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="h-20 bg-slate-200 rounded" />
      </div>
    )
  }

  const currentMilestone = getCurrentMilestone()
  const currentProgress = currentMilestone ? getMilestoneProgress(currentMilestone) : 0
  const overallProgress = getOverallProgress()
  const estimatedCompletion = getEstimatedCompletion()

  return (
    <>
      <motion.div
        className="rounded-2xl bg-white/70 border border-white/50 p-5 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Map className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Learning Path</h3>
              <p className="text-xs text-slate-500">
                Target: {SKILL_LEVEL_NAMES[data.config.targetLevel].zh}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors touch-manipulation"
          >
            <Settings className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Overall Progress */}
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-700">Overall Progress</span>
            <span className="text-xs font-bold text-indigo-700">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {estimatedCompletion && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-indigo-600">
              <Calendar className="w-3 h-3" />
              <span>Est. completion: {estimatedCompletion}</span>
            </div>
          )}
        </div>

        {/* Path Visualization */}
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="flex items-center min-w-max py-2">
            {data.milestones.map((milestone, index) => {
              const isCompleted = milestone.isCompleted
              const isCurrent = index === data.currentMilestoneIndex
              const isActive = index <= data.currentMilestoneIndex
              const progress = isCurrent ? currentProgress : isCompleted ? 100 : 0

              return (
                <div key={milestone.id} className="flex items-center">
                  <MilestoneNode
                    milestone={milestone}
                    index={index}
                    progress={progress}
                    isActive={isActive}
                    isCurrent={isCurrent}
                  />
                  {index < data.milestones.length - 1 && (
                    <PathConnector isCompleted={isCompleted} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Current Milestone Info */}
        {currentMilestone && (
          <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-blue-800">{currentMilestone.titleZh}</p>
                <p className="text-xs text-blue-600 mt-0.5">{currentMilestone.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-blue-700">
                  <span>{data.progress.totalLessonsCompleted}/{currentMilestone.requiredLessons} lessons</span>
                  <span>{data.progress.totalVocabLearned}/{currentMilestone.requiredVocab} vocab</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Settings Modal */}
      <PathSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={data.config}
        onSave={updateConfig}
        skillLevels={SKILL_LEVELS}
        skillLevelNames={SKILL_LEVEL_NAMES}
      />
    </>
  )
}

// Compact version
export function LearningPathMini() {
  const { data, isLoading, getOverallProgress, SKILL_LEVEL_NAMES } = useLearningPath()

  if (isLoading || !data) {
    return <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
  }

  const progress = getOverallProgress()

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50">
      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{progress}%</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-indigo-700">Learning Path</p>
        <p className="text-xs text-indigo-500">
          Target: {SKILL_LEVEL_NAMES[data.config.targetLevel].zh}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-indigo-400" />
    </div>
  )
}
