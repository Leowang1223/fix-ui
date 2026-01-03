# Railway 部署调试指南

## 问题：AI Conversation 处理消息失败

**症状**：
- ✅ 第一句话正常（说明 Backend 和 Gemini API 都正常）
- ✅ 建议回复正常
- ❌ 用户发送消息后显示 "Failed to process your message"

---

## 📋 需要检查的环境变量

### 1. 登录 Railway Dashboard

前往：https://railway.app → 选择您的项目 → 点击服务

### 2. 检查环境变量（Variables 标签）

**必须设置的变量**：

```bash
# Supabase 配置（必需）
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Gemini API（必需）
GEMINI_API_KEY=AIzaSy...

# 服务器配置（可选，有默认值）
PORT=8082
NODE_ENV=production
```

### 3. 如何获取这些值

#### Supabase 配置：
1. 前往 https://supabase.com/dashboard
2. 选择您的项目
3. 进入 **Settings** → **API**
4. 复制：
   - `URL` → SUPABASE_URL
   - `service_role` key（secret）→ SUPABASE_SERVICE_ROLE_KEY

#### Gemini API Key：
1. 前往 https://makersuite.google.com/app/apikey
2. 创建或复制 API Key

---

## 🔍 检查 Railway 日志

### 查看实时日志：

1. Railway Dashboard → Deployments → 最新部署
2. 点击 **View Logs**
3. 查找错误信息：

**可能的错误**：

#### 错误 1: Supabase 连接失败
```
❌ Error processing message: Error: Invalid Supabase credentials
```

**解决方案**：
- 检查 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 是否正确
- 确保 service_role key 是完整的（很长）

#### 错误 2: Gemini API 失败
```
❌ AI Reply Error: Error: API key not valid
```

**解决方案**：
- 检查 `GEMINI_API_KEY` 是否正确
- 确认 Gemini API 配额未用尽

#### 错误 3: 数据库表缺失
```
❌ Error: relation "conversation_sessions" does not exist
```

**解决方案**：
- 在 Supabase 中创建必要的表（见下方 SQL）

---

## 🗄️ Supabase 表结构检查

### 需要的表

运行以下 SQL（在 Supabase SQL Editor）：

```sql
-- 检查 conversation_sessions 表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'conversation_sessions';

-- 如果不存在，创建它：
CREATE TABLE IF NOT EXISTS public.conversation_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL,
  scenario_id TEXT,
  ai_role TEXT,
  user_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  conversation_data JSONB,
  messages_count INTEGER DEFAULT 0,
  checkpoints JSONB,
  is_active BOOLEAN DEFAULT true
);

-- 启用 RLS (Row Level Security)
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Users can view own sessions"
  ON public.conversation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.conversation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.conversation_sessions FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 🧪 测试 Backend API

### 测试健康检查：

```bash
curl https://your-railway-domain.up.railway.app/health
```

应该返回：
```json
{"status":"ok"}
```

### 测试 Gemini API 连接：

查看 Railway 日志，在启动时应该看到：
```
✅ Gemini API initialized successfully
```

---

## 📝 完整检查清单

- [ ] **Railway 环境变量已设置**：
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] GEMINI_API_KEY

- [ ] **Supabase 表已创建**：
  - [ ] conversation_sessions 表存在
  - [ ] RLS 策略已启用

- [ ] **Railway 部署成功**：
  - [ ] Container 状态为 Active
  - [ ] 日志中没有错误

- [ ] **Frontend 配置正确**：
  - [ ] NEXT_PUBLIC_API_BASE 指向 Railway URL
  - [ ] NEXT_PUBLIC_SUPABASE_URL 正确
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY 正确

---

## 🔧 快速修复步骤

### 1. 设置所有环境变量

在 Railway Dashboard → Variables → Raw Editor，粘贴：

```bash
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的完整service_role_key
GEMINI_API_KEY=你的Gemini_API_key
PORT=8082
NODE_ENV=production
```

### 2. 等待自动重新部署

Railway 检测到环境变量更改后会自动重新部署（约 2-3 分钟）

### 3. 检查日志

查看新的部署日志，确认没有错误

### 4. 测试 Frontend

刷新 Frontend 页面，重新测试 AI conversation

---

## 📞 仍然有问题？

如果完成以上步骤后仍然失败：

1. **截图 Railway 日志**（特别是错误部分）
2. **截图 Railway 环境变量列表**（隐藏敏感值）
3. **截图 Browser Console 错误**（F12 → Console）
4. 提供这些信息以便进一步诊断

---

## ✅ 成功标志

完成修复后，您应该看到：

- Railway 日志：无错误，显示 "✅ Message processed successfully"
- Frontend：能够正常发送消息并收到 AI 回复
- Browser Console：无 500 错误
