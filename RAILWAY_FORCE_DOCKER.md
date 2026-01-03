# 🚨 強制 Railway 使用 Dockerfile（Node 20）

## 問題

Railway 仍在使用 **Nixpacks（Node 18）**，儘管我們已經創建了 `railway.toml` 和 `Dockerfile`。

**證據**：
```
Node.js v18.20.5  ← 應該是 Node 20
Error: Missing Supabase environment variables
```

---

## ✅ 解決方案：在 Railway Dashboard 手動配置

### 步驟 1：登入 Railway Dashboard

1. 前往 https://railway.app
2. 選擇您的項目
3. 點擊 **Backend 服務**

---

### 步驟 2：刪除現有部署（清除緩存）

1. 進入 **Settings** 標籤（在服務頁面底部）
2. 向下滾動到 **Danger Zone**
3. 點擊 **"Remove Service from All Environments"**
4. 確認刪除

**⚠️ 不用擔心**：代碼和環境變數不會丟失，只是重置部署配置。

---

### 步驟 3：重新創建服務

1. 回到項目主頁
2. 點擊 **"+ New"** → **"GitHub Repo"**
3. 選擇倉庫：`Leowang1223/talk-learning-already-push`
4. 選擇分支：`main`

---

### 步驟 4：配置服務設置（關鍵步驟）

創建服務後，**立即**進入 **Settings** 標籤：

#### 4.1 設置 Root Directory

找到 **"Root Directory"** 設置：
- **如果是空的**：保持為空（根目錄）
- **如果有值**：確保是空的或 `/`

#### 4.2 設置 Build Command

找到 **"Build Command"**：
- **留空**（讓 Dockerfile 處理）

#### 4.3 設置 Start Command

找到 **"Start Command"**：
```
node apps/backend/dist/server.js
```

#### 4.4 強制使用 Dockerfile

**關鍵步驟**：

1. 找到 **"Builder"** 或 **"Build Settings"** 部分
2. 如果看到 **"Nixpacks"**，點擊更改
3. 選擇 **"Dockerfile"**
4. Dockerfile Path: `Dockerfile`（根目錄）

**如果沒有看到 Builder 選項**：

在 **Settings** 頁面查找 **"Service Variables"** 上方，應該有一個 **"Configure"** 或 **"Build"** 按鈕，點擊它可以看到 Builder 設置。

---

### 步驟 5：重新添加環境變數

進入 **Variables** 標籤，點擊 **"RAW Editor"**，粘貼：

```bash
SUPABASE_URL=https://你的項目ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的完整service_role_key
GEMINI_API_KEY=你的Gemini_API_key
PORT=8082
NODE_ENV=production
```

**⚠️ 重要**：
- 確保 service_role_key 完整（通常很長，以 `eyJ` 開頭）
- 不要有引號
- 不要有多餘空格

點擊 **"Update Variables"**

---

### 步驟 6：手動觸發部署

1. 進入 **Deployments** 標籤
2. 點擊 **"Deploy"** 或 **"Redeploy"**
3. 等待 3-5 分鐘

---

### 步驟 7：驗證部署日誌

部署開始後，點擊最新的 Deployment → **View Logs**

**✅ 成功標誌**（應該看到）：

```
Building Dockerfile
[+] Building ...
=> [builder 1/8] FROM docker.io/library/node:20-alpine
🔍 Environment Variables Check:
NODE_ENV: production
PORT: 8082
SUPABASE_URL exists: true
SUPABASE_SERVICE_ROLE_KEY exists: true
GEMINI_API_KEY exists: true
✅ Server running on port 8082
```

**❌ 失敗標誌**（不應該看到）：

```
Node.js v18.20.5  ← 仍在使用 Node 18
❌ Missing Supabase environment variables!
SUPABASE_URL: MISSING
```

---

## 🔍 替代方案：使用 Railway CLI

如果 Dashboard 無法配置，使用 Railway CLI：

### 安裝 Railway CLI

```bash
npm install -g @railway/cli
```

### 登入

```bash
railway login
```

### 連結項目

```bash
railway link
```

選擇您的項目和 Backend 服務。

### 強制使用 Dockerfile

在項目根目錄執行：

```bash
railway up --dockerfile Dockerfile
```

這會強制使用 Dockerfile 部署。

---

## 📊 成功後的預期結果

### Railway 日誌：

```
✅ Building Dockerfile
✅ Using Node.js 20-alpine
✅ Successfully built backend
✅ 🔍 Environment Variables Check:
✅ NODE_ENV: production
✅ SUPABASE_URL exists: true
✅ SUPABASE_SERVICE_ROLE_KEY exists: true
✅ Server running on port 8082
```

### 測試健康檢查：

```bash
curl https://your-railway-domain.up.railway.app/health
```

應該返回：
```json
{"status":"ok"}
```

---

## 🆘 仍然失敗？

如果完成以上步驟後仍然看到 Node 18 或環境變數錯誤：

1. **截圖 Railway Service Settings**（顯示 Builder 配置）
2. **截圖完整部署日誌**（從開始到錯誤）
3. **確認是否看到 "Building Dockerfile"**

我會立即協助診斷！

---

## 📋 快速檢查清單

- [ ] 刪除並重新創建 Railway 服務
- [ ] 在 Settings 中設置 Builder = "Dockerfile"
- [ ] Root Directory 為空或 `/`
- [ ] Start Command = `node apps/backend/dist/server.js`
- [ ] 所有環境變數已重新添加
- [ ] 手動觸發部署
- [ ] 日誌顯示 "Building Dockerfile" 和 Node 20
- [ ] 環境變數檢查顯示所有變數 exist: true
