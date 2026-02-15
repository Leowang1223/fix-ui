/**
 * 錄音控制 Hook
 * 負責錄音、播放、停止等功能
 */

import { useState, useRef } from 'react'

interface UseAudioRecorderResult {
  isRecording: boolean
  isPlaying: boolean
  audioBlob: Blob | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  playRecording: () => void
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 開始錄音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('無法存取麥克風，請檢查權限設定')
    }
  }

  // 停止錄音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // 播放錄音
  const playRecording = () => {
    if (!audioBlob) return
    
    const audioUrl = URL.createObjectURL(audioBlob)
    if (audioRef.current) {
      audioRef.current.pause()
    }
    
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    
    audio.onended = () => {
      setIsPlaying(false)
      URL.revokeObjectURL(audioUrl)
    }
    
    audio.play()
    setIsPlaying(true)
  }

  return {
    isRecording,
    isPlaying,
    audioBlob,
    startRecording,
    stopRecording,
    playRecording
  }
}
