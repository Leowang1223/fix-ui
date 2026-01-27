'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, AlertTriangle, CheckCircle } from 'lucide-react'

type ErrorType = 'tone' | 'pronunciation' | 'missing' | 'extra'

interface SyllableCorrectionCardProps {
  userSyllable: string       // 用戶說的
  correctSyllable: string    // 正確的
  userPinyin?: string        // 用戶的拼音
  correctPinyin?: string     // 正確的拼音
  errorType: ErrorType       // 錯誤類型
  onPlayCorrect?: () => void // 播放正確發音
}

const ERROR_TYPE_CONFIG: Record<ErrorType, { label: string; color: string; bgColor: string; tip: string }> = {
  tone: {
    label: '聲調',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    tip: '注意聲調的升降變化',
  },
  pronunciation: {
    label: '發音',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    tip: '注意口型和舌位',
  },
  missing: {
    label: '漏字',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    tip: '記得把每個字都說出來',
  },
  extra: {
    label: '多餘',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    tip: '這個字不需要說',
  },
}

// 聲調提示
const TONE_TIPS: Record<string, string> = {
  '1': '第一聲：高平調，保持高音平穩',
  '2': '第二聲：上升調，像問句一樣往上揚',
  '3': '第三聲：降升調，先降後升，像嘆氣後又好奇',
  '4': '第四聲：下降調，快速往下，像生氣時說「不！」',
  '5': '輕聲：輕輕帶過，不需要太用力',
}

export function SyllableCorrectionCard({
  userSyllable,
  correctSyllable,
  userPinyin,
  correctPinyin,
  errorType,
  onPlayCorrect,
}: SyllableCorrectionCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const config = ERROR_TYPE_CONFIG[errorType]

  // 提取聲調數字
  const correctTone = correctPinyin?.match(/[1-5]/)?.[0]
  const toneTip = correctTone ? TONE_TIPS[correctTone] : null

  const handlePlay = () => {
    if (onPlayCorrect) {
      setIsPlaying(true)
      onPlayCorrect()
      setTimeout(() => setIsPlaying(false), 1000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
    >
      {/* 對比區域 */}
      <div className="flex items-center justify-between gap-4">
        {/* 左側：用戶說的 */}
        <div className="flex-1 text-center">
          <div className="text-xs text-gray-500 mb-1">你說的</div>
          <div className="text-2xl font-bold text-gray-400 line-through">
            {userSyllable || '—'}
          </div>
          {userPinyin && (
            <div className="text-sm text-gray-400 mt-1">{userPinyin}</div>
          )}
        </div>

        {/* 中間：箭頭 */}
        <div className="flex flex-col items-center">
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-2xl text-blue-500"
          >
            →
          </motion.div>
        </div>

        {/* 右側：正確的 */}
        <div className="flex-1 text-center">
          <div className="text-xs text-gray-500 mb-1">正確的</div>
          <div className="text-2xl font-bold text-green-600">
            {correctSyllable}
          </div>
          {correctPinyin && (
            <div className="text-sm text-green-600 mt-1">{correctPinyin}</div>
          )}
        </div>

        {/* 播放按鈕 */}
        {onPlayCorrect && (
          <motion.button
            onClick={handlePlay}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              transition-colors
              ${isPlaying
                ? 'bg-blue-500 text-white'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }
            `}
            title="播放正確發音"
          >
            <Volume2 size={18} className={isPlaying ? 'animate-pulse' : ''} />
          </motion.button>
        )}
      </div>

      {/* 錯誤類型標籤 */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
          <AlertTriangle size={12} />
          {config.label}錯誤
        </span>
      </div>

      {/* 改進提示 */}
      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div className="text-sm text-gray-700">
            <div className="font-medium mb-1">改進提示：</div>
            <div className="text-gray-600">
              {errorType === 'tone' && toneTip ? toneTip : config.tip}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default SyllableCorrectionCard
