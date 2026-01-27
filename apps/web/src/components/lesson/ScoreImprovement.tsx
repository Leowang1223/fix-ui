'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Sparkles, Target, RefreshCw } from 'lucide-react'

interface ScoreImprovementProps {
  currentScore: number
  previousScore?: number | null
  attemptNumber: number
  showAnimation?: boolean
}

// 獲取進步鼓勵語
function getImprovementMessage(diff: number, attemptNumber: number): { emoji: string; message: string } {
  if (diff > 20) {
    return { emoji: '🚀', message: '進步超級大！太厲害了！' }
  }
  if (diff > 10) {
    return { emoji: '🎉', message: '進步很多！繼續加油！' }
  }
  if (diff > 5) {
    return { emoji: '👍', message: '有進步！做得好！' }
  }
  if (diff > 0) {
    return { emoji: '💪', message: '小幅進步，保持下去！' }
  }
  if (diff === 0) {
    return { emoji: '🎯', message: '維持水準，試著突破！' }
  }
  if (attemptNumber > 3) {
    return { emoji: '📚', message: '別著急，慢慢來會更好！' }
  }
  return { emoji: '💭', message: '換個方式試試看！' }
}

export function ScoreImprovement({
  currentScore,
  previousScore,
  attemptNumber,
  showAnimation = true,
}: ScoreImprovementProps) {
  const hasPrevious = previousScore !== null && previousScore !== undefined
  const diff = hasPrevious ? currentScore - previousScore : 0
  const improvementMessage = hasPrevious ? getImprovementMessage(diff, attemptNumber) : null

  // 判斷趨勢
  const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'

  return (
    <div className="w-full">
      {/* 嘗試次數 */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <RefreshCw size={14} className="text-gray-400" />
        <span className="text-sm text-gray-500">
          第 {attemptNumber} 次嘗試
        </span>
      </div>

      {/* 分數對比區域 */}
      <div className="flex items-center justify-center gap-4">
        {/* 上次分數 (如果有) */}
        {hasPrevious && (
          <>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">上次</div>
              <div className="text-2xl font-bold text-gray-400">
                {previousScore}
              </div>
            </div>

            {/* 箭頭和差值 */}
            <motion.div
              initial={showAnimation ? { scale: 0, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="flex flex-col items-center"
            >
              {trend === 'up' && (
                <motion.div
                  initial={{ y: 10 }}
                  animate={{ y: 0 }}
                  className="flex items-center gap-1 text-green-500"
                >
                  <TrendingUp size={24} />
                  <span className="font-bold text-lg">+{diff}</span>
                </motion.div>
              )}
              {trend === 'down' && (
                <motion.div
                  initial={{ y: -10 }}
                  animate={{ y: 0 }}
                  className="flex items-center gap-1 text-red-500"
                >
                  <TrendingDown size={24} />
                  <span className="font-bold text-lg">{diff}</span>
                </motion.div>
              )}
              {trend === 'same' && (
                <div className="flex items-center gap-1 text-gray-400">
                  <Minus size={24} />
                  <span className="font-bold text-lg">0</span>
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* 本次分數 */}
        <motion.div
          initial={showAnimation ? { scale: 0.5, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="text-center"
        >
          <div className="text-xs text-gray-500 mb-1">
            {hasPrevious ? '本次' : '分數'}
          </div>
          <div className={`text-4xl font-bold ${
            currentScore >= 90 ? 'text-green-600' :
            currentScore >= 70 ? 'text-blue-600' :
            currentScore >= 50 ? 'text-orange-600' :
            'text-red-600'
          }`}>
            {currentScore}
          </div>
        </motion.div>

        {/* 高分特效 */}
        {currentScore >= 90 && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: 'spring' }}
          >
            <Sparkles size={24} className="text-yellow-500" />
          </motion.div>
        )}
      </div>

      {/* 進步鼓勵語 */}
      {hasPrevious && improvementMessage && (
        <motion.div
          initial={showAnimation ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`mt-4 p-3 rounded-xl text-center ${
            trend === 'up' ? 'bg-green-50' :
            trend === 'down' ? 'bg-orange-50' :
            'bg-gray-50'
          }`}
        >
          <span className="text-xl mr-2">{improvementMessage.emoji}</span>
          <span className={`font-medium ${
            trend === 'up' ? 'text-green-700' :
            trend === 'down' ? 'text-orange-700' :
            'text-gray-700'
          }`}>
            {improvementMessage.message}
          </span>
        </motion.div>
      )}

      {/* 首次嘗試提示 */}
      {!hasPrevious && attemptNumber === 1 && (
        <motion.div
          initial={showAnimation ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-center text-sm text-gray-500"
        >
          <Target size={14} className="inline mr-1" />
          點擊「重試」可以再次練習並看到進步！
        </motion.div>
      )}
    </div>
  )
}

export default ScoreImprovement
