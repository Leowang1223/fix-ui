import { type Suggestions } from './types'

interface SuggestionsDisplayProps {
  suggestions?: Suggestions
  detailedSuggestions?: string[]
  overallPractice?: string
}

export function SuggestionsDisplay({ suggestions, detailedSuggestions, overallPractice }: SuggestionsDisplayProps) {
  const dimensions = [
    { key: 'pronunciation', label: 'Pronunciation', color: 'text-blue-600' },
    { key: 'fluency', label: 'Fluency', color: 'text-green-600' },
    { key: 'accuracy', label: 'Accuracy', color: 'text-purple-600' },
    { key: 'comprehension', label: 'Comprehension', color: 'text-orange-600' },
    { key: 'confidence', label: 'Confidence', color: 'text-pink-600' }
  ] as const

  const arraySuggestions = Array.isArray(suggestions) ? suggestions : null
  const dimensionSuggestions = !Array.isArray(suggestions) && suggestions ? suggestions : null
  const hasDimensionSuggestions = !!dimensionSuggestions && Object.values(dimensionSuggestions).some(Boolean)
  const hasArraySuggestions = !!arraySuggestions && arraySuggestions.length > 0
  const hasDetailed = !!detailedSuggestions && detailedSuggestions.length > 0

  if (!hasDimensionSuggestions && !hasArraySuggestions && !hasDetailed && !overallPractice) {
    return null
  }

  return (
    <div className="space-y-3">
      {hasArraySuggestions && (
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <p className="text-sm font-semibold text-indigo-700 mb-3">✨ Overall Suggestions:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            {arraySuggestions!.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {hasDimensionSuggestions && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm font-semibold text-gray-700 mb-3">🎯 Dimension-Specific Suggestions:</p>
          <div className="space-y-2">
            {dimensions.map(({ key, label, color }) => {
              const suggestion = dimensionSuggestions?.[key]
              if (!suggestion) return null
              return (
                <div key={key} className="flex items-start gap-2 text-sm">
                  <span className={`${color} font-medium min-w-[130px]`}>{label}:</span>
                  <span className="text-gray-700 flex-1">{suggestion}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hasDetailed && (
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm font-semibold text-purple-700 mb-3">🧠 Five Detailed Tips:</p>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
            {detailedSuggestions!.slice(0, 5).map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ol>
        </div>
      )}

      {overallPractice && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm font-semibold text-green-700 mb-2">💡 Practice Method:</p>
          <p className="text-sm text-gray-700">{overallPractice}</p>
        </div>
      )}
    </div>
  )
}
