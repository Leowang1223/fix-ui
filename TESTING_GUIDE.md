# 中文學習功能測試指南

## 已完成的修改

### 1. Dashboard 頁面 (`apps/web/src/app/(protected)/dashboard/page.tsx`)
- ✅ 移除了「自我介紹」選項
- ✅ 新增「中文學習課程」展開/收合功能
- ✅ 顯示 L1-L10 共 10 個課程選項
- ✅ 點擊課程直接進入對話介面（跳過準備頁）

### 2. Interview 頁面 (`apps/web/src/app/(protected)/interview/page.tsx`)
- ✅ 檢測中文課程（L開頭的 type）
- ✅ 中文課程跳過影片播放和倒數計時
- ✅ 直接進入文字對話介面
- ✅ 修改按鈕文字（「開始學習」vs「開始面試」）

## 測試步驟

### 準備工作

1. **確保後端正在運行**
```powershell
cd apps\backend
npm install
npm run dev
```

2. **確保前端正在運行**（另一個終端）
```powershell
cd apps\web
npm install
npm run dev
```

3. **檢查 .env 文件**
確保 `apps/backend/.env` 包含：
```
GEMINI_API_KEY=你的API_KEY
```

### 測試流程

#### 測試 1：Dashboard 課程列表
1. 打開瀏覽器訪問 http://localhost:3000/dashboard
2. 確認：
   - ✅ 看不到「自我介紹」選項
   - ✅ 看到「中文學習課程」標題和描述
   - ✅ 點擊「中文學習課程」展開課程列表
3. 展開後應該看到：
   - L1: Self Introduction
   - L2: Lesson 2
   - ... (L3-L10)

#### 測試 2：進入中文課程
1. 點擊任意課程（例如「L1: Self Introduction」）
2. 確認：
   - ✅ 直接跳轉到 `/interview?type=L1`（不經過 `/prepare` 頁面）
   - ✅ 看到「開始學習」按鈕（而非「開始面試」）

#### 測試 3：課程對話流程
1. 點擊「開始學習」按鈕
2. 確認：
   - ✅ 沒有影片播放
   - ✅ 沒有倒數計時（5, 4, 3, 2, 1）
   - ✅ 直接顯示第一個問題
3. 在左側面板應該看到：
   - 問題：老師的提示文字
   - 預期答案、拼音、英文提示
4. 輸入答案並送出
5. 確認：
   - ✅ 進入下一個問題
   - ✅ 顯示鼓勵訊息

#### 測試 4：課程結束
1. 完成所有問題後
2. 確認：
   - ✅ 顯示「課程結束」（而非「面試結束」）
   - ✅ 可以返回首頁或查看分析

## 課程 JSON 結構

每個課程文件（`apps/backend/src/plugins/chinese-lessons/L*.json`）應包含：

```json
{
  "lesson_id": "L1",
  "title": "Self Introduction",
  "description": "Learn how to say hello and introduce yourself in Chinese.",
  "steps": [
    {
      "id": 1,
      "teacher": "問題文字...",
      "expected_answer": "預期答案",
      "pinyin": "拼音",
      "english_hint": "英文提示",
      "encouragement": "鼓勵訊息"
    }
  ],
  "review": {
    "summary": "課程總結",
    "mission": "下次目標"
  }
}
```

## 常見問題排查

### 問題 1：點擊課程後沒有反應
- 檢查瀏覽器控制台是否有錯誤
- 確認 URL 是否正確（應為 `/interview?type=L1`）

### 問題 2：顯示「載入面試設定中」一直不消失
- 檢查後端是否正在運行
- 檢查課程 JSON 文件是否存在（`apps/backend/src/plugins/chinese-lessons/L*.json`）
- 查看後端控制台日誌

### 問題 3：課程列表不展開
- 確認前端代碼已更新
- 重新啟動前端服務（Ctrl+C 然後 `npm run dev`）

### 問題 4：workspace 依賴錯誤
如果遇到 `EUNSUPPORTEDPROTOCOL` 錯誤：
```powershell
# 升級 npm
npm install -g npm@latest

# 檢查版本
node -v  # 應為 18+
npm -v   # 應為 8+

# 重新安裝依賴
rm -r node_modules
rm package-lock.json
npm install
```

## API 端點測試

可以使用 PowerShell 測試後端 API：

```powershell
# 測試健康檢查
Invoke-RestMethod -Uri http://localhost:8082/health

# 測試分析端點（中文課程）
$payload = @{
  interviewType = "L1"
  items = @(
    @{
      lessonId = "L1"
      stepId = 0
      question = "In Chinese, we say '你好 (nǐ hǎo)' which means 'hello'. Please try saying '你好'."
      answer = "你好"
    }
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri http://localhost:8082/api/analyze -Method Post -Body $payload -ContentType 'application/json'
```

## 下一步開發建議

1. **完善課程內容**：
   - 為 L2-L10 添加完整的課程內容
   - 統一課程標題和描述

2. **改進用戶體驗**：
   - 添加課程進度條
   - 顯示已完成的課程數量
   - 添加課程難度標籤

3. **增加功能**：
   - 語音識別（STT）用於檢查發音
   - 實時反饋和評分
   - 課程重播功能

4. **優化性能**：
   - 預載下一題的內容
   - 緩存課程數據

## 聯絡與支援

如有問題，請檢查：
1. 後端控制台日誌
2. 前端瀏覽器控制台
3. Network 面板（查看 API 請求）
