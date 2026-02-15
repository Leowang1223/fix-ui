'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, PhoneOff, Target, CheckCircle2, Circle } from 'lucide-react'
import { type ScenarioCheckpoint } from '@/lib/api'

interface MobileConversationHeaderProps {
  title: string
  subtitle?: string
  scenarioInfo?: {
    title: string
    objective: string
  } | null
  checkpoints?: ScenarioCheckpoint[]
  onEndConversation: () => void
  isLoading?: boolean
}

export function MobileConversationHeader({
  title,
  subtitle,
  scenarioInfo,
  checkpoints,
  onEndConversation,
  isLoading
}: MobileConversationHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const completedCount = checkpoints?.filter(cp => cp.completed).length || 0
  const totalCount = checkpoints?.length || 0
  const hasCheckpoints = totalCount > 0

  return (
    <header className="flex-shrink-0 bg-white/95 backdrop-blur-lg border-b border-slate-200 z-30">
      {/* Main Header Row */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Title & Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {hasCheckpoints && (
              <Target size={16} className="text-purple-500 flex-shrink-0" />
            )}
            <h1 className="text-base font-bold text-slate-900 truncate">
              {scenarioInfo?.title || title}
            </h1>
          </div>

          {/* Mini Progress Bar (when collapsed) */}
          {hasCheckpoints && !isExpanded && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-[120px]">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {completedCount}/{totalCount}
              </span>
            </div>
          )}

          {/* Subtitle for non-scenario */}
          {!hasCheckpoints && subtitle && (
            <p className="text-xs text-slate-500 truncate">{subtitle}</p>
          )}
        </div>

        {/* Right: Expand button & End */}
        <div className="flex items-center gap-2">
          {hasCheckpoints && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}

          <button
            onClick={onEndConversation}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors touch-manipulation"
          >
            <PhoneOff size={14} />
            <span>End</span>
          </button>
        </div>
      </div>

      {/* Expandable Progress Panel */}
      <AnimatePresence>
        {isExpanded && hasCheckpoints && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="px-4 py-3 bg-gradient-to-b from-purple-50 to-white">
              {/* Objective */}
              {scenarioInfo?.objective && (
                <div className="mb-3 p-2 bg-purple-100/50 rounded-lg">
                  <p className="text-xs text-purple-700">
                    <span className="font-semibold">Goal: </span>
                    {scenarioInfo.objective}
                  </p>
                </div>
              )}

              {/* Checkpoints */}
              <div className="space-y-2">
                {checkpoints?.map((checkpoint, index) => (
                  <div
                    key={checkpoint.id}
                    className={`flex items-center gap-2 ${
                      checkpoint.completed ? 'text-green-600' : 'text-slate-500'
                    }`}
                  >
                    {checkpoint.completed ? (
                      <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle size={16} className="text-slate-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${checkpoint.completed ? 'line-through opacity-70' : ''}`}>
                      {checkpoint.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default MobileConversationHeader
