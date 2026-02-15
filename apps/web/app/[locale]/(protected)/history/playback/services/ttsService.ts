/**
 * TTS 語音合成服務
 * 負責播放題目的中文語音
 */

export class TTSService {
  /**
   * 播放中文文字
   * @param text 要播放的中文文字
   * @param rate 播放速度 (0.1 - 10)
   */
  static playText(text: string, rate: number = 0.9): void {
    if (!text) return
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-TW'
    utterance.rate = rate
    window.speechSynthesis.speak(utterance)
  }

  /**
   * 停止播放
   */
  static stop(): void {
    window.speechSynthesis.cancel()
  }
}
