# 🔧 修復 Dashboard 課程和圖片不見的問題

## 🎯 問題診斷

用戶報告：**"進入了但是所有課程和圖片都不見了 railway也沒有連線"**

### 根本原因

Dashboard 頁面無法載入課程資料，因為：

1. **Vercel 環境變數未設置**：`NEXT_PUBLIC_API_BASE` 在 Vercel 部署中可能未正確配置
2. **Fallback 到 localhost**：當環境變數缺失時，程式碼 fallback 到 `http://localhost:8082`（這在 Vercel 上會失敗）
3. **Railway 未連線**：Frontend 無法連接到 Railway Backend

---

## ✅ 立即修復步驟

### 步驟 1：檢查當前錯誤

1. 訪問您的 Vercel URL：`https://fix-ui-web.vercel.app/dashboard`
2. 打開瀏覽器 **F12 → Console**
3. 查看錯誤信息

**預期看到的錯誤**：
```
Failed to fetch lessons: Failed to fetch
GET http://localhost:8082/api/lessons net::ERR_CONNECTION_REFUSED
```

或

```
⚠️ No API base URL configured! Set NEXT_PUBLIC_API_BASE environment variable.
```

---

### 步驟 2：確認 Vercel 環境變數

#### 2.1 登入 Vercel

1. 前往 https://vercel.com
2. 選擇您的項目（`fix-ui`）
3. 進入 **Settings** → **Environment Variables**

#### 2.2 檢查以下 4 個變數是否存在

✅ **必需的環境變數**：

| Key | Value | 環境 |
|-----|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fhgbfuafilqoouldfsdi.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZ2JmdWFmaWxxb291bGRmc2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTQxMDgsImV4cCI6MjA4MjM5MDEwOH0.v17k2OGfklBEq1ChToPdkC45ISfe06zawtL-8RYOWT0` | Production, Preview, Development |
| `NEXT_PUBLIC_API_BASE` | `https://accomplished-empathy-production-bc93.up.railway.app` | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://fix-ui-web.vercel.app` | Production, Preview, Development |

#### 2.3 如果缺少任何變數

1. 點擊 **Add New** → **Environment Variable**
2. 輸入 Key 和 Value
3. 勾選 **Production**, **Preview**, **Development**
4. 點擊 **Save**

---

### 步驟 3：重新部署 Vercel

**⚠️ 重要**：添加環境變數後，**必須重新部署**才能生效！

1. 進入 **Deployments** 標籤
2. 找到最新的部署
3. 點擊右側 **⋯** → **Redeploy**
4. **取消勾選** "Use existing Build Cache"（強制完整重建）
5. 點擊 **Redeploy**
6. 等待 2-3 分鐘，直到狀態顯示 **Ready**

---

### 步驟 4：驗證 Railway Backend 正常運行

#### 4.1 訪問健康檢查端點

在瀏覽器訪問：

```
https://accomplished-empathy-production-bc93.up.railway.app/health
```

**✅ 正確回應**：
```json
{"status":"ok"}
```

**❌ 如果失敗**：
- 檢查 Railway Dashboard → Backend 服務 → Deployments
- 查看 Deploy Logs 是否有錯誤
- 確認環境變數已設置：
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`

#### 4.2 測試課程 API

訪問：

```
https://accomplished-empathy-production-bc93.up.railway.app/api/lessons
```

**✅ 正確回應**：
應該返回 JSON 格式的課程列表

**❌ 如果顯示錯誤**：
- 檢查 Railway Deploy Logs
- 確認 Backend 代碼已正確部署

---

### 步驟 5：清除瀏覽器緩存並測試

#### 5.1 清除瀏覽器數據

1. 訪問 `https://fix-ui-web.vercel.app/dashboard`
2. 打開 **F12 → Console**
3. 執行以下代碼：

```javascript
// 清除 localStorage
localStorage.clear()

// 清除所有 cookies
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

// 重新載入
location.reload()
```

#### 5.2 重新登入並測試

1. 使用 Google OAuth 登入
2. 進入 Dashboard
3. **打開 F12 → Network 標籤**
4. 觀察 API 請求

**✅ 正確的請求**：
```
Request URL: https://accomplished-empathy-production-bc93.up.railway.app/api/lessons
Status: 200 OK
```

**❌ 錯誤的請求**（需修復）：
```
Request URL: http://localhost:8082/api/lessons
Status: (failed) net::ERR_CONNECTION_REFUSED
```

---

## 📊 成功標誌

完成所有步驟後，您應該看到：

### Vercel Dashboard
- ✅ 4 個環境變數已正確設置
- ✅ 所有變數都勾選了 **Production** 環境
- ✅ 最新部署狀態為 **Ready**

### Railway Dashboard
- ✅ Backend 部署成功
- ✅ 健康檢查返回 `{"status":"ok"}`
- ✅ `/api/lessons` 返回課程列表

### 瀏覽器測試
- ✅ Dashboard 顯示課程列表（水位杯 UI）
- ✅ 顯示統計數據（Completed Lessons, Average Score, etc.）
- ✅ Network 標籤顯示 Railway URL（不是 localhost）
- ✅ 沒有 Console 錯誤

### F12 Console 應該顯示
```
📚 開始計算課程進度，歷史記錄數量: X
📊 統計數據計算完成: {...}
```

**不應該看到**：
```
❌ Failed to fetch lessons: ...
❌ GET http://localhost:8082/api/lessons net::ERR_CONNECTION_REFUSED
❌ ⚠️ No API base URL configured!
```

---

## 🔍 進階診斷

### 如果課程仍然不見

#### 檢查 1：確認 API 請求正確

在 Dashboard 頁面，打開 **F12 → Console**，執行：

```javascript
// 檢查當前 API Base
console.log('API Base:', process.env.NEXT_PUBLIC_API_BASE)

// 手動測試 API
fetch(process.env.NEXT_PUBLIC_API_BASE + '/api/lessons')
  .then(res => res.json())
  .then(data => console.log('Lessons:', data))
  .catch(err => console.error('Error:', err))
```

#### 檢查 2：確認 Railway Backend Logs

1. Railway Dashboard → Backend 服務 → **Deployments**
2. 點擊最新部署 → **View Logs**
3. 查找 HTTP 請求記錄

**應該看到**（當 Frontend 訪問 Dashboard 時）：
```
GET /api/lessons 200 OK
```

**如果看不到任何請求**：
- Frontend 沒有連接到 Railway
- 檢查 Vercel 環境變數是否正確
- 重新部署 Vercel

---

## 🆘 圖片不見的問題

如果課程列表顯示了，但**圖片不見**，可能是以下原因：

### 原因 A：圖片路徑錯誤

**檢查**：打開 **F12 → Network** 標籤，查看圖片請求

**常見錯誤**：
```
GET https://fix-ui-web.vercel.app/_next/static/media/xxx.png 404 Not Found
```

**解決**：確認圖片檔案存在於 `apps/web/public/` 目錄

### 原因 B：Vercel 部署未包含圖片

**檢查**：Vercel Dashboard → Deployments → 最新部署 → **Build Logs**

查找是否有圖片複製相關的錯誤

**解決**：確認 `.gitignore` 沒有排除圖片檔案

---

## 📋 檢查清單

請逐一確認：

### Vercel 配置
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已設置
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已設置
- [ ] `NEXT_PUBLIC_API_BASE` 已設置為 Railway URL
- [ ] `NEXT_PUBLIC_SITE_URL` 已設置為 Vercel URL
- [ ] 所有變數都勾選了 **Production** 環境
- [ ] 已重新部署（取消勾選 Build Cache）
- [ ] 部署狀態為 **Ready**

### Railway 配置
- [ ] Backend 正常運行
- [ ] 健康檢查返回 `{"status":"ok"}`
- [ ] `/api/lessons` 返回課程列表
- [ ] Deploy Logs 沒有錯誤

### 測試
- [ ] 清除了瀏覽器緩存
- [ ] 重新登入成功
- [ ] Dashboard 顯示課程列表
- [ ] Network 標籤顯示 Railway URL
- [ ] Console 沒有錯誤信息

---

## 🎉 完成！

如果所有檢查項都打勾 ✅，Dashboard 應該正常顯示：

- ✅ 課程列表（水位杯 UI）
- ✅ 統計數據（Completed Lessons, Average Score, Level Index, Streak Days）
- ✅ 課程按章節分組（Chapter 1, Chapter 2, ...）
- ✅ 所有圖片正常顯示

---

## 📸 診斷截圖請求

**如果仍然有問題**，請提供以下截圖：

1. **Vercel Environment Variables** 頁面（隱藏敏感值）
2. **F12 → Console** 標籤（顯示錯誤信息）
3. **F12 → Network** 標籤（過濾 `lessons`，顯示 API 請求）
4. **Railway Deploy Logs**（Backend 最新部署的日誌）

我會立即協助診斷！
