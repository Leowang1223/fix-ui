/**
 * 音效反饋系統
 * 使用 Web Audio API 生成簡單音效
 */

// 設定存儲鍵
const SOUND_ENABLED_KEY = 'soundEffectsEnabled'

// 檢查是否啟用音效
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(SOUND_ENABLED_KEY)
  return stored === null ? true : stored === 'true'
}

// 設定音效開關
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
}

// 切換音效開關
export function toggleSound(): boolean {
  const newState = !isSoundEnabled()
  setSoundEnabled(newState)
  return newState
}

// 創建音頻上下文（延遲初始化）
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch {
      console.warn('Web Audio API not supported')
      return null
    }
  }

  // 恢復暫停的上下文
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }

  return audioContext
}

// 播放音調
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
): void {
  if (!isSoundEnabled()) return

  const ctx = getAudioContext()
  if (!ctx) return

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  // 淡入淡出避免爆音
  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

// 播放多個音調（和弦或序列）
function playTones(
  frequencies: number[],
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.2,
  sequential: boolean = false,
  interval: number = 0.1
): void {
  if (!isSoundEnabled()) return

  frequencies.forEach((freq, index) => {
    const delay = sequential ? index * interval : 0
    setTimeout(() => {
      playTone(freq, duration, type, volume)
    }, delay * 1000)
  })
}

/**
 * 音效 API
 */
export const sounds = {
  /**
   * 成功音效 - 上升和弦
   */
  success() {
    playTones([523.25, 659.25, 783.99], 0.15, 'sine', 0.2, true, 0.08)
  },

  /**
   * 完美音效 - 歡快和弦
   */
  perfect() {
    playTones([523.25, 659.25, 783.99, 1046.50], 0.2, 'sine', 0.25, true, 0.1)
  },

  /**
   * 錯誤音效 - 下降音
   */
  error() {
    playTones([311.13, 261.63], 0.2, 'sine', 0.2, true, 0.1)
  },

  /**
   * 點擊音效 - 短促
   */
  click() {
    playTone(800, 0.05, 'sine', 0.1)
  },

  /**
   * 錄音開始
   */
  recordStart() {
    playTones([440, 554.37], 0.1, 'sine', 0.15, true, 0.05)
  },

  /**
   * 錄音結束
   */
  recordStop() {
    playTones([554.37, 440], 0.1, 'sine', 0.15, true, 0.05)
  },

  /**
   * 通知音
   */
  notification() {
    playTones([659.25, 783.99], 0.15, 'sine', 0.2, true, 0.1)
  },

  /**
   * 解鎖成就
   */
  achievement() {
    playTones([523.25, 659.25, 783.99, 1046.50], 0.2, 'triangle', 0.3, true, 0.12)
  },

  /**
   * 進步音效
   */
  levelUp() {
    playTones([392, 523.25, 659.25, 783.99], 0.15, 'sine', 0.25, true, 0.08)
  },

  /**
   * 倒計時滴答
   */
  tick() {
    playTone(1000, 0.03, 'sine', 0.1)
  },

  /**
   * 根據分數播放音效
   */
  forScore(score: number) {
    if (score >= 95) {
      this.perfect()
    } else if (score >= 80) {
      this.success()
    } else if (score >= 60) {
      this.notification()
    }
    // 低於 60 不播放
  },

  /**
   * 自定義音效
   */
  custom(frequency: number, duration: number = 0.1, type: OscillatorType = 'sine') {
    playTone(frequency, duration, type, 0.2)
  },
}

export default sounds
