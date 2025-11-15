# 課程報表狀態檢查指南

## 🔍 即時狀態檢查

在瀏覽器控制台執行以下命令來檢查當前狀態：

### 1. 檢查當前頁面狀態
```javascript
__debugLessonState.checkStatus()
```

### 2. 查看所有狀態變量
```javascript
console.table(__debugLessonState)
```

### 3. 檢查 localStorage 中的 history
```javascript
const history = JSON.parse(localStorage.getItem('lessonHistory') || '[]')
console.log('📚 學習歷史記錄:', history)
console.log('總共有', history.length, '條記錄')
history.forEach((entry, idx) => {
  console.log(`\n記錄 ${idx + 1}:`, {
    sessionId: entry.sessionId,
    lessonId: entry.lessonId,
    lessonTitle: entry.lessonTitle,
    completedAt: entry.completedAt,
    totalScore: entry.totalScore,
    questionsCount: entry.questionsCount,
    resultsCount: entry.results?.length
  })
})
```

### 4. 檢查最新的一條記錄
```javascript
const history = JSON.parse(localStorage.getItem('lessonHistory') || '[]')
const latest = history[history.length - 1]
console.log('📊 最新記錄:', latest)
if (latest) {
  console.log('  - Session ID:', latest.sessionId)
  console.log('  - Lesson:', latest.lessonTitle)
  console.log('  - 完成時間:', new Date(latest.completedAt).toLocaleString())
  console.log('  - 總分:', latest.totalScore)
  console.log('  - 題目數:', latest.questionsCount)
  console.log('  - 結果數:', latest.results?.length)
}
```

### 5. 手動觸發報表顯示（測試用）
```javascript
// ⚠️ 這只是測試，不應該在正常使用時執行
// 檢查是否可以訪問 React 狀態
console.log('當前 showReport:', __debugLessonState.showReport)
console.log('當前 hasLesson:', __debugLessonState.hasLesson)
console.log('當前 loading:', __debugLessonState.loading)
```

## 📝 診斷流程

### 步驟 1：完成課程後立即檢查
完成最後一題後，立即在控制台執行：
```javascript
__debugLessonState.checkStatus()
```

**期望看到：**
- `showReport: true`
- `hasLesson: true`
- `loading: false`
- `stepResults: 10` (或課程的題目數)
- `條件: showReport=true && lesson=true = true`

**如果看到 `showReport: false`：**
→ `finalizeLesson` 沒有被正確執行或被阻止

**如果看到 `hasLesson: false`：**
→ lesson 狀態被意外重置

### 步驟 2：檢查控制台日誌
尋找以下關鍵日誌（按順序）：

1. ✅ **課程完成觸發**
```
🚀 所有題目已完成，準備顯示最終報表
```

2. ✅ **useEffect 觸發**
```
🔄 ========== useEffect [lesson, stepResults] 觸發 ==========
✅ 所有條件滿足，準備調用 finalizeLesson!
```

3. ✅ **finalizeLesson 執行**
```
🔔 ========== finalizeLesson 被調用 ==========
✅ 所有檢查通過，開始生成報表...
📝 步驟 3/4: 調用 setShowReport(true) ⭐⭐⭐
✅ setShowReport(true) 已調用!
🎉 ========== finalizeLesson 執行完成 ==========
```

4. ✅ **報表渲染**
```
✅ ========== 渲染報表頁面 ==========
✅ 條件滿足: showReport && lesson = true
```

### 步驟 3：檢查 history 存儲
```javascript
const history = JSON.parse(localStorage.getItem('lessonHistory') || '[]')
console.log('歷史記錄數量:', history.length)
```

**期望：** 至少有一條記錄

**如果沒有記錄：**
→ `saveToHistory` 沒有被執行或失敗

### 步驟 4：檢查報表數據
```javascript
console.log('fullReport:', __debugLessonState.hasFullReport)
```

**期望：** `true`

**如果是 `false`：**
→ `generateSimpleReport` 失敗

## 🐛 常見問題診斷

### 問題 1：控制台看到 finalizeLesson 被調用，但沒有看到渲染報表
**可能原因：**
- `setShowReport(true)` 被執行，但 React 沒有重新渲染
- 或者重新渲染後 `showReport` 又變回 `false`

**檢查方法：**
```javascript
// 延遲 1 秒後檢查
setTimeout(() => __debugLessonState.checkStatus(), 1000)
```

### 問題 2：看到 "⚠️ 報表已生成，跳過重複生成"
**原因：**
- `hasGeneratedReportRef.current` 已經是 `true`
- 但 `showReport` 可能仍是 `false`

**檢查：**
```javascript
console.log('hasGeneratedReport:', __debugLessonState.hasGeneratedReport)
console.log('showReport:', __debugLessonState.showReport)
```

**如果兩者不一致：**
→ 第一次調用 `finalizeLesson` 時出現了問題

### 問題 3：控制台一直重複打印渲染日誌
**原因：**
- 頁面在無限重新渲染
- 可能是狀態更新導致的循環

**解決：**
- 重新整理頁面
- 檢查是否有異常的 useEffect 依賴

## 📊 成功的完整日誌示例

```
[完成最後一題]
🚀 所有題目已完成，準備顯示最終報表
  📊 狀態檢查: {...}

[useEffect 觸發]
🔄 ========== useEffect [lesson, stepResults] 觸發 ==========
  📊 當前狀態: {...}
  ✅ 所有條件滿足，準備調用 finalizeLesson!

[finalizeLesson 執行]
🔔 ========== finalizeLesson 被調用 ==========
  📊 參數: {...}
  📊 當前狀態: {...}
  ✅ 所有檢查通過，開始生成報表...
  📝 步驟 1/4: 調用 generateSimpleReport
  ✅ 報表生成成功: {...}
  📝 步驟 2/4: 調用 setFullReport
  ✅ setFullReport 已調用
  📝 步驟 3/4: 調用 setShowReport(true) ⭐⭐⭐
  ✅ setShowReport(true) 已調用!
  ⏳ 等待 React 重新渲染...
  📝 步驟 4/4: 保存歷史記錄
  ✅ 歷史記錄已保存，sessionId: xxx
🎉 ========== finalizeLesson 執行完成 ==========

[100ms 後]
🔍 狀態驗證 (延遲100ms後): {
  showReport: true,
  hasLesson: true,
  fullReport: true
}

[React 重新渲染]
✅ ========== 渲染報表頁面 ==========
  📊 報表詳情: {...}
  ✅ 條件滿足: showReport && lesson = true

[報表 UI 顯示]
```

## 🎯 下一步行動

如果報表仍然不顯示，請提供以下資訊：

1. 執行 `__debugLessonState.checkStatus()` 的輸出
2. 控制台中是否看到所有關鍵日誌
3. 執行 history 檢查的結果
4. 是否看到任何錯誤訊息
