# 🚨 紧急修复：Railway 环境变量缺失

## 错误信息

```
Error: Missing Supabase environment variables
at Object.<anonymous> (/app/apps/backend/dist/lib/supabase.js:9:11)
```

**根本原因**：Railway Backend **没有正确获取到 Supabase 环境变量**，导致服务启动就崩溃。

---

## ✅ 立即修复步骤

### 步骤 1：检查 Railway 环境变量

1. 前往 https://railway.app
2. 选择您的项目
3. 点击 Backend 服务
4. 进入 **Variables** 标签
5. 检查是否有以下变量（**变量名必须完全一致**）：

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

---

### 步骤 2：正确设置环境变量

#### 方法 A：使用 RAW Editor（推荐）

1. 在 Variables 标签中，点击 **RAW Editor**
2. **删除所有现有内容**
3. 粘贴以下内容（**替换为您的真实值**）：

```bash
SUPABASE_URL=https://您的项目ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.完整的service_role_key不要截断
GEMINI_API_KEY=AIzaSy完整的API_key不要截断
PORT=8082
NODE_ENV=production
```

**⚠️ 关键注意事项**：
- ✅ 不要有引号：`SUPABASE_URL=https://xxx.supabase.co`（正确）
- ❌ 不要加引号：`SUPABASE_URL="https://xxx.supabase.co"`（错误）
- ✅ 不要有空格：`GEMINI_API_KEY=AIzaSy...`（正确）
- ❌ 不要有空格：`GEMINI_API_KEY = AIzaSy...`（错误）
- ✅ service_role_key 必须完整（通常很长，以 `eyJ` 开头）

4. 点击 **Update Variables**

---

### 步骤 3：获取正确的环境变量值

#### 获取 Supabase 配置

1. 前往 https://supabase.com/dashboard
2. 选择您的项目
3. 进入 **Settings** → **API**
4. 复制：
   - **URL** → `SUPABASE_URL`
   - **service_role** key（secret，点击 reveal 显示）→ `SUPABASE_SERVICE_ROLE_KEY`

**注意**：
- ❌ 不要用 `anon` / `public` key
- ✅ 必须用 **service_role** key（这是 secret key）

#### 获取 Gemini API Key

1. 前往 https://makersuite.google.com/app/apikey
2. 创建或复制 API Key
3. 格式类似：`AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX`

---

### 步骤 4：触发重新部署

设置环境变量后，Railway 应该会自动重新部署。如果没有：

1. 点击 **Deployments** 标签
2. 点击右上角 **"..."** → **"Redeploy"**
3. 等待 2-3 分钟

---

### 步骤 5：验证修复

#### 5.1 检查 Railway 日志

1. Deployments → 最新部署 → **View Logs**
2. 应该看到：
   ```
   ✅ Server running on port 8082
   ✅ Health check endpoint: /health
   ```

**不应该看到**：
```
❌ Error: Missing Supabase environment variables
❌ npm error Lifecycle script `start` failed
```

#### 5.2 测试健康检查

访问：`https://your-railway-domain.up.railway.app/health`

应该返回：
```json
{"status":"ok"}
```

#### 5.3 测试 Frontend

1. 刷新 Frontend 页面
2. 测试 Scenario Mode
3. 应该能正常发送消息

---

## 🔍 常见问题排查

### 问题 A：变量设置后仍然报错

**可能原因**：
1. service_role_key 被截断了（太长，复制不完整）
2. URL 格式错误（多了或少了字符）
3. Railway 缓存了旧的环境变量

**解决方案**：
1. **重新复制** service_role_key（确保完整）
2. **手动触发 Redeploy**
3. 检查 Variables 标签，确认值已保存

---

### 问题 B：找不到 service_role key

在 Supabase Dashboard：
1. **Settings** → **API**
2. 找到 **Project API keys** 部分
3. 看到两个 key：
   - `anon` / `public` key（短的）← **不要用这个**
   - `service_role` key（很长，标记为 secret）← **用这个**
4. 点击 **Reveal** 显示完整的 key
5. 复制完整的 key（通常 200+ 字符）

---

### 问题 C：仍然显示 "Missing Supabase environment variables"

**检查步骤**：

1. Railway Dashboard → Variables → 确认变量名**完全一致**：
   - ✅ `SUPABASE_URL`（正确）
   - ❌ `NEXT_PUBLIC_SUPABASE_URL`（错误，这是 Frontend 用的）
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`（正确）
   - ❌ `SUPABASE_ANON_KEY`（错误）

2. 点击每个变量，检查值**没有多余空格**

3. 手动触发 Redeploy

---

## 📋 完整环境变量检查清单

在 Railway Variables 中，应该有以下变量：

- [ ] `SUPABASE_URL` = `https://项目ID.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `eyJ开头的很长的字符串`
- [ ] `GEMINI_API_KEY` = `AIzaSy开头的字符串`
- [ ] `PORT` = `8082`（可选）
- [ ] `NODE_ENV` = `production`（可选）

---

## 🧪 验证示例

### 正确的 RAW Editor 内容

```bash
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYxMjEyMzQ1NiwiZXhwIjoxOTI3Njk5NDU2fQ.完整的签名字符串不要截断
GEMINI_API_KEY=AIzaSyAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTt
PORT=8082
NODE_ENV=production
```

---

## ✅ 成功标志

修复后，您应该看到：

1. **Railway Logs**：
   ```
   ✅ Server running on port 8082
   ✅ Supabase client initialized
   ```

2. **Health Check**：
   ```
   https://your-app.railway.app/health → {"status":"ok"}
   ```

3. **Frontend**：
   - Scenario Mode 正常工作
   - Suggested Responses 匹配 AI 问题

---

## 🆘 紧急联系

如果完成以上步骤后仍然失败，提供：

1. **Railway Variables 截图**（隐藏敏感值，只显示变量名）
2. **Railway Logs 完整截图**（从启动到错误）
3. **Supabase API Settings 截图**（URL 部分）

我会立即帮您诊断！
