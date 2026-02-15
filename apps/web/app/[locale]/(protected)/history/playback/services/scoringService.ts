/**
 * 評分服務
 * 負責將錄音送至後端進行評分
 */

import { addPlaybackAttempt, type PlaybackAttempt } from '../../utils/playbackStorage'
import { API_BASE } from '../../../config'

export interface ScoringRequest {
  audioBlob: Blob
  lessonId: string
  stepId: number
  expectedAnswer: string | string[]
}

export interface ScoringResult {
  overall_score: number
  scores: {
    pronunciation: number
    fluency: number
    accuracy: number
    comprehension: number
    confidence: number
  }
  suggestions?: {
    pronunciation?: string
    fluency?: string
    accuracy?: string
    comprehension?: string
    confidence?: string
  }
  overallPractice?: string
  transcript?: string
}

export class ScoringService {
  /**
   * 送出錄音進行評分
   */
  static async submitForScoring(request: ScoringRequest): Promise<PlaybackAttempt> {
    const { audioBlob, lessonId, stepId, expectedAnswer } = request

    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('expectedAnswer', JSON.stringify(
      Array.isArray(expectedAnswer) ? expectedAnswer : [expectedAnswer]
    ))
    formData.append('questionId', stepId.toString())
    formData.append('lessonId', lessonId)

    const scoreLocale = typeof document !== 'undefined'
      ? (document.cookie.match(/NEXT_LOCALE=(\w+)/)?.[1] || document.documentElement.lang || 'en')
      : 'en'
    const response = await fetch(`${API_BASE}/api/score`, {
      method: 'POST',
      headers: { 'Accept-Language': scoreLocale },
      body: formData
    })

    if (!response.ok) {
      throw new Error('Scoring failed')
    }

    const result: ScoringResult = await response.json()

    // 將 Blob 轉換為 Base64
    const audioBase64 = await this.blobToBase64(audioBlob)

    const attempt: PlaybackAttempt = {
      attemptId: `${Date.now()}-${stepId}`,
      timestamp: new Date().toISOString(),
      audioBase64,
      score: result.overall_score || 0,
      detailedScores: result.scores || {
        pronunciation: 0,
        fluency: 0,
        accuracy: 0,
        comprehension: 0,
        confidence: 0
      },
      suggestions: result.suggestions,
      overallPractice: result.overallPractice,
      transcript: result.transcript
    }

    // 儲存到 localStorage
    addPlaybackAttempt(lessonId, stepId, attempt)

    return attempt
  }

  /**
   * 將 Blob 轉換為 Base64
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }
}
