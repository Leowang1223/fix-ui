/**
 * 課程報表組件
 * 顯示完整課程的評分報表
 */

import { type LessonReport } from './types'
import { ScoreBadge } from './ScoreBadge'
import { QuestionReportCard } from './QuestionReportCard'
import { SHOW_SCORES } from '../../config'

interface LessonReportDisplayProps {
  report: LessonReport
  showTranscript?: boolean
  showHeader?: boolean
  showRetry?: boolean  // 🆕 新增：是否顯示 Retry 按鈕
}

export function LessonReportDisplay({ 
  report, 
  showTranscript = true,
  showHeader = true,
  showRetry = false  // 🆕 新增：預設不顯示
}: LessonReportDisplayProps) {
  // 計算各等級人數
  const excellentCount = report.results.filter(r => r.score >= 90).length
  const goodCount = report.results.filter(r => r.score >= 75 && r.score < 90).length
  const needsPracticeCount = report.results.filter(r => r.score < 75).length

  return (
    <div className="space-y-6">
      {/* 課程標題（可選） */}
      {showHeader && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">{report.lessonTitle}</h2>
          <p className="text-blue-100">
            Completed: {new Date(report.completedAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* 總分卡片（依設定顯示/隱藏） */}
      {SHOW_SCORES && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">📊 Overall Performance</h3>
          
          <div className="flex items-center justify-center mb-8">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Total Score</div>
              <ScoreBadge score={report.totalScore} size="lg" showLabel={false} />
              <div className="text-2xl font-bold text-gray-400 mt-1">/ 100</div>
            </div>
          </div>

          {/* 分數分佈 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{excellentCount}</div>
              <div className="text-sm text-gray-700">Excellent (90-100)</div>
            </div>
            <div className="text-center p-4 bg-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{goodCount}</div>
              <div className="text-sm text-gray-700">Good (75-89)</div>
            </div>
            <div className="text-center p-4 bg-orange-100 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{needsPracticeCount}</div>
              <div className="text-sm text-gray-700">Needs Practice (0-74)</div>
            </div>
          </div>
        </div>
      )}

      {/* 逐題分析 */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800">Question-by-Question Analysis</h3>
        {report.results.map((result, index) => (
          <QuestionReportCard
            key={result.stepId}
            result={result}
            index={index}
            showTranscript={showTranscript}
            lessonId={report.lessonId}  // 🆕 傳遞 lessonId
            showRetry={showRetry}       // 🆕 傳遞 showRetry
          />
        ))}
      </div>
    </div>
  )
}
