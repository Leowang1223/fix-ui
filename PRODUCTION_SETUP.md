# 🚀 生產環境部署配置指南

## 問題：登入後顯示「網站無法連線」

**根本原因**：Supabase OAuth 重定向到錯誤的 URL（localhost 而不是 Vercel）

---

## ✅ 完整配置步驟

### 步驟 1：獲取您的 Vercel URL

1. 前往 https://vercel.com
2. 選擇您的項目（例如：`fix-ui`）
3. 在項目頁面頂部，找到並複製 **Production Domain**

**格式範例**：
```
fix-ui-leowang1223.vercel.app
```

或自定義域名：
```
your-domain.com
```

**⚠️ 重要**：記下完整的 domain，下面會用到！

---

### 步驟 2：配置 Supabase Auth URLs

#### 2.1 登入 Supabase

1. 前往 https://supabase.com/dashboard
2. 選擇您的項目（`fhgbfuafilqoouldfsdi`）

#### 2.2 配置 URL

進入 **Authentication** → **URL Configuration**

##### Site URL

設置為您的 Vercel URL（**使用 HTTPS**）：

```
https://fix-ui-leowang1223.vercel.app
```

**替換為您實際的 Vercel domain！**

##### Redirect URLs

點擊 **Add URL** 添加以下 3 個 URL（替換為您的實際 domain）：

```
https://fix-ui-leowang1223.vercel.app/*
https://fix-ui-leowang1223.vercel.app/auth/callback
https://fix-ui-leowang1223.vercel.app/dashboard
```

**可選（本地開發用）**：保留以下 URL

```
http://localhost:3000/*
http://localhost:3000/auth/callback
```

##### 保存配置

點擊頁面底部的 **Save** 按鈕

---

### 步驟 3：配置 Vercel 環境變數

#### 3.1 添加環境變數

1. 前往 https://vercel.com
2. 選擇您的項目
3. 進入 **Settings** → **Environment Variables**

#### 3.2 添加 3 個必需的環境變數

點擊 **Add New** 添加以下變數：

##### 變數 1：NEXT_PUBLIC_API_BASE

- **Key**: `NEXT_PUBLIC_API_BASE`
- **Value**: `https://accomplished-empathy-production-bc93.up.railway.app`
- **Environments**: 勾選 **Production**, **Preview**, **Development**

##### 變數 2：NEXT_PUBLIC_SITE_URL

- **Key**: `NEXT_PUBLIC_SITE_URL`
- **Value**: `https://fix-ui-leowang1223.vercel.app` （**替換為您的實際 domain**）
- **Environments**: 勾選 **Production**, **Preview**, **Development**

##### 變數 3-4：Supabase 配置（應該已經有了）

確認以下變數已存在：

- `NEXT_PUBLIC_SUPABASE_URL` = `https://fhgbfuafilqoouldfsdi.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 3.3 最終環境變數列表

您應該有 **4 個**環境變數：

```
✅ NEXT_PUBLIC_API_BASE
✅ NEXT_PUBLIC_SITE_URL
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

### 步驟 4：重新部署 Vercel

**⚠️ 必須重新部署才能使用新的環境變數！**

#### 4.1 觸發重新部署

1. 進入 **Deployments** 標籤
2. 找到最新的部署
3. 點擊右側的 **⋯** → **Redeploy**
4. **取消勾選** "Use existing Build Cache"（強制完整重建）
5. 點擊 **Redeploy**
6. 等待 2-3 分鐘

#### 4.2 確認部署成功

等待部署完成後，狀態應該顯示為 **Ready**

---

### 步驟 5：測試登入流程

#### 5.1 清除瀏覽器數據

1. 訪問您的 Vercel URL
2. 打開瀏覽器 Console（**F12 → Console**）
3. 執行以下代碼清除舊數據：

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

#### 5.2 測試 Google 登入

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

#### 5.3 使用 Network 標籤檢查

打開 **F12 → Network** 標籤，觀察登入流程：

**正確的流程**：

```
1. POST https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/authorize
   → 狀態碼：200

2. 跳轉到 Google 登入頁面

3. 登入後跳轉到：
   https://fix-ui-leowang1223.vercel.app/auth/callback?code=xxx

4. GET /auth/callback
   → 狀態碼：307 (Redirect)

5. 最終跳轉到：
   https://fix-ui-leowang1223.vercel.app/dashboard
```

**錯誤的流程**（如果配置有誤）：

```
❌ 跳轉到：http://localhost:3000/auth/callback
   → 顯示「網站無法連線」
```

---

## 📊 成功標誌

完成所有配置後，您應該看到：

### Supabase Dashboard
- ✅ Site URL 設置為 Vercel URL
- ✅ Redirect URLs 包含 Vercel callback URL

### Vercel Dashboard
- ✅ 4 個環境變數已設置
- ✅ 最新部署狀態為 Ready

### 瀏覽器 Console
```
✅ 🔐 OAuth redirect URL: https://your-vercel-domain.vercel.app/auth/callback
❌ 不應該有任何警告
```

### 功能測試
- ✅ Google 登入成功
- ✅ 自動跳轉到 Dashboard
- ✅ 不顯示「網站無法連線」
- ✅ Dashboard 正常顯示

---

## 🔍 常見問題排查

### 問題 A：仍然跳轉到 localhost

**原因**：Supabase Redirect URLs 未正確配置

**檢查**：
1. Supabase Dashboard → Authentication → URL Configuration
2. 確認 Site URL 和 Redirect URLs 都是 **HTTPS + Vercel domain**
3. 確認沒有拼寫錯誤
4. 點擊 **Save** 保存

### 問題 B：Console 顯示 "OAuth redirect URL: undefined"

**原因**：Vercel 環境變數未生效

**檢查**：
1. Vercel Dashboard → Settings → Environment Variables
2. 確認 `NEXT_PUBLIC_SITE_URL` 已設置
3. 確認環境變數勾選了 **Production**
4. 重新部署 Vercel（取消勾選 Build Cache）

### 問題 C：登入後顯示空白頁

**原因**：Dashboard 路由問題或 API 連接問題

**檢查**：
1. 瀏覽器 Console 是否有錯誤？
2. Network 標籤是否有 API 請求？
3. Railway Backend 是否正常運行？
   - 訪問：`https://accomplished-empathy-production-bc93.up.railway.app/health`
   - 應該返回：`{"status":"ok"}`

### 問題 D：Supabase 錯誤 "Invalid redirect URL"

**原因**：Redirect URL 不在 Supabase 允許列表中

**解決**：
1. Supabase Dashboard → Authentication → URL Configuration
2. 添加完整的 callback URL：
   ```
   https://your-vercel-domain.vercel.app/auth/callback
   ```
3. 點擊 **Save**
4. 重新測試登入

---

## 📋 配置檢查清單

請確認以下所有項目：

### Supabase 配置
- [ ] Site URL = `https://your-vercel-domain.vercel.app`
- [ ] Redirect URLs 包含 `https://your-vercel-domain.vercel.app/*`
- [ ] Redirect URLs 包含 `https://your-vercel-domain.vercel.app/auth/callback`
- [ ] 已點擊 **Save** 保存配置

### Vercel 環境變數
- [ ] `NEXT_PUBLIC_API_BASE` 已設置
- [ ] `NEXT_PUBLIC_SITE_URL` 已設置
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已設置
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已設置
- [ ] 所有變數都勾選了 **Production** 環境

### Vercel 部署
- [ ] 已重新部署（取消勾選 Build Cache）
- [ ] 部署狀態為 **Ready**
- [ ] 使用的是最新的 commit（3f361c4）

### Railway Backend
- [ ] Backend 正常運行
- [ ] Health check 返回 `{"status":"ok"}`
- [ ] HTTP Logs 中能看到來自 Vercel 的請求

### 測試
- [ ] 清除了瀏覽器 localStorage 和 cookies
- [ ] Google 登入成功
- [ ] 正確跳轉到 Dashboard
- [ ] Console 顯示正確的 redirect URL

---

## 🆘 仍然有問題？

如果完成所有步驟後仍然失敗，請提供：

1. **Vercel URL**（您的實際 domain）
2. **瀏覽器 Console 截圖**（包含 OAuth redirect URL 日誌）
3. **Network 標籤截圖**（顯示 authorize 和 callback 請求）
4. **Supabase URL Configuration 截圖**（隱藏敏感值）

我會立即協助診斷！

---

## 📌 快速參考

### Vercel Environment Variables

```bash
# Backend API
NEXT_PUBLIC_API_BASE=https://accomplished-empathy-production-bc93.up.railway.app

# Frontend Site URL (替換為您的實際 domain)
NEXT_PUBLIC_SITE_URL=https://fix-ui-leowang1223.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://fhgbfuafilqoouldfsdi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Auth URLs

**Site URL**:
```
https://fix-ui-leowang1223.vercel.app
```

**Redirect URLs** (點擊 Add URL 添加):
```
https://fix-ui-leowang1223.vercel.app/*
https://fix-ui-leowang1223.vercel.app/auth/callback
https://fix-ui-leowang1223.vercel.app/dashboard
```

**替換所有 `fix-ui-leowang1223.vercel.app` 為您的實際 Vercel domain！**
