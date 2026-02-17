/**
 * 單題報表卡片組件
 * 顯示單個題目的完整評分資訊
 */

'use client'

import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'
import { AppButton } from '@/components/ui/AppButton'
import { type StepResult } from './types'
import { ScoreBadge } from './ScoreBadge'
import { DetailedScoresDisplay } from './DetailedScoresDisplay'
import { SuggestionsDisplay } from './SuggestionsDisplay'
import { SHOW_SCORES } from '../../config'

interface QuestionReportCardProps {
  result: StepResult
  index: number
  showTranscript?: boolean
  lessonId?: string  // 🆕 新增：課程 ID
  showRetry?: boolean  // 🆕 新增：是否顯示 Retry 按鈕
}

export function QuestionReportCard({ 
  result, 
  index, 
  showTranscript = true,
  lessonId,
  showRetry = false
}: QuestionReportCardProps) {
  const router = useRouter()
  const t = useTranslations('report')
  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gray-50">
      {/* 題目標題和分數 */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-lg mb-2">
            {t('question')} {index + 1}: {result.question.replace(/\([^)]*\)/g, '').trim()}
          </p>
          {showTranscript && result.transcript && (
            <p className="text-sm text-blue-600 mb-2">
              🎤 {t('yourResponse')}: "{result.transcript}"
            </p>
          )}
        </div>
        {SHOW_SCORES && (
          <div className="text-right">
            <ScoreBadge score={result.score} size="lg" />
          </div>
        )}
      </div>
      
      {/* 狀態資訊 */}
      <div className="flex gap-4 text-sm text-gray-600 mb-4">
        <span>🎯 {t('attempts')}: {result.attempts}</span>
        {SHOW_SCORES && (
          <span>
            {result.score >= 90 ? `✅ ${t('excellentPerformance')}` :
             result.score >= 75 ? `✅ ${t('passed')}` :
             `❌ ${t('needsMorePractice')}`}
          </span>
        )}
      </div>

      {/* 🆕 錯誤字和拼音糾正 */}
      {result.errors && result.errors.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500 mb-4">
          <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
            <span className="text-lg">🚨</span>
            {t('charErrors')} ({result.errors.length})
          </h4>
          <div className="space-y-2">
            {result.errors.slice(0, 5).map((error, idx) => (
              <div key={idx} className="bg-white rounded p-3 text-sm">
                {error.type === 'wrong' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-bold">{t('position')} {error.position + 1}:</span>
                      <span className="text-gray-700">{t('charErrors')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-red-100 rounded p-2">
                        <div className="text-xs text-red-700 font-semibold mb-1">❌ {t('youSaid')}:</div>
                        <div className="text-lg font-bold text-red-800">{error.actual}</div>
                        {error.actualPinyin && (
                          <div className="text-xs text-red-600 mt-1">{error.actualPinyin}</div>
                        )}
                      </div>
                      <div className="bg-green-100 rounded p-2">
                        <div className="text-xs text-green-700 font-semibold mb-1">✅ {t('shouldBe')}:</div>
                        <div className="text-lg font-bold text-green-800">{error.expected}</div>
                        {error.expectedPinyin && (
                          <div className="text-xs text-green-600 mt-1">{error.expectedPinyin}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {error.type === 'missing' && (
                  <div>
                    <span className="text-orange-600 font-bold">{t('position')} {error.position + 1}:</span>
                    <span className="text-gray-700"> {t('missingChar')} </span>
                    <span className="bg-green-100 px-2 py-1 rounded text-green-800 font-bold">{error.expected}</span>
                    {error.expectedPinyin && (
                      <span className="text-xs text-green-600 ml-2">({error.expectedPinyin})</span>
                    )}
                  </div>
                )}
                {error.type === 'extra' && (
                  <div>
                    <span className="text-purple-600 font-bold">{t('position')} {error.position + 1}:</span>
                    <span className="text-gray-700"> {t('extraChar')} </span>
                    <span className="bg-red-100 px-2 py-1 rounded text-red-800 font-bold">{error.actual}</span>
                  </div>
                )}
              </div>
            ))}
            {result.errors.length > 5 && (
              <div className="text-xs text-gray-500 italic text-center pt-2">
                ... and {result.errors.length - 5} more errors
              </div>
            )}
          </div>
        </div>
      )}

      {/* 糾正建議 */}
      {result.correctionFeedback && (
        <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400 mb-4">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span>
            {t('correctionTips')}:
          </h4>
          <p className="text-sm text-yellow-900 whitespace-pre-wrap">{result.correctionFeedback}</p>
        </div>
      )}

      {/* 語音辨識的讀錯字 */}
      {result.mispronounced && result.mispronounced.length > 0 && (
        <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-400 mb-4">
          <h4 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
            <span className="text-lg">🔈</span>
            {t('mispronounced')}:
          </h4>
          <div className="space-y-2">
            {result.mispronounced.map((item, idx) => (
              <div key={idx} className="bg-white rounded p-3 text-sm border border-orange-100">
                <div className="flex items-center gap-2 text-gray-900">
                  <span className="text-xl font-bold text-orange-600">{item.text}</span>
                  {item.pinyin && <span className="text-xs text-gray-500">({item.pinyin})</span>}
                </div>
                {item.issue && <p className="text-xs text-gray-600 mt-1">Issue: {item.issue}</p>}
                {item.tip && <p className="text-xs text-gray-600 mt-0.5">Tip: {item.tip}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 詳細評分 */}
      {SHOW_SCORES && result.detailedScores && (
        <div className="bg-white rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('detailedScores')}:</h4>
          <DetailedScoresDisplay scores={result.detailedScores} layout="horizontal" />
        </div>
      )}

      {/* 建議（新版格式） */}
      {(result.suggestions || result.detailedSuggestions || result.overallPractice) && (
        <SuggestionsDisplay 
          suggestions={result.suggestions}
          detailedSuggestions={result.detailedSuggestions}
          overallPractice={result.overallPractice}
        />
      )}

      {/* 舊版建議（向後兼容） */}
      {!result.suggestions && result.feedback && (
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 {t('aiFeedback')}:</h4>
          <p className="text-sm text-blue-700">{result.feedback}</p>
        </div>
      )}

      {/* 🆕 Retry 按鈕 */}
      {showRetry && lessonId && (
        <AppButton
          icon={RefreshCw}
          onClick={() => router.push(`/history/playback/${lessonId}/${result.stepId}`)}
          className="mt-4"
        >
          {t('retryQuestion')}
        </AppButton>
      )}
    </div>
  )
}
