/**
 * 錯誤畫面組件
 */

interface ErrorScreenProps {
  error: string
  lessonId: string
  stepId: number
  onRetry: () => void
  onBack: () => void
}

export function ErrorScreen({ error, lessonId, stepId, onRetry, onBack }: ErrorScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-6xl mb-4">❓</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Question Not Found</h2>
        <p className="text-gray-600 mb-2">
          {error || 'This question may not have been practiced yet.'}
        </p>
        <div className="text-sm text-gray-500 mb-6">
          <p>Lesson: {lessonId}</p>
          <p>Step: {stepId}</p>
        </div>
        <div className="space-x-3">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ← Back to Playback Practice
          </button>
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    </div>
  )
}
