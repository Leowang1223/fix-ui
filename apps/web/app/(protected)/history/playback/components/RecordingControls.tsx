import { AppButton } from '@/components/ui/AppButton'
import { Mic, Play, Square } from 'lucide-react'

/**
 * 錄音控制組件
 * 管理錄音、播放和提交流程
 */

interface RecordingControlsProps {
  isRecording: boolean
  isPlaying: boolean
  audioBlob: Blob | null
  isSubmitting: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onPlayRecording: () => void
}

export function RecordingControls({
  isRecording,
  isPlaying,
  audioBlob,
  isSubmitting,
  onStartRecording,
  onStopRecording,
  onPlayRecording
}: RecordingControlsProps) {
  // 🔍 調試日誌
  console.log('🎙️ RecordingControls 狀態:', {
    isRecording,
    isPlaying,
    hasAudio: !!audioBlob,
    isSubmitting
  })

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Mic className="h-6 w-6" />
        Recording Controls
      </h3>

      <div className="space-y-4">
        {/* 播放錄音 */}
        {audioBlob && (
          <AppButton
            icon={Play}
            onClick={onPlayRecording}
            disabled={isPlaying || isRecording}
            className="max-w-none w-full"
          >
            {isPlaying ? 'Playing…' : 'Listen to My Recording'}
          </AppButton>
        )}

        {/* 錄音按鈕 - 使用 AppButton */}
        {!isRecording ? (
          <AppButton
            icon={Mic}
            onClick={onStartRecording}
            disabled={isSubmitting}
            variant="danger"
            className="max-w-none w-full px-6 py-4"
          >
            Start Recording
          </AppButton>
        ) : (
          <AppButton
            icon={Square}
            onClick={onStopRecording}
            variant="danger"
            className="max-w-none w-full px-6 py-4 animate-pulse"
          >
            Stop Recording
          </AppButton>
        )}

        {isSubmitting && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 mt-2">Scoring your pronunciation...</p>
          </div>
        )}
      </div>
    </div>
  )
}
