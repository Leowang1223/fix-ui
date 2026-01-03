# 🚀 部署指南

本專案使用 **Vercel (Frontend) + Railway (Backend)** 進行部署。

---

## 📦 部署架構

```
Frontend (Next.js)  →  Vercel
Backend (Express)   →  Railway
Database & Auth     →  Supabase
```

---

## 🔧 前置準備

### 1. 必要帳號
- ✅ [GitHub](https://github.com) 帳號（已有）
- ✅ [Vercel](https://vercel.com) 帳號（使用 GitHub 登入）
- ✅ [Railway](https://railway.app) 帳號（使用 GitHub 登入）
- ✅ [Supabase](https://supabase.com) 帳號（已有）

### 2. API Keys 準備清單
請準備以下 API keys（從您的 `.env` 文件中獲取）：

**Supabase:**
- `SUPABASE_URL`: 您的 Supabase 專案 URL
- `SUPABASE_ANON_KEY`: Supabase 匿名金鑰（Frontend 使用）
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 服務金鑰（Backend 使用）

**Gemini:**
- `GEMINI_API_KEY`: Google Gemini API 金鑰

---

## 🚂 步驟 1: 部署 Backend 到 Railway

### 1.1 登入 Railway
1. 前往 [railway.app](https://railway.app)
2. 點擊 **"Login with GitHub"**
3. 授權 Railway 訪問您的 GitHub repositories

### 1.2 創建新專案
1. 點擊 **"New Project"**
2. 選擇 **"Deploy from GitHub repo"**
3. 選擇您的 repository: `Leowang1223/teach4`（Backend repo）
4. Railway 會自動偵測到 Node.js 專案

### 1.3 配置 Backend
1. 在 Railway Dashboard 中，點擊您的服務
2. 前往 **"Variables"** 標籤
3. 添加以下環境變數：

```bash
# Supabase 配置
SUPABASE_URL=你的Supabase專案URL
SUPABASE_SERVICE_ROLE_KEY=你的Supabase服務金鑰

# Gemini API
GEMINI_API_KEY=你的Gemini_API金鑰

# 服務器配置
PORT=8082
NODE_ENV=production
```

### 1.4 設置 Root Directory（重要！）
因為 Backend 在 monorepo 的子目錄中：
1. 前往 **"Settings"** 標籤
2. 找到 **"Root Directory"**
3. 設置為：`/`（Backend repo 是獨立的，不需要子目錄）
4. 找到 **"Build Command"**，確認為：`npm install && npm run build`
5. 找到 **"Start Command"**，確認為：`npm start`

### 1.5 部署並獲取 URL
1. Railway 會自動開始構建和部署
2. 部署完成後，點擊 **"Settings"** → **"Generate Domain"**
3. 複製生成的 URL（例如：`https://your-app.up.railway.app`）
4. **保存此 URL**，稍後配置 Frontend 時需要使用

### 1.6 驗證 Backend
訪問：`https://your-backend-url.up.railway.app/health`
應該看到：`{ "status": "ok" }`

---

## ▲ 步驟 2: 部署 Frontend 到 Vercel

### 2.1 登入 Vercel
1. 前往 [vercel.com](https://vercel.com)
2. 點擊 **"Sign Up"** → **"Continue with GitHub"**
3. 授權 Vercel 訪問您的 GitHub repositories

### 2.2 導入專案
1. 在 Vercel Dashboard，點擊 **"Add New..."** → **"Project"**
2. 選擇 repository: `Leowang1223/fix-ui`
3. Vercel 會自動偵測到 Next.js 專案

### 2.3 配置 Frontend
在 **"Configure Project"** 頁面：

**Framework Preset:** Next.js（自動偵測）

**Root Directory:** 點擊 **"Edit"**，設置為 `apps/web`

**Build Command:** 保持默認 `npm run build`

**Output Directory:** 保持默認 `.next`

### 2.4 設置環境變數
點擊 **"Environment Variables"**，添加以下變數：

```bash
# Backend API（使用剛才從 Railway 獲取的 URL）
NEXT_PUBLIC_API_BASE=https://your-backend-url.up.railway.app

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=你的Supabase專案URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名金鑰
```

### 2.5 部署
1. 點擊 **"Deploy"**
2. Vercel 會開始構建和部署
3. 等待部署完成（通常 2-3 分鐘）
4. 部署成功後會顯示您的網站 URL（例如：`https://your-app.vercel.app`）

### 2.6 配置 Supabase Redirect URL
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 前往 **Authentication** → **URL Configuration**
4. 在 **Site URL** 中填入：`https://your-app.vercel.app`
5. 在 **Redirect URLs** 中添加：
   - `https://your-app.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`（用於本地開發）

---

## ✅ 步驟 3: 驗證部署

### 3.1 測試 Backend
訪問以下端點確認 Backend 正常運行：
- Health Check: `https://your-backend.railway.app/health`
- Lessons API: `https://your-backend.railway.app/api/lessons`

### 3.2 測試 Frontend
1. 訪問您的 Vercel URL：`https://your-app.vercel.app`
2. 測試以下功能：
   - ✅ 註冊/登入頁面
   - ✅ Google OAuth 登入
   - ✅ Dashboard 顯示課程
   - ✅ 課程播放與評分
   - ✅ AI Conversation 功能

### 3.3 常見問題排查
如果遇到問題，檢查以下項目：

**Backend 無法連接:**
- 檢查 Railway 的環境變數是否正確設置
- 查看 Railway Logs：Dashboard → Deployments → View Logs

**Frontend 無法連接 Backend:**
- 確認 `NEXT_PUBLIC_API_BASE` 環境變數正確
- 在瀏覽器 Console 查看是否有 CORS 錯誤

**Google OAuth 不工作:**
- 確認 Supabase Redirect URLs 已正確配置
- 檢查 Google Cloud Console 的授權重定向 URI

---

## 🔄 自動部署

### Frontend (Vercel)
✅ 已自動配置！每次 push 到 `main` 分支會自動觸發 Vercel 重新部署

### Backend (Railway)
✅ 已自動配置！每次 push 到 Backend repo 的 `main` 分支會自動觸發 Railway 重新部署

---

## 📊 監控與日誌

### Vercel Dashboard
- 部署歷史：查看每次部署的狀態
- 日誌：查看 build 和 runtime logs
- Analytics：查看網站流量和性能

### Railway Dashboard
- Metrics：CPU、Memory、Network 使用情況
- Logs：實時查看應用日誌
- Deployments：查看部署歷史

---

## 💰 成本估算

### Vercel (Free Tier)
- ✅ 免費 100GB 流量/月
- ✅ 免費自動 SSL
- ✅ 無限部署次數

### Railway (Free Trial)
- ✅ $5 免費額度（每月）
- 估計使用：約 $5-10/月（小型應用）
- 超出後需付費

### Supabase (Free Tier)
- ✅ 免費 500MB 資料庫
- ✅ 免費 2GB 檔案儲存
- ✅ 50,000 月活躍用戶

**總計：每月約 $0-10（初期完全免費）**

---

## 🎯 下一步

部署完成後，您可以：
1. 📧 設置自定義域名（在 Vercel 中配置）
2. 📊 啟用 Analytics（Vercel Analytics）
3. 🔔 設置 Railway 使用量警報
4. 🚀 邀請用戶開始使用！

---

## 📞 需要協助？

遇到問題請檢查：
1. Railway Logs：查看 Backend 錯誤
2. Vercel Logs：查看 Frontend 錯誤
3. Supabase Logs：查看資料庫/認證錯誤
