# ✅ 最終測試指南 - 徹底修復版本

## 🎯 已完成的關鍵修復

### Commit: 860bc2f (最新)

**Dockerfile 修復**：
```dockerfile
# 在 build 階段強制複製課程文件
RUN mkdir -p apps/backend/dist/plugins && \
    cp -r apps/backend/src/plugins/chinese-lessons apps/backend/dist/plugins/ && \
    echo "✅ Copied course files to dist/plugins" && \
    ls -la apps/backend/dist/plugins/chinese-lessons/
```

**CORS 修復**：
```javascript
// 臨時允許所有來源（用於測試）
app.use(cors({
  origin: true,
  credentials: true
}));
```

---

## 📋 等待 Railway 部署（3-5 分鐘）

### 監控部署

1. 前往 https://railway.app
2. Backend 項目 → **Deployments**
3. 查找 commit **860bc2f**
4. 等待狀態變為 **Active**

---

## ✅ 部署完成後測試

### 測試 1：檢查 Build Logs

**關鍵驗證點**：

1. Railway → Deployments → commit 860bc2f
2. 查看 **Build Logs**（不是 Deploy Logs）

**✅ 應該看到**：
```
RUN mkdir -p apps/backend/dist/plugins && ...
✅ Copied course files to dist/plugins
drwxr-xr-x  chapter-01
drwxr-xr-x  chapter-02
...
drwxr-xr-x  chapter-10
```

這證明課程文件在 build 階段已成功複製！

### 測試 2：檢查 Deploy Logs

1. 同一部署 → **Logs** 標籤（或 Deploy Logs）

**✅ 應該看到**：
```
⚠️ CORS: Allowing ALL origins (temporary for debugging)
Server running on port 8082
📂 __dirname: /app/apps/backend/dist/routes
📂 cwd: /app
✅ Found lessons at: /app/apps/backend/dist/plugins/chinese-lessons
✅ Loaded 100 lessons from 10 chapters
```

**🎉 如果看到這些**：修復成功！

**❌ 如果仍看到**：
```
❌ lessonsDir does not exist in any location!
```
→ Railway 可能仍在使用舊 commit，請手動觸發部署

### 測試 3：直接訪問課程 API

在瀏覽器訪問：
```
https://accomplished-empathy-production-bc93.up.railway.app/api/lessons
```

**✅ 應該返回**：
```json
[
  {
    "lesson_id": "C1-L01",
    "chapterId": "C1",
    "lessonNumber": 1,
    "title": "Basic Greetings",
    "description": "...",
    "stepCount": 10
  },
  {
    "lesson_id": "C1-L02",
    ...
  },
  ...
  // 總共約 100 個課程
]
```

**❌ 如果返回 `[]`（空陣列）**：
→ 課程文件仍然找不到，查看 Build Logs

### 測試 4：Dashboard 測試

#### 步驟 A：清除緩存

1. 訪問 `https://fix-ui-web.vercel.app/dashboard`
2. **F12 → Console** 執行：

```javascript
localStorage.clear()
sessionStorage.clear()
location.reload()
```

#### 步驟 B：重新登入

使用 Google OAuth 登入

#### 步驟 C：檢查 F12 Console

**✅ 應該看到**：
```
📚 開始計算課程進度，歷史記錄數量: X
📊 統計數據計算完成: {...}
```

**✅ 不應該看到**：
```
❌ Access to fetch ... has been blocked by CORS policy
❌ Failed to fetch lessons: ...
❌ net::ERR_FAILED
```

#### 步驟 D：檢查 F12 Network 標籤

1. 過濾 `lessons`
2. 查看請求詳情

**✅ 應該顯示**：
```
Request URL: https://accomplished-empathy-production-bc93.up.railway.app/api/lessons
Status: 200 OK
Response: [...] (100 個課程)
```

#### 步驟 E：檢查 UI

**✅ Dashboard 應該顯示**：
- 10 個章節選擇器（Chapter 1 ~ Chapter 10）
- 每個章節 10 個課程（水位杯 UI）
- 統計數據（Completed Lessons, Average Score, etc.）

---

## 🎉 完整成功標誌

### Railway
- [x] 最新部署 commit = **860bc2f**
- [x] Build Logs 顯示 "✅ Copied course files to dist/plugins"
- [x] Deploy Logs 顯示 "✅ Found lessons at: ..."
- [x] Deploy Logs 顯示 "✅ Loaded 100 lessons from 10 chapters"

### API
- [x] `/health` 返回 `{"status":"ok"}`
- [x] `/api/lessons` 返回 100 個課程的 JSON

### Dashboard
- [x] 成功登入並進入 Dashboard
- [x] 顯示 10 個章節和 100 個課程
- [x] **沒有 CORS 錯誤**
- [x] **沒有 404 錯誤**
- [x] 統計數據正確顯示

---

## 🆘 如果仍然失敗

### 如果 Railway 沒有自動部署

#### 方法 1：手動觸發

1. Railway → Deployments → 右上角 **Deploy**
2. 選擇 **Deploy from main branch**

#### 方法 2：推送空 Commit

```bash
git commit --allow-empty -m "Force Railway redeploy"
git push
```

### 如果 Build Logs 沒有顯示課程文件複製

檢查：
1. Railway → Settings → Build
   - Builder 是否為 **DOCKERFILE**
   - Dockerfile Path 是否為 **Dockerfile**

2. Railway → Settings → Source
   - Branch 是否為 **main**
   - Repository 是否正確

---

## 📸 診斷截圖請求

**如果完成所有步驟後仍然失敗**，請提供：

1. **Railway Build Logs**（顯示 RUN mkdir... 那一段）
2. **Railway Deploy Logs**（顯示啟動和課程載入信息）
3. **瀏覽器訪問 `/api/lessons` 的截圖**
4. **F12 Console** 標籤截圖
5. **F12 Network** 標籤截圖（過濾 lessons）

---

**現在請等待 Railway 完成部署（3-5 分鐘），然後按順序執行上述測試！**
