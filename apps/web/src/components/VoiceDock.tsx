'use client'

import { Mic, MicOff, Camera, CameraOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useMediaSession } from '@/lib/media/MediaSessionProvider'

export default function VoiceDock() {
  const {
    stream, ensureStream,
    audioEnabled, videoEnabled,
    setAudioEnabled, setVideoEnabled,
    toggleAudio, toggleVideo
  } = useMediaSession()

  const [meter, setMeter] = useState(0)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 準備頁載入即一次取權限（預設全開）
  useEffect(() => {
    ensureStream().catch(err => {
      const e = err as Error
      console.error('Failed to get media stream:', e)
    })
  }, [ensureStream])

  // 真實麥克風電平（Web Audio）
  useEffect(() => {
    if (!stream || !audioEnabled) return
    const track = stream.getAudioTracks()[0]
    if (!track) return

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const src = ctx.createMediaStreamSource(new MediaStream([track]))
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    src.connect(analyser)

    const data = new Uint8Array(analyser.frequencyBinCount)
    let raf = 0
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      setMeter(Math.min(100, Math.max(0, rms * 200)))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); src.disconnect(); ctx.close() }
  }, [stream, audioEnabled])

  return (
    <div className={`fixed bottom-20 lg:bottom-6 right-6 z-40 flex flex-col gap-3 items-end transition-all duration-300 ${
      isCollapsed ? 'translate-x-4' : 'translate-x-0'
    }`}>
      {/* 縮放控制按鈕 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 z-[60] bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors ${
          isCollapsed ? 'right-2' : '-left-5'
        }`}
        title={isCollapsed ? '展開' : '收縮'}
      >
        {isCollapsed ? <ChevronLeft className="w-4 h-4 text-gray-700" /> : <ChevronRight className="w-4 h-4 text-gray-700" />}
      </button>

      {/* 控制按鈕組（無視訊預覽） */}
      <div className={`bg-white rounded-lg shadow-lg border border-gray-200 p-3 transition-all duration-300 ${
        isCollapsed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}>
        <div className="flex items-center gap-3">
          {/* 麥克風 */}
          <div className="text-center">
            <button
              onClick={toggleAudio}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                audioEnabled ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title={audioEnabled ? '點擊靜音' : '點擊啟用麥克風'}
            >
              {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            {audioEnabled && (
              <div className="mt-1 w-16">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-red-500 h-1 rounded-full transition-all duration-100" style={{ width: `${meter}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* 相機 */}
          <div className="text-center">
            <button
              onClick={toggleVideo}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                videoEnabled ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title={videoEnabled ? '點擊關閉相機' : '點擊開啟相機'}
            >
              {videoEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
