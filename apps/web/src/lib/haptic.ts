/**
 * 觸覺反饋工具
 * 封裝 navigator.vibrate API，提供各種震動模式
 */

// 檢查是否支持震動 API
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

// 基礎震動函數
function vibrate(pattern: number | number[]): boolean {
  if (!isHapticSupported()) return false
  try {
    return navigator.vibrate(pattern)
  } catch {
    return false
  }
}

/**
 * 震動模式預設
 */
export const HapticPatterns: Record<string, number | number[]> = {
  // 輕觸 - 按鈕點擊等
  light: 10,

  // 中等 - 一般確認
  medium: 30,

  // 重 - 重要操作
  heavy: 50,

  // 錄音開始 - 短促單次
  recordStart: 50,

  // 錄音結束 - 三次短促
  recordStop: [50, 50, 50],

  // 成功 - 兩次中等
  success: [100, 50, 100],

  // 錯誤 - 三次短促
  error: [50, 30, 50, 30, 50],

  // 警告 - 長震
  warning: [200],

  // 完美分數 - 慶祝模式
  perfect: [50, 30, 50, 30, 100, 50, 100],

  // 進步 - 漸強
  improvement: [30, 50, 50, 50, 80],

  // 連擊 - 快速
  combo: [20, 20, 20, 20, 20],
}

/**
 * 觸覺反饋 API
 */
export const haptic = {
  /**
   * 輕觸反饋 - 用於普通按鈕點擊
   */
  light() {
    return vibrate(HapticPatterns.light)
  },

  /**
   * 中等反饋 - 用於確認操作
   */
  medium() {
    return vibrate(HapticPatterns.medium)
  },

  /**
   * 重反饋 - 用於重要操作
   */
  heavy() {
    return vibrate(HapticPatterns.heavy)
  },

  /**
   * 錄音開始反饋
   */
  recordStart() {
    return vibrate(HapticPatterns.recordStart)
  },

  /**
   * 錄音結束反饋
   */
  recordStop() {
    return vibrate(HapticPatterns.recordStop)
  },

  /**
   * 成功反饋
   */
  success() {
    return vibrate(HapticPatterns.success)
  },

  /**
   * 錯誤反饋
   */
  error() {
    return vibrate(HapticPatterns.error)
  },

  /**
   * 警告反饋
   */
  warning() {
    return vibrate(HapticPatterns.warning)
  },

  /**
   * 完美分數反饋 (90+)
   */
  perfect() {
    return vibrate(HapticPatterns.perfect)
  },

  /**
   * 進步反饋
   */
  improvement() {
    return vibrate(HapticPatterns.improvement)
  },

  /**
   * 連擊反饋
   */
  combo() {
    return vibrate(HapticPatterns.combo)
  },

  /**
   * 根據分數選擇合適的反饋
   */
  forScore(score: number, previousScore?: number) {
    // 檢查是否有進步
    if (previousScore !== undefined && score > previousScore) {
      this.improvement()
      return
    }

    // 根據分數選擇反饋
    if (score >= 95) {
      this.perfect()
    } else if (score >= 80) {
      this.success()
    } else if (score >= 60) {
      this.medium()
    } else {
      this.light()
    }
  },

  /**
   * 自定義震動模式
   */
  custom(pattern: number | number[]) {
    return vibrate(pattern)
  },

  /**
   * 停止所有震動
   */
  stop() {
    return vibrate(0)
  },
}

export default haptic
