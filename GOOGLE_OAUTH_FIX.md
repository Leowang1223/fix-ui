# 🔧 修復 Google OAuth 配置

## 🎯 問題根源

**錯誤配置**：Google Console 的 redirect URI 指向了 Vercel
**正確配置**：應該指向 Supabase

---

## ✅ 正確的配置

### Google Cloud Console

**Authorized redirect URIs** 應該設置為：

```
https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback
```

**❌ 錯誤**（可能的錯誤配置）：
```
https://fix-ui-web.vercel.app/auth/callback  ← 錯誤！
```

**✅ 正確**：
```
https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback  ← 正確！
```

---

## 📋 完整配置步驟

### 步驟 1：配置 Google Cloud Console

#### 1.1 登入 Google Cloud Console

1. 前往 https://console.cloud.google.com
2. 選擇您的項目（或創建新項目）

#### 1.2 啟用 Google+ API（如果還沒啟用）

1. 進入 **APIs & Services** → **Library**
2. 搜索 "Google+ API"
3. 點擊 **Enable**

#### 1.3 創建或編輯 OAuth 2.0 憑證

1. 進入 **APIs & Services** → **Credentials**
2. 如果已有 OAuth 2.0 Client ID：
   - 點擊編輯（鉛筆圖標）
3. 如果沒有：
   - 點擊 **Create Credentials** → **OAuth client ID**
   - Application type 選擇 **Web application**

#### 1.4 配置 Authorized redirect URIs

在 **Authorized redirect URIs** 部分：

**生產環境（必需）**：
```
https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback
```

**本地開發（可選）**：
```
http://localhost:54321/auth/v1/callback
```

#### 1.5 保存並記錄憑證

1. 點擊 **Save**
2. 記下：
   - **Client ID**（例如：`123456789-abc.apps.googleusercontent.com`）
   - **Client Secret**（例如：`GOCSPX-xxx`）

---

### 步驟 2：配置 Supabase

#### 2.1 登入 Supabase Dashboard

1. 前往 https://supabase.com/dashboard
2. 選擇您的項目（`fhgbfuafilqoouldfsdi`）

#### 2.2 配置 Google Provider

1. 進入 **Authentication** → **Providers**
2. 找到 **Google** provider
3. 點擊展開

#### 2.3 輸入 Google 憑證

- **Client ID**：輸入 Google Console 的 Client ID
- **Client Secret**：輸入 Google Console 的 Client Secret
- **Enabled**：確保勾選啟用

#### 2.4 檢查 Callback URL

應該顯示：
```
https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback
```

**這個 URL 應該與 Google Console 中配置的完全一致！**

#### 2.5 保存配置

點擊 **Save** 保存。

---

### 步驟 3：配置 Supabase Redirect URLs

1. 進入 **Authentication** → **URL Configuration**

#### Site URL
```
https://fix-ui-web.vercel.app
```

#### Redirect URLs
```
https://fix-ui-web.vercel.app/*
https://fix-ui-web.vercel.app/auth/callback
```

#### 保存
點擊 **Save**

---

### 步驟 4：配置 Vercel 環境變數

確認以下 4 個環境變數已設置：

```
NEXT_PUBLIC_SUPABASE_URL=https://fhgbfuafilqoouldfsdi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_BASE=https://accomplished-empathy-production-bc93.up.railway.app
NEXT_PUBLIC_SITE_URL=https://fix-ui-web.vercel.app
```

---

### 步驟 5：重新部署 Vercel

1. Vercel Dashboard → Deployments
2. 最新部署 → **⋯** → **Redeploy**
3. 取消勾選 "Use existing Build Cache"
4. 等待部署完成

---

### 步驟 6：測試登入流程

#### 6.1 清除瀏覽器數據

訪問 https://fix-ui-web.vercel.app，打開 Console（F12）：

```javascript
localStorage.clear()
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
location.reload()
```

#### 6.2 測試 Google 登入

1. 點擊 "Sign in with Google"
2. **打開 Network 標籤（F12 → Network）**
3. 觀察請求流程

**✅ 正確的流程**：

```
1. POST https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/authorize
   Response: 包含 Google OAuth URL

2. 跳轉到 Google 登入頁面
   URL: https://accounts.google.com/o/oauth2/v2/auth?...

3. 登入後重定向到 Supabase
   URL: https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback?code=...

4. Supabase 處理後重定向到 Vercel
   URL: https://fix-ui-web.vercel.app/auth/callback?code=...

5. 最終跳轉到 Dashboard
   URL: https://fix-ui-web.vercel.app/dashboard
```

**❌ 錯誤的流程**（如果配置有誤）：

```
❌ 步驟 3 跳轉到錯誤的 URL
   例如：http://localhost:3000/auth/callback
   結果：顯示「網站無法連線」
```

---

## 🔍 診斷工具

### 檢查 Google Console 配置

1. Google Cloud Console → APIs & Services → Credentials
2. 查看 OAuth 2.0 Client ID
3. **Authorized redirect URIs** 應該包含：
   ```
   https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback
   ```

### 檢查 Supabase 配置

1. Supabase Dashboard → Authentication → Providers → Google
2. **Callback URL** 應該顯示：
   ```
   https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback
   ```
3. 這個 URL 應該與 Google Console 中的**完全一致**

---

## 📊 配置總覽

### Google Cloud Console
```
Application type: Web application
Authorized redirect URIs:
  - https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback
  - http://localhost:54321/auth/v1/callback (optional, for local dev)

Client ID: [您的 Client ID]
Client Secret: [您的 Client Secret]
```

### Supabase Authentication Providers
```
Provider: Google
Enabled: ✅
Client ID: [從 Google Console 複製]
Client Secret: [從 Google Console 複製]
Callback URL: https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback
```

### Supabase URL Configuration
```
Site URL: https://fix-ui-web.vercel.app
Redirect URLs:
  - https://fix-ui-web.vercel.app/*
  - https://fix-ui-web.vercel.app/auth/callback
```

### Vercel Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://fhgbfuafilqoouldfsdi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_API_BASE=https://accomplished-empathy-production-bc93.up.railway.app
NEXT_PUBLIC_SITE_URL=https://fix-ui-web.vercel.app
```

---

## ✅ 成功標誌

配置正確後，您應該看到：

### Google Cloud Console
- ✅ Authorized redirect URIs 包含 Supabase callback URL
- ✅ Client ID 和 Secret 已複製到 Supabase

### Supabase
- ✅ Google provider 已啟用
- ✅ Client ID 和 Secret 已設置
- ✅ Callback URL 與 Google Console 一致
- ✅ Site URL 和 Redirect URLs 已配置

### Vercel
- ✅ 4 個環境變數已設置
- ✅ 已重新部署

### 測試
- ✅ Google 登入成功
- ✅ 正確跳轉到 Dashboard
- ✅ 不再顯示「網站無法連線」
- ✅ Network 標籤顯示正確的重定向流程

---

## 🆘 常見錯誤

### 錯誤 A：redirect_uri_mismatch

**錯誤信息**：
```
Error: redirect_uri_mismatch
```

**原因**：Google Console 的 redirect URI 與 Supabase callback URL 不一致

**解決**：
1. 檢查 Google Console → Authorized redirect URIs
2. 確認包含：`https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback`
3. 注意：必須**完全一致**（包括 https、路徑、沒有尾部斜線）

### 錯誤 B：登入後跳轉到 localhost

**原因**：Supabase Redirect URLs 未配置或配置錯誤

**解決**：
1. Supabase → Authentication → URL Configuration
2. Site URL = `https://fix-ui-web.vercel.app`
3. Redirect URLs 包含 `https://fix-ui-web.vercel.app/*`

### 錯誤 C：Invalid client ID or secret

**原因**：Supabase 中的 Google Client ID 或 Secret 錯誤

**解決**：
1. 重新從 Google Console 複製 Client ID 和 Secret
2. 確保沒有多餘空格
3. 在 Supabase 重新設置

---

## 📋 檢查清單

請逐一確認：

### Google Cloud Console
- [ ] 已創建 OAuth 2.0 Client ID
- [ ] Application type = Web application
- [ ] Authorized redirect URIs 包含 `https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback`
- [ ] 已記錄 Client ID 和 Client Secret

### Supabase Providers
- [ ] Google provider 已啟用
- [ ] Client ID 已輸入（從 Google Console 複製）
- [ ] Client Secret 已輸入（從 Google Console 複製）
- [ ] Callback URL 顯示為 `https://fhgbfuafilqoouldfsdi.supabase.co/auth/v1/callback`
- [ ] 已點擊 Save

### Supabase URL Configuration
- [ ] Site URL = `https://fix-ui-web.vercel.app`
- [ ] Redirect URLs 包含 `https://fix-ui-web.vercel.app/*`
- [ ] Redirect URLs 包含 `https://fix-ui-web.vercel.app/auth/callback`
- [ ] 已點擊 Save

### Vercel
- [ ] 4 個環境變數已設置
- [ ] 已重新部署（取消 Build Cache）
- [ ] 部署狀態 = Ready

### 測試
- [ ] 清除了瀏覽器數據
- [ ] Google 登入成功
- [ ] 正確跳轉到 Dashboard
- [ ] Network 顯示正確的重定向流程

---

## 🎉 完成！

完成所有檢查項後，OAuth 登入應該正常工作了！
