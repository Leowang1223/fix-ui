# 🔧 Railway 環境變數配置檢查

## 🎯 問題診斷

從 F12 Console 的錯誤信息：
```
Access to fetch at "https://accomplished-empathy-production-bc93.up.railway.app/api/lessons"
from origin "https://fix-ui-web.vercel.app" has been blocked by CORS policy
```

**這表示 Railway Backend 的 CORS 配置沒有允許 Vercel 域名的請求。**

---

## 🔴 根本原因

server.ts 的 CORS 配置根據 `NODE_ENV` 環境變數決定允許的域名：

```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://fix-ui-web.vercel.app',
        'https://fix-ui-leowang1223.vercel.app',
        /\.vercel\.app$/
      ]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
```

**如果 `NODE_ENV` 不是 `production`**：
- CORS 只允許 `localhost:3000`
- Vercel 的請求會被阻止 ❌

---

## ✅ 立即修復步驟

### 步驟 1：檢查 Railway 環境變數

1. 前往 https://railway.app
2. 選擇您的 Backend 項目
3. 進入 **Variables** 標籤

### 步驟 2：確認必需的環境變數

**檢查以下變數是否存在**：

| Variable Name | Required Value | 狀態 |
|---------------|----------------|------|
| `NODE_ENV` | `production` | ⚠️ **必須** |
| `PORT` | `8082` | 可選（Railway 會自動設置） |
| `SUPABASE_URL` | `https://fhgbfuafilqoouldfsdi.supabase.co` | ✅ 必須 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | ✅ 必須 |
| `GEMINI_API_KEY` | `your_gemini_key` | ✅ 必須 |

### 步驟 3：添加缺失的環境變數

**如果 `NODE_ENV` 不存在或不是 `production`**：

1. 點擊 **New Variable**
2. Variable Name: `NODE_ENV`
3. Value: `production`
4. 點擊 **Add**

### 步驟 4：重新部署 Railway

**⚠️ 重要**：添加或修改環境變數後，**必須重新部署**！

#### 方法 A：手動觸發部署（推薦）

1. 進入 **Deployments** 標籤
2. 點擊右上角 **Deploy** 按鈕
3. 選擇 **Redeploy** 或 **Deploy from main branch**
4. 等待 3-5 分鐘

#### 方法 B：推送新 commit 觸發部署

```bash
git commit --allow-empty -m "Trigger Railway redeploy"
git push
```

---

## 📋 驗證部署

### 驗證 1：檢查 Deploy Logs

1. Railway → Deployments → 最新部署
2. 查看 **Deploy Logs**

**✅ 應該看到**：
```
Server running on port XXXX
Environment: production
CORS enabled for: Vercel domains
```

**❌ 如果看到**：
```
Environment: development
CORS enabled for: localhost
```
→ 表示 `NODE_ENV` 未設置或未生效

### 驗證 2：測試 CORS

在瀏覽器 Console 執行：

```javascript
fetch('https://accomplished-empathy-production-bc93.up.railway.app/api/lessons', {
  headers: {
    'Origin': 'https://fix-ui-web.vercel.app'
  }
})
  .then(res => res.json())
  .then(data => console.log('✅ Success:', data))
  .catch(err => console.error('❌ CORS blocked:', err))
```

**✅ 成功**：應該返回課程列表
**❌ 失敗**：仍然顯示 CORS 錯誤

### 驗證 3：檢查回應標頭

1. **F12 → Network** 標籤
2. 嘗試訪問 Dashboard
3. 找到對 `api/lessons` 的請求
4. 查看 **Response Headers**

**✅ 應該包含**：
```
access-control-allow-origin: https://fix-ui-web.vercel.app
access-control-allow-credentials: true
```

**❌ 如果缺失**：
- CORS 配置未生效
- 檢查 Railway 環境變數

---

## 🔍 進階診斷

### 如果 NODE_ENV=production 但仍然 CORS 錯誤

#### 檢查 1：確認最新代碼已部署

1. Railway → Deployments
2. 檢查最新部署的 commit SHA
3. 應該是 `31b7268` 或更新

**如果不是最新 commit**：
- 手動觸發重新部署
- 或推送新 commit

#### 檢查 2：確認 Railway 使用 Dockerfile

railway.toml 應該包含：
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
```

**如果缺失**：
- Railway 可能使用 Nixpacks
- 需要推送 railway.toml 並重新部署

#### 檢查 3：檢查 Railway 服務日誌

1. Railway → Deployments → 最新部署
2. 查看 **Logs**（非 Deploy Logs）
3. 查找 CORS 相關錯誤

**常見錯誤**：
```
UnhandledPromiseRejectionWarning: Error: Missing environment variables
```
→ 環境變數未設置

---

## 📊 完整成功標誌

完成所有步驟後，您應該看到：

### Railway Dashboard
- ✅ `NODE_ENV` = `production`
- ✅ 所有必需環境變數已設置
- ✅ 最新部署 commit = `31b7268` 或更新
- ✅ Deploy Logs 顯示 "Environment: production"
- ✅ Deploy Logs 顯示 "CORS enabled for: Vercel domains"

### API 測試
- ✅ `/health` 返回 200 OK
- ✅ `/api/lessons` 返回 100 個課程的 JSON
- ✅ Response Headers 包含 `access-control-allow-origin: https://fix-ui-web.vercel.app`

### Frontend Dashboard
- ✅ F12 Network 標籤顯示成功的 API 請求（200 OK）
- ✅ **沒有 CORS 錯誤**
- ✅ Dashboard 顯示 10 個章節和 100 個課程

---

## 🆘 如果仍然失敗

### 臨時解決方案：修改 CORS 為寬鬆模式

**僅用於測試**，不建議在生產環境使用：

修改 server.ts CORS 配置為：
```javascript
app.use(cors({
  origin: '*',  // 允許所有域名（不安全）
  credentials: true
}));
```

**如果這樣能成功**：
- 確認問題是 CORS 配置
- 檢查 Railway 環境變數和代碼是否正確

**如果仍然失敗**：
- 問題不在 CORS
- 檢查 Railway 網絡配置或防火牆設置

---

## 📸 診斷截圖請求

**如果完成所有步驟後仍然有 CORS 錯誤**，請提供：

1. **Railway Variables 頁面**（顯示所有環境變數）
2. **Railway Deploy Logs**（顯示啟動信息，特別是 "Environment:" 和 "CORS enabled for:" 這兩行）
3. **F12 Network 標籤**（顯示 `/api/lessons` 請求的 Response Headers）
4. **F12 Console**（顯示完整錯誤信息）

這將幫助我準確診斷問題！
