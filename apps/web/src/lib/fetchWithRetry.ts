/**
 * 帶有重試機制的 Fetch 工具
 * 使用指數退避策略
 */

export interface RetryConfig {
  maxRetries?: number          // 最大重試次數
  baseDelay?: number           // 基礎延遲（毫秒）
  maxDelay?: number            // 最大延遲（毫秒）
  retryOn?: number[]           // 需要重試的 HTTP 狀態碼
  onRetry?: (attempt: number, error: Error) => void  // 重試回調
}

const DEFAULT_CONFIG: Required<Omit<RetryConfig, 'onRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryOn: [408, 429, 500, 502, 503, 504],  // 常見可重試錯誤
}

/**
 * 計算指數退避延遲
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // 指數退避：delay = baseDelay * 2^attempt + 隨機抖動
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 1000  // 0-1000ms 隨機抖動
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * 延遲函數
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 檢查是否應該重試
 */
function shouldRetry(error: Error, response: Response | null, retryOn: number[]): boolean {
  // 網絡錯誤
  if (!response) {
    return true
  }

  // 檢查狀態碼
  return retryOn.includes(response.status)
}

/**
 * 帶有重試機制的 Fetch
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  config?: RetryConfig
): Promise<Response> {
  const {
    maxRetries,
    baseDelay,
    maxDelay,
    retryOn,
  } = { ...DEFAULT_CONFIG, ...config }
  const { onRetry } = config || {}

  let lastError: Error | null = null
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(input, init)

      // 成功或不需要重試的狀態碼
      if (response.ok || !retryOn.includes(response.status)) {
        return response
      }

      // 記錄響應用於重試判斷
      lastResponse = response
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)

    } catch (error) {
      // 網絡錯誤等
      lastError = error instanceof Error ? error : new Error(String(error))
      lastResponse = null
    }

    // 如果是最後一次嘗試，不再重試
    if (attempt === maxRetries) {
      break
    }

    // 檢查是否應該重試
    if (!shouldRetry(lastError!, lastResponse, retryOn)) {
      break
    }

    // 計算延遲並等待
    const waitTime = calculateDelay(attempt, baseDelay, maxDelay)

    // 回調
    if (onRetry) {
      onRetry(attempt + 1, lastError!)
    }

    await delay(waitTime)
  }

  // 所有重試都失敗
  throw lastError || new Error('Fetch failed after retries')
}

/**
 * 檢查是否離線
 */
export function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false
  return !navigator.onLine
}

/**
 * 監聽網絡狀態變化
 */
export function onNetworkChange(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * 創建一個帶有默認配置的 fetch 實例
 */
export function createFetchWithRetry(defaultConfig: RetryConfig) {
  return (input: RequestInfo | URL, init?: RequestInit, config?: RetryConfig) => {
    return fetchWithRetry(input, init, { ...defaultConfig, ...config })
  }
}

export default fetchWithRetry
