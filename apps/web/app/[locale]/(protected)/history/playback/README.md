# Playback Practice 模組化架構

## 📁 目錄結構

```
playback/
├── [lessonId]/
│   └── [stepId]/
│       └── page.tsx          # 主頁面（使用模組化組件）
├── components/               # UI 組件
│   ├── LoadingScreen.tsx    # 載入中畫面
│   ├── ErrorScreen.tsx      # 錯誤畫面
│   ├── QuestionDisplay.tsx  # 題目顯示
│   ├── RecordingControls.tsx # 錄音控制
│   ├── ScoreDisplay.tsx     # 分數顯示
│   └── index.ts             # 組件匯出
├── hooks/                    # 自訂 Hooks
│   ├── usePlaybackQuestion.ts # 資料載入
│   ├── useAudioRecorder.ts   # 錄音控制
│   └── index.ts              # Hooks 匯出
├── services/                 # 業務邏輯服務
│   ├── ttsService.ts         # TTS 語音合成
│   ├── scoringService.ts     # 評分服務
│   └── index.ts              # 服務匯出
└── README.md                 # 本文件
```

## 🎯 模組職責

### 1. Components（UI 組件）

**LoadingScreen** - 載入中畫面
- 顯示 loading spinner
- 提供使用者等待提示

**ErrorScreen** - 錯誤畫面
- 顯示錯誤訊息
- 提供重試和返回按鈕

**QuestionDisplay** - 題目顯示組件
- 顯示題目中文、拼音、英文提示
- 整合 TTS 播放按鈕
- Props:
  - questionText: string
  - pinyin?: string
  - englishHint?: string
  - lessonId: string
  - stepId: number

**RecordingControls** - 錄音控制組件
- 錄音開始/停止按鈕
- 播放錄音按鈕
- 評分中狀態顯示
- Props:
  - isRecording: boolean
  - isPlaying: boolean
  - audioBlob: Blob | null
  - isSubmitting: boolean
  - onStartRecording: () => void
  - onStopRecording: () => void
  - onPlayRecording: () => void

**ScoreDisplay** - 分數顯示組件
- 最高分、練習次數、最後練習時間
- 最新評分的五維度分數
- 每個維度的建議
- 總體練習方法
- Props:
  - question: PlaybackQuestion
  - latestScore: PlaybackAttempt | null

### 2. Hooks（自訂鉤子）

**usePlaybackQuestion** - 資料載入 Hook
- 從 localStorage 載入練習記錄
- 從 API 載入完整課程資料
- 自動初始化資料（如果需要）
- 合併兩個資料來源
- 返回:
  - question: PlaybackQuestion | null
  - lessonData: any
  - loading: boolean
  - error: string

**useAudioRecorder** - 錄音控制 Hook
- 管理錄音狀態
- 錄音開始/停止
- 播放錄音
- 返回:
  - isRecording: boolean
  - isPlaying: boolean
  - audioBlob: Blob | null
  - startRecording: () => Promise<void>
  - stopRecording: () => void
  - playRecording: () => void

### 3. Services（業務邏輯服務）

**TTSService** - TTS 語音合成服務
- 靜態類別
- 方法:
  - playText(text: string, rate?: number): void
  - stop(): void

**ScoringService** - 評分服務
- 靜態類別
- 方法:
  - submitForScoring(request: ScoringRequest): Promise<PlaybackAttempt>
  - 內部使用: blobToBase64(blob: Blob): Promise<string>

## 🔄 資料流

```
1. 頁面載入
   └→ usePlaybackQuestion
       ├→ localStorage (getPlaybackQuestion)
       ├→ initializePlaybackFromHistory (如果需要)
       └→ API (fetch lesson data)

2. 錄音流程
   └→ useAudioRecorder
       ├→ startRecording (取得麥克風權限)
       ├→ stopRecording (產生 audioBlob)
       └→ ScoringService.submitForScoring
           ├→ fetch API /api/score
           ├→ 轉換為 Base64
           └→ addPlaybackAttempt (儲存到 localStorage)

3. TTS 播放
   └→ TTSService.playText
       └→ window.speechSynthesis
```

## 💡 使用範例

### 在主頁面中使用

```tsx
import { usePlaybackQuestion } from '../hooks'
import { useAudioRecorder } from '../hooks'
import { ScoringService } from '../services'
import { 
  LoadingScreen, 
  ErrorScreen, 
  QuestionDisplay,
  RecordingControls,
  ScoreDisplay 
} from '../components'

export default function PlaybackQuestionPage() {
  // 資料載入
  const { question, loading, error } = usePlaybackQuestion(lessonId, stepId)
  
  // 錄音控制
  const { 
    isRecording, 
    audioBlob, 
    startRecording, 
    stopRecording 
  } = useAudioRecorder()

  // 評分
  const handleSubmit = async () => {
    const attempt = await ScoringService.submitForScoring({
      audioBlob,
      lessonId,
      stepId,
      expectedAnswer: question.expectedAnswer
    })
  }

  if (loading) return <LoadingScreen />
  if (!question) return <ErrorScreen error={error} ... />

  return (
    <div>
      <QuestionDisplay {...questionProps} />
      <RecordingControls {...recordingProps} />
      <ScoreDisplay {...scoreProps} />
    </div>
  )
}
```

## ✅ 優點

1. **關注點分離**：每個模組負責單一職責
2. **可重用性**：組件和 Hooks 可以在其他地方重用
3. **易於測試**：每個模組可以獨立測試
4. **易於維護**：修改某個功能只需要改對應的模組
5. **類型安全**：使用 TypeScript 確保類型正確
6. **可擴展性**：新增功能時容易擴展

## 🔧 維護指南

### 新增新的組件
1. 在 `components/` 目錄創建新的 `.tsx` 文件
2. 在 `components/index.ts` 中匯出
3. 在主頁面 import 使用

### 新增新的 Hook
1. 在 `hooks/` 目錄創建新的 `.ts` 文件
2. 在 `hooks/index.ts` 中匯出
3. 在需要的地方 import 使用

### 新增新的服務
1. 在 `services/` 目錄創建新的 `.ts` 文件
2. 在 `services/index.ts` 中匯出
3. 在需要的地方 import 使用

### 修改現有功能
1. 找到對應的模組文件
2. 修改該文件
3. 確保不影響其他使用該模組的地方

## 📝 注意事項

1. **保持向後兼容**：修改時注意不要破壞現有功能
2. **使用 TypeScript**：確保所有模組都有正確的類型定義
3. **錯誤處理**：每個模組都要有適當的錯誤處理
4. **Console 日誌**：適當使用 console.log 方便除錯
5. **依賴注入**：通過 props 傳遞依賴，避免硬編碼
