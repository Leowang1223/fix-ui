# 🚀 完整部署檢查清單

**最新代碼版本**: commit `8aa26e0`

---

## 📋 應用路由分析

### Public 路由（無需認證）
- `/` - 首頁
- `/login` - 登入頁
- `/register` - 註冊頁

### Protected 路由（需要認證）
- `/dashboard` - 儀表板
- `/prepare` - 準備頁面
- `/lesson/[id]` - 課程頁面
- `/history` - 歷史記錄
- `/history/playback/[lessonId]/[stepId]` - 回放頁面
- `/flashcards` - 字卡
- `/interview` - 面試
- `/analysis` - 分析報告
- `/report` - 成績報告
- `/conversation` - AI 對話（設置頁面）
- `/conversation/chat` - AI 對話（聊天頁面）
- `/conversation/report/[reportId]` - 對話報告

### Auth 路由
- `/auth/callback` - OAuth 回調（**必需**）

---

## ✅ 步驟 1：配置 Supabase Redirect URLs

### 1.1 登入 Supabase

1. 前往 https://supabase.com/dashboard
2. 選擇您的項目（`fhgbfuafilqoouldfsdi`）
3. 進入 **Authentication** → **URL Configuration**

### 1.2 設置 Site URL

將 **Site URL** 設置為您的 **Vercel Production URL**：

```
https://fix-ui-leowang1223.vercel.app
```

**⚠️ 重要**：替換為您實際的 Vercel domain！

### 1.3 設置 Redirect URLs

**推薦配置（最簡單）**：

使用通配符涵蓋所有路由，點擊 **Add URL** 添加以下 2 個 URL：

```
https://fix-ui-leowang1223.vercel.app/*
https://fix-ui-leowang1223.vercel.app/auth/callback
```

**詳細配置（可選，更精確）**：

如果您想精確控制允許的路由，可以添加以下所有 URL：

```bash
# 基礎
https://fix-ui-leowang1223.vercel.app/
https://fix-ui-leowang1223.vercel.app/auth/callback

# Protected 路由（登入後可能跳轉的頁面）
https://fix-ui-leowang1223.vercel.app/dashboard
https://fix-ui-leowang1223.vercel.app/prepare
https://fix-ui-leowang1223.vercel.app/lesson/*
https://fix-ui-leowang1223.vercel.app/history
https://fix-ui-leowang1223.vercel.app/history/playback/*
https://fix-ui-leowang1223.vercel.app/flashcards
https://fix-ui-leowang1223.vercel.app/interview
https://fix-ui-leowang1223.vercel.app/analysis
https://fix-ui-leowang1223.vercel.app/report
https://fix-ui-leowang1223.vercel.app/conversation
https://fix-ui-leowang1223.vercel.app/conversation/chat
https://fix-ui-leowang1223.vercel.app/conversation/report/*

# 本地開發（可選）
http://localhost:3000/*
http://localhost:3000/auth/callback
```

**建議**：使用通配符 `/*` 更簡單，涵蓋所有當前和未來的路由。

### 1.4 保存配置

點擊頁面底部的 **Save** 按鈕。

---

## ✅ 步驟 2：配置 Vercel 環境變數

### 2.1 登入 Vercel

1. 前往 https://vercel.com
2. 選擇您的項目（例如：`fix-ui`）
3. 進入 **Settings** → **Environment Variables**

### 2.2 添加/檢查環境變數

確認以下 **4 個**環境變數都已設置：

#### 變數 1：NEXT_PUBLIC_SUPABASE_URL

- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://fhgbfuafilqoouldfsdi.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### 變數 2：NEXT_PUBLIC_SUPABASE_ANON_KEY

- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZ2JmdWFmaWxxb291bGRmc2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTQxMDgsImV4cCI6MjA4MjM5MDEwOH0.v17k2OGfklBEq1ChToPdkC45ISfe06zawtL-8RYOWT0`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### 變數 3：NEXT_PUBLIC_API_BASE

- **Key**: `NEXT_PUBLIC_API_BASE`
- **Value**: `https://accomplished-empathy-production-bc93.up.railway.app`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### 變數 4：NEXT_PUBLIC_SITE_URL

- **Key**: `NEXT_PUBLIC_SITE_URL`
- **Value**: `https://fix-ui-leowang1223.vercel.app` **（替換為您的實際 Vercel URL）**
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### 2.3 確認所有變數已保存

應該看到 4 個環境變數，每個都有綠色勾選標記表示已保存。

---

## ✅ 步驟 3：重新部署 Vercel

### 3.1 觸發重新部署

1. 在 Vercel Dashboard，進入 **Deployments** 標籤
2. 找到最新的部署（應該顯示 commit `8aa26e0`）
3. 點擊右側的 **⋯** (三個點)
4. 選擇 **Redeploy**
5. **重要**：**取消勾選** "Use existing Build Cache"（強制完整重建）
6. 點擊 **Redeploy** 按鈕
7. 等待 2-4 分鐘（會自動構建並部署）

### 3.2 確認部署成功

部署完成後：
- 狀態應該顯示為 **Ready** ✅
- Commit 應該是 `8aa26e0`
- 可以點擊 **Visit** 查看網站

---

## ✅ 步驟 4：重新部署 Railway（Backend）

### 4.1 檢查 Railway 當前狀態

1. 前往 https://railway.app
2. 選擇您的項目
3. 點擊 **Backend 服務**
4. 查看 **Deployments** 標籤

### 4.2 觸發重新部署（如果需要）

**方法 1：自動部署（推薦）**

Railway 會自動檢測 GitHub 的新 commit 並部署。檢查最新部署的 commit 是否是 `8aa26e0`。

**如果是** → 無需手動操作，Backend 已是最新版本。

**如果不是** → 使用方法 2 手動觸發。

**方法 2：手動觸發重新部署**

1. 進入 **Deployments** 標籤
2. 點擊右上角的 **"..."** → **"Redeploy"**
3. 等待 3-5 分鐘

### 4.3 驗證 Backend 正常運行

部署完成後，訪問健康檢查端點：

```
https://accomplished-empathy-production-bc93.up.railway.app/health
```

應該返回：
```json
{"status":"ok"}
```

### 4.4 檢查環境變數（確認）

在 Railway Dashboard → Backend 服務 → **Variables** 標籤，確認有：

- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `GEMINI_API_KEY`
- ✅ `PORT` (可選)
- ✅ `NODE_ENV` (可選)

---

## ✅ 步驟 5：測試完整功能

### 5.1 清除瀏覽器數據

1. 訪問您的 Vercel URL
2. 打開瀏覽器 Console（**F12 → Console**）
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

### 5.2 測試登入流程

1. 點擊 "Sign in with Google"
2. **在 Console 中查看日誌**：

```
✅ 應該看到：
🔐 OAuth redirect URL: https://fix-ui-leowang1223.vercel.app/auth/callback

❌ 不應該看到：
🔐 OAuth redirect URL: http://localhost:3000/auth/callback
```

3. 完成 Google 登入
4. **應該跳轉到 Dashboard**（而不是「網站無法連線」）

### 5.3 測試所有功能頁面

登入成功後，測試以下頁面是否正常載入：

- [ ] Dashboard - 儀表板顯示正常
- [ ] Prepare - 準備頁面載入
- [ ] Lesson - 選擇一個課程測試
- [ ] History - 歷史記錄頁面
- [ ] Flashcards - 字卡頁面
- [ ] Interview - 面試頁面
- [ ] Conversation - AI 對話設置頁面

### 5.4 測試 AI Conversation（關鍵功能）

1. 進入 **AI Conversation** → **Scenario Mode**
2. 選擇任意 scenario（例如：Restaurant Ordering）
3. 點擊 "Start Conversation"
4. 發送一條消息（例如：「你好」）

**✅ 預期結果**：
- ✅ 正常接收 AI 回覆
- ✅ Suggested Responses 更新並匹配 AI 問題
- ✅ Checkpoints 顯示進度
- ❌ **不再顯示** "Failed to process your message"

### 5.5 檢查 Network 請求

打開 **F12 → Network** 標籤，在 AI Conversation 發送消息時查看：

**應該看到**：
```
Request URL: https://accomplished-empathy-production-bc93.up.railway.app/api/conversation/message
Status: 200 OK
```

**不應該看到**：
```
❌ Request URL: http://localhost:8082/...
❌ Status: 503 Service Unavailable
```

### 5.6 檢查 Railway HTTP Logs

1. Railway Dashboard → Backend 服務 → **Deployments** → **HTTP Logs**
2. 在 Frontend 發送 AI Conversation 消息
3. **應該看到請求記錄**：

```
POST /api/conversation/message 200 OK
POST /api/conversation/start 200 OK
```

---

## 📊 成功標誌總覽

完成所有步驟後，您應該看到：

### Supabase
- ✅ Site URL = Vercel production URL
- ✅ Redirect URLs 包含 `/*` 或所有具體路由
- ✅ 配置已保存

### Vercel
- ✅ 4 個環境變數已設置
- ✅ 最新部署 commit = `8aa26e0`
- ✅ 部署狀態 = Ready

### Railway
- ✅ 最新部署 commit = `8aa26e0` (或更早的穩定版本)
- ✅ 健康檢查返回 `{"status":"ok"}`
- ✅ HTTP Logs 中能看到來自 Vercel 的請求

### Frontend 測試
- ✅ Google 登入成功
- ✅ 自動跳轉到 Dashboard
- ✅ 所有頁面正常載入
- ✅ AI Conversation 正常工作
- ✅ Console 顯示正確的 OAuth redirect URL

### Backend 測試
- ✅ AI Conversation 消息處理成功
- ✅ Suggested Responses 匹配 AI 問題
- ✅ Railway logs 顯示成功處理

---

## 🔍 故障排查

### 問題 A：登入後仍然跳轉到 localhost

**原因**：Supabase Redirect URLs 配置錯誤

**檢查**：
1. Supabase → Authentication → URL Configuration
2. Site URL 是否正確（HTTPS + Vercel domain）
3. Redirect URLs 是否包含 `https://您的domain/*`
4. 是否點擊了 **Save**

**解決**：重新設置 URLs 並保存，然後清除瀏覽器緩存重試

### 問題 B：AI Conversation 仍然顯示 503 錯誤

**原因**：Frontend 環境變數未設置或未生效

**檢查**：
1. Vercel → Settings → Environment Variables
2. `NEXT_PUBLIC_API_BASE` 是否設置正確
3. 是否重新部署 Vercel（取消勾選 Build Cache）

**解決**：確認環境變數，強制重新部署

### 問題 C：AI Conversation 建議不匹配

**原因**：Railway Backend 可能還在使用舊代碼或 Gemini API 失敗

**檢查**：
1. Railway → Deployments → 最新部署的 commit
2. Railway → Deploy Logs → 查找 Gemini API 錯誤

**解決**：
- 如果 commit 不是最新，手動觸發 Redeploy
- 如果 Gemini API 失敗，檢查 `GEMINI_API_KEY` 環境變數

---

## 📋 最終檢查清單

請逐一確認：

### Supabase 配置
- [ ] Site URL = `https://您的-vercel-domain.vercel.app`
- [ ] Redirect URLs 包含 `https://您的-vercel-domain.vercel.app/*`
- [ ] Redirect URLs 包含 `https://您的-vercel-domain.vercel.app/auth/callback`
- [ ] 已點擊 **Save** 保存配置

### Vercel 配置
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已設置
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已設置
- [ ] `NEXT_PUBLIC_API_BASE` 已設置
- [ ] `NEXT_PUBLIC_SITE_URL` 已設置（**您的實際 Vercel URL**）
- [ ] 所有變數都勾選了 **Production** 環境

### Vercel 部署
- [ ] 已觸發重新部署
- [ ] 取消勾選了 "Use existing Build Cache"
- [ ] 部署狀態為 **Ready**
- [ ] Commit = `8aa26e0`

### Railway 配置
- [ ] Backend 環境變數已設置（5 個）
- [ ] 最新部署 commit = `8aa26e0` 或更新

### Railway 部署
- [ ] Backend 正常運行
- [ ] 健康檢查返回 `{"status":"ok"}`
- [ ] HTTP Logs 能看到請求

### 功能測試
- [ ] 清除了瀏覽器 localStorage 和 cookies
- [ ] Google 登入成功
- [ ] 正確跳轉到 Dashboard（不是 localhost）
- [ ] Console 顯示正確的 OAuth redirect URL
- [ ] AI Conversation 測試通過
- [ ] Network 標籤顯示請求到 Railway URL
- [ ] Railway HTTP Logs 有請求記錄

---

## 🎉 完成！

如果所有檢查項都打勾 ✅，恭喜您成功部署到生產環境！

您的應用現在應該：
- ✅ 支持 Google OAuth 登入
- ✅ 正確跳轉到各個功能頁面
- ✅ AI Conversation 正常工作
- ✅ Backend API 正常響應
- ✅ 所有功能可以在 Vercel 上訪問

---

## 📞 需要幫助？

如果仍有問題，請提供：
1. 您的 Vercel URL
2. 瀏覽器 Console 截圖（包含 OAuth redirect URL）
3. Network 標籤截圖（顯示 API 請求）
4. Railway Deploy Logs 截圖（如果 AI Conversation 有問題）
