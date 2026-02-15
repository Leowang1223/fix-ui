/**
 * 詳細分數組件
 * 顯示五個維度的詳細分數
 */

import { type DetailedScores } from './types'

interface DetailedScoresDisplayProps {
  scores: DetailedScores
  layout?: 'horizontal' | 'vertical'
}

export function DetailedScoresDisplay({ scores, layout = 'horizontal' }: DetailedScoresDisplayProps) {
  const dimensions = [
    { key: 'pronunciation', label: 'Pronunciation', color: 'text-blue-600' },
    { key: 'fluency', label: 'Fluency', color: 'text-green-600' },
    { key: 'accuracy', label: 'Accuracy', color: 'text-purple-600' },
    { key: 'comprehension', label: 'Comprehension', color: 'text-orange-600' },
    { key: 'confidence', label: 'Confidence', color: 'text-pink-600' }
  ] as const

  if (layout === 'vertical') {
    return (
      <div className="space-y-2">
        {dimensions.map(({ key, label, color }) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{label}:</span>
            <span className={`text-lg font-bold ${color}`}>
              {scores[key]}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-5 gap-3">
      {dimensions.map(({ key, label, color }) => (
        <div key={key} className="text-center">
          <div className="text-xs text-gray-500 mb-1">{label}</div>
          <div className={`text-lg font-bold ${color}`}>
            {scores[key]}
          </div>
        </div>
      ))}
    </div>
  )
}
