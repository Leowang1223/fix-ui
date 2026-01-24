# 🚀 強制 Railway 重新部署指南

## 🎯 問題診斷

Railway Deploy Logs 顯示的是**舊代碼**：
```
❌ lessonsDir does not exist!
```

**新代碼應該顯示**：
```
✅ Found lessons at: /app/apps/backend/dist/plugins/chinese-lessons
```

這表示 Railway **沒有自動部署最新的 commit**。

---

## ✅ 手動觸發重新部署

### 方法 1：Railway Dashboard 手動部署（推薦）

1. 前往 https://railway.app
2. 選擇您的 Backend 項目
3. 點擊 **Deployments** 標籤
4. 點擊右上角 **Deploy** 按鈕
5. 選擇 **Deploy from main branch** 或 **Redeploy latest**
6. 等待 3-5 分鐘

### 方法 2：推送空 Commit 觸發部署

如果 Railway Dashboard 無法手動部署，使用此方法：

```bash
git commit --allow-empty -m "Force Railway redeploy with latest fixes"
git push
```

---

## 📋 驗證新代碼已部署

### 步驟 1：檢查 Commit SHA

1. Railway → Deployments
2. 查看最新部署的 commit
3. **應該是 `fb9f92b` 或更新**

**如果仍然是舊 commit**：
- Railway 沒有檢測到新代碼
- 嘗試方法 2（推送空 commit）

### 步驟 2：檢查 Deploy Logs

1. 點擊最新部署
2. 查看 **Deploy Logs**

**✅ 應該看到（新代碼）**：
```
⚠️ CORS: Allowing ALL origins (temporary for debugging)
Server running on port 8082
📂 __dirname: /app/apps/backend/dist/routes
📂 cwd: /app
✅ Found lessons at: /app/apps/backend/dist/plugins/chinese-lessons
✅ Loaded 100 lessons from 10 chapters
```

**❌ 如果仍然看到（舊代碼）**：
```
📂 lessonsDir: /app/apps/backend/src/plugins/chinese-lessons
❌ lessonsDir does not exist!
```
→ Railway 仍在使用舊代碼，需要：
   - 檢查 Railway 是否連接到正確的 Git repository
   - 檢查 Railway 是否設置為從 main branch 自動部署
   - 嘗試刪除並重新創建 Railway 服務

---

## 🧪 測試 API（部署完成後）

### 測試 1：健康檢查

```
https://accomplished-empathy-production-bc93.up.railway.app/health
```

應該返回：`{"status":"ok"}`

### 測試 2：課程列表

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
    "title": "...",
    "stepCount": 10
  },
  ...
]
```

**❌ 如果返回 `[]`**：
- 課程文件仍然找不到
- 檢查 Dockerfile 是否正確複製了 plugins 目錄

---

## 🎉 成功標誌

完成後應該看到：

1. ✅ Railway Deployments 顯示 commit `fb9f92b`
2. ✅ Deploy Logs 顯示 "✅ Found lessons at: ..."
3. ✅ Deploy Logs 顯示 "✅ Loaded 100 lessons from 10 chapters"
4. ✅ `/api/lessons` 返回 100 個課程的 JSON
5. ✅ F12 Console **沒有 CORS 錯誤**

---

## 🆘 如果仍然失敗

### Railway 配置檢查

1. **Settings** → **Source**
   - 確認連接到正確的 GitHub repository
   - 確認 Branch 是 `main`

2. **Settings** → **Build**
   - 確認 Builder 是 `DOCKERFILE`
   - 確認 Dockerfile Path 是 `Dockerfile`

3. **Variables** 標籤
   - 確認所有必需環境變數已設置

### 如果 Railway 無法檢測到新 commit

嘗試以下方法：

1. **斷開並重新連接 GitHub**：
   - Settings → Source → Disconnect
   - 重新連接到 GitHub repository

2. **刪除並重新創建服務**：
   - 保存所有環境變數（複製到文本文件）
   - 刪除現有服務
   - 創建新服務並設置環境變數

---

**現在請按照上述步驟手動觸發 Railway 重新部署！**
