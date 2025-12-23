'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { type ScenarioCheckpoint } from '@/lib/api'

interface ProgressTrackerProps {
  checkpoints: ScenarioCheckpoint[]
  objective: string
  scenarioTitle: string
}

export default function ProgressTracker({ checkpoints, objective, scenarioTitle }: ProgressTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const completedCount = checkpoints.filter(cp => cp.completed).length
  const totalCount = checkpoints.length
  const progressPercent = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-sm">{scenarioTitle}</h3>
          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-500 w-10 text-right">{progressPercent}%</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t pt-3">
          {/* Objective */}
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs font-semibold text-blue-900 mb-1">OBJECTIVE</div>
            <div className="text-xs text-blue-800">{objective}</div>
          </div>

          {/* Checkpoints List */}
          <div className="space-y-2">
            {checkpoints.map((checkpoint, idx) => (
              <div
                key={checkpoint.id}
                className={`flex items-start gap-2 p-2 rounded transition ${
                  checkpoint.completed
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    checkpoint.completed
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {checkpoint.completed ? '✓' : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium ${checkpoint.completed ? 'text-green-900' : 'text-gray-700'}`}>
                    {checkpoint.chineseDescription}
                  </div>
                  <div className={`text-xs mt-0.5 ${checkpoint.completed ? 'text-green-600' : 'text-gray-500'}`}>
                    {checkpoint.description}
                  </div>
                  {checkpoint.completedAt && (
                    <div className="text-xs text-green-600 mt-0.5 font-medium">
                      ✓ {new Date(checkpoint.completedAt).toLocaleTimeString('zh-TW', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Completion Message */}
          {completedCount === totalCount && (
            <div className="mt-3 p-2 bg-gradient-to-r from-green-50 to-blue-50 border border-green-300 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎉</span>
                <div>
                  <div className="font-bold text-xs text-green-900">All checkpoints completed!</div>
                  <div className="text-xs text-green-700">You may naturally end the conversation</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
