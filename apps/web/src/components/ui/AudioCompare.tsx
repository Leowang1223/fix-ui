'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  User,
  Mic,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface AudioCompareProps {
  userAudioUrl?: string        // 用戶錄音 URL
  referenceAudioUrl?: string   // 參考音頻 URL (TTS)
  referenceText?: string       // 參考文字 (用於顯示)
  userTranscript?: string      // 用戶辨識結果
  onPlayReference?: () => void // 播放參考音頻回調
  onPlayUser?: () => void      // 播放用戶錄音回調
  compact?: boolean
}

type PlayingState = 'none' | 'reference' | 'user'

export function AudioCompare({
  userAudioUrl,
  referenceAudioUrl,
  referenceText,
  userTranscript,
  onPlayReference,
  onPlayUser,
  compact = false,
}: AudioCompareProps) {
  const [playing, setPlaying] = useState<PlayingState>('none')
  const [progress, setProgress] = useState({ reference: 0, user: 0 })
  const referenceAudioRef = useRef<HTMLAudioElement | null>(null)
  const userAudioRef = useRef<HTMLAudioElement | null>(null)

  // 初始化音頻元素
  useEffect(() => {
    if (referenceAudioUrl) {
      referenceAudioRef.current = new Audio(referenceAudioUrl)
      referenceAudioRef.current.onended = () => setPlaying('none')
      referenceAudioRef.current.ontimeupdate = () => {
        if (referenceAudioRef.current) {
          const p = (referenceAudioRef.current.currentTime / referenceAudioRef.current.duration) * 100
          setProgress(prev => ({ ...prev, reference: p }))
        }
      }
    }

    if (userAudioUrl) {
      userAudioRef.current = new Audio(userAudioUrl)
      userAudioRef.current.onended = () => setPlaying('none')
      userAudioRef.current.ontimeupdate = () => {
        if (userAudioRef.current) {
          const p = (userAudioRef.current.currentTime / userAudioRef.current.duration) * 100
          setProgress(prev => ({ ...prev, user: p }))
        }
      }
    }

    return () => {
      referenceAudioRef.current?.pause()
      userAudioRef.current?.pause()
    }
  }, [referenceAudioUrl, userAudioUrl])

  // 播放參考音頻
  const playReference = useCallback(() => {
    userAudioRef.current?.pause()

    if (playing === 'reference') {
      referenceAudioRef.current?.pause()
      setPlaying('none')
    } else {
      if (onPlayReference) {
        onPlayReference()
        setPlaying('reference')
        // 模擬播放結束
        setTimeout(() => setPlaying('none'), 2000)
      } else if (referenceAudioRef.current) {
        referenceAudioRef.current.currentTime = 0
        referenceAudioRef.current.play()
        setPlaying('reference')
      }
    }
  }, [playing, onPlayReference])

  // 播放用戶錄音
  const playUser = useCallback(() => {
    referenceAudioRef.current?.pause()

    if (playing === 'user') {
      userAudioRef.current?.pause()
      setPlaying('none')
    } else {
      if (onPlayUser) {
        onPlayUser()
        setPlaying('user')
        setTimeout(() => setPlaying('none'), 2000)
      } else if (userAudioRef.current) {
        userAudioRef.current.currentTime = 0
        userAudioRef.current.play()
        setPlaying('user')
      }
    }
  }, [playing, onPlayUser])

  // 快速切換播放
  const toggleBetween = useCallback(() => {
    if (playing === 'none' || playing === 'user') {
      playReference()
    } else {
      playUser()
    }
  }, [playing, playReference, playUser])

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* 參考音頻按鈕 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={playReference}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
            ${playing === 'reference'
              ? 'bg-blue-500 text-white'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }
          `}
        >
          <Volume2 className="w-4 h-4" />
          <span>標準</span>
        </motion.button>

        {/* 用戶錄音按鈕 */}
        {(userAudioUrl || onPlayUser) && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={playUser}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              ${playing === 'user'
                ? 'bg-green-500 text-white'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
              }
            `}
          >
            <Mic className="w-4 h-4" />
            <span>我的</span>
          </motion.button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      {/* 對比面板 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* 參考音頻 */}
        <AudioPanel
          type="reference"
          label="標準發音"
          text={referenceText}
          isPlaying={playing === 'reference'}
          progress={progress.reference}
          onPlay={playReference}
          icon={<Volume2 className="w-5 h-5" />}
          color="blue"
        />

        {/* 用戶錄音 */}
        <AudioPanel
          type="user"
          label="我的發音"
          text={userTranscript}
          isPlaying={playing === 'user'}
          progress={progress.user}
          onPlay={playUser}
          icon={<User className="w-5 h-5" />}
          color="green"
          disabled={!userAudioUrl && !onPlayUser}
        />
      </div>

      {/* 快速切換控制 */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={playReference}
          className={`p-2 rounded-full transition-colors ${
            playing === 'reference' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleBetween}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-green-500 text-white flex items-center justify-center shadow-lg"
        >
          <RotateCcw className="w-6 h-6" />
        </motion.button>

        <button
          onClick={playUser}
          disabled={!userAudioUrl && !onPlayUser}
          className={`p-2 rounded-full transition-colors ${
            playing === 'user'
              ? 'bg-green-100 text-green-600'
              : !userAudioUrl && !onPlayUser
                ? 'text-gray-200 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-2">
        點擊中間按鈕快速切換對比
      </p>
    </div>
  )
}

// 單個音頻面板
interface AudioPanelProps {
  type: 'reference' | 'user'
  label: string
  text?: string
  isPlaying: boolean
  progress: number
  onPlay: () => void
  icon: React.ReactNode
  color: 'blue' | 'green'
  disabled?: boolean
}

function AudioPanel({
  label,
  text,
  isPlaying,
  progress,
  onPlay,
  icon,
  color,
  disabled = false,
}: AudioPanelProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      activeBorder: 'border-blue-400',
      text: 'text-blue-600',
      progress: 'bg-blue-500',
      button: 'bg-blue-500 hover:bg-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      activeBorder: 'border-green-400',
      text: 'text-green-600',
      progress: 'bg-green-500',
      button: 'bg-green-500 hover:bg-green-600',
    },
  }

  const colors = colorClasses[color]

  return (
    <motion.div
      animate={{
        scale: isPlaying ? 1.02 : 1,
        borderColor: isPlaying ? (color === 'blue' ? '#60a5fa' : '#4ade80') : '#e5e7eb',
      }}
      className={`
        ${colors.bg} rounded-xl p-4 border-2 transition-colors
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      {/* 標籤 */}
      <div className="flex items-center gap-2 mb-2">
        <span className={colors.text}>{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>

      {/* 文字顯示 */}
      {text && (
        <p className="text-gray-800 font-medium mb-3 line-clamp-2">{text}</p>
      )}

      {/* 播放按鈕與進度 */}
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={disabled ? {} : { scale: 1.1 }}
          whileTap={disabled ? {} : { scale: 0.9 }}
          onClick={onPlay}
          disabled={disabled}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center text-white
            ${disabled ? 'bg-gray-300 cursor-not-allowed' : colors.button}
          `}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </motion.button>

        {/* 進度條 */}
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${colors.progress}`}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* 播放動畫 */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-1 mt-3"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{
                  height: [4, 16, 8, 20, 4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                className={`w-1 rounded-full ${colors.progress}`}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// 快速重播按鈕（用於列表項）
interface QuickReplayButtonProps {
  onPlay: () => void
  isPlaying?: boolean
  label?: string
  size?: 'sm' | 'md'
}

export function QuickReplayButton({
  onPlay,
  isPlaying = false,
  label = '重播',
  size = 'md',
}: QuickReplayButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onPlay}
      className={`
        ${sizeClasses[size]} rounded-full flex items-center justify-center
        ${isPlaying
          ? 'bg-blue-500 text-white'
          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
        }
      `}
      title={label}
    >
      {isPlaying ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4 ml-0.5" />
      )}
    </motion.button>
  )
}

// 歷史錄音列表項
interface RecordingHistoryItemProps {
  date: string
  score: number
  transcript?: string
  onPlayUser?: () => void
  onPlayReference?: () => void
  isPlaying?: boolean
}

export function RecordingHistoryItem({
  date,
  score,
  transcript,
  onPlayUser,
  onPlayReference,
  isPlaying = false,
}: RecordingHistoryItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-100"
    >
      {/* 分數 */}
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg
        ${score >= 80 ? 'bg-green-100 text-green-600' :
          score >= 60 ? 'bg-yellow-100 text-yellow-600' :
          'bg-red-100 text-red-600'}
      `}>
        {score}
      </div>

      {/* 內容 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{date}</p>
        {transcript && (
          <p className="text-gray-800 font-medium truncate">{transcript}</p>
        )}
      </div>

      {/* 播放按鈕 */}
      <div className="flex items-center gap-2">
        {onPlayReference && (
          <QuickReplayButton
            onPlay={onPlayReference}
            label="播放標準"
            size="sm"
          />
        )}
        {onPlayUser && (
          <QuickReplayButton
            onPlay={onPlayUser}
            isPlaying={isPlaying}
            label="播放我的"
            size="sm"
          />
        )}
      </div>
    </motion.div>
  )
}

export default AudioCompare
