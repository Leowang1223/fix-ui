# 🔧 修复 AI Conversation 问题

## 问题 1: Suggested Responses 不匹配 AI 问题

**症状**：
- AI 问："你好呀！今天要做什么？"
- 建议显示："好的，开始吧"、"我准备好了"、"可以开始"
- 这些是**会话开始时的建议**，而不是针对 AI 问题的回答

**根本原因**：
Gemini API 生成建议时失败，Backend 使用了 fallback 建议，或者 Frontend 没有更新建议。

---

## 问题 2: Scenario Mode 失败

**症状**：
- 发送消息后显示 "Failed to process your message. Please try again."
- 即使已添加所有环境变量

**根本原因**：
最可能是 Supabase `conversation_sessions` 表不存在或结构不匹配。

---

## 🔍 诊断步骤

### 步骤 1：检查 Railway 日志

1. Railway Dashboard → Deployments → 最新部署 → **View Logs**
2. 发送一条 Scenario mode 消息
3. 查找错误：

**关键错误信息**：
```
❌ Error processing message: ...
relation "conversation_sessions" does not exist
```
或
```
❌ Error processing message: ...
column "checkpoints" does not exist
```

---

## ✅ 修复方案

### 修复 1: 创建/更新 Supabase 表

#### 1.1 登录 Supabase

前往 https://supabase.com/dashboard → 选择您的项目 → **SQL Editor**

#### 1.2 执行以下 SQL

```sql
-- ========================================
-- 删除旧表（如果存在）
-- ========================================
DROP TABLE IF EXISTS public.conversation_sessions CASCADE;

-- ========================================
-- 创建 conversation_sessions 表
-- ========================================
CREATE TABLE public.conversation_sessions (
  -- 主键
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,

  -- 用户信息
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 会话类型
  type TEXT DEFAULT 'conversation',
  mode TEXT NOT NULL, -- 'free', 'scenario', 'all', 'selected'

  -- Scenario 模式专用字段
  scenario_id TEXT,
  user_role TEXT,
  ai_role TEXT,
  checkpoints JSONB, -- [{id, description, keywords, completed}, ...]

  -- 会话数据
  conversation_data JSONB, -- {history: [{role, text, timestamp}, ...]}
  messages_count INTEGER DEFAULT 0,

  -- Review 模式专用字段
  reviewed_lessons JSONB, -- [lessonId1, lessonId2, ...]
  vocabulary_items JSONB, -- [{word, pinyin, english, lessonId}, ...]

  -- 请求设置（保存原始请求）
  settings JSONB,

  -- 状态
  is_active BOOLEAN DEFAULT true,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ========================================
-- 创建索引
-- ========================================
CREATE INDEX idx_conv_sessions_user_id ON public.conversation_sessions(user_id);
CREATE INDEX idx_conv_sessions_session_id ON public.conversation_sessions(session_id);
CREATE INDEX idx_conv_sessions_active ON public.conversation_sessions(is_active) WHERE is_active = true;

-- ========================================
-- 启用 Row Level Security
-- ========================================
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 创建 RLS 策略
-- ========================================

-- 用户可以查看自己的会话
CREATE POLICY "Users can view own conversation sessions"
  ON public.conversation_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以创建自己的会话
CREATE POLICY "Users can create own conversation sessions"
  ON public.conversation_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的会话
CREATE POLICY "Users can update own conversation sessions"
  ON public.conversation_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 用户可以删除自己的会话
CREATE POLICY "Users can delete own conversation sessions"
  ON public.conversation_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 验证表创建成功
-- ========================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'conversation_sessions'
ORDER BY ordinal_position;
```

#### 1.3 验证结果

执行后应该看到表的所有列：
- ✅ `id`, `session_id`, `user_id`
- ✅ `type`, `mode`
- ✅ `scenario_id`, `user_role`, `ai_role`, `checkpoints`
- ✅ `conversation_data`, `messages_count`
- ✅ 等等...

---

### 修复 2: 检查并重启 Railway

#### 2.1 验证环境变量

Railway Dashboard → Variables → 确认有：
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...（完整的 key）
GEMINI_API_KEY=AIzaSy...
PORT=8082
NODE_ENV=production
```

#### 2.2 手动触发重新部署

如果环境变量已正确，但服务仍在使用旧配置：

1. Railway Dashboard → Deployments
2. 点击右上角 **"..."** → **"Redeploy"**
3. 等待重新部署完成（2-3 分钟）

---

### 修复 3: 增强错误处理（可选）

如果还是有问题，可以添加更详细的日志：

#### 3.1 检查 Backend 日志格式

在 Railway Logs 中搜索：
```
💬 Processing message for session:
📝 Transcript:
🤖 AI Reply:
```

#### 3.2 常见错误及解决方案

**错误 A**：`relation "conversation_sessions" does not exist`
- **解决方案**：执行上面的 SQL 创建表

**错误 B**：`column "checkpoints" does not exist`
- **解决方案**：删除旧表，重新执行完整的 SQL

**错误 C**：`invalid input syntax for type json`
- **解决方案**：确保 Backend 代码中 `checkpoints` 是 JSONB 格式

**错误 D**：`API key not valid`
- **解决方案**：检查 `GEMINI_API_KEY` 是否正确

---

## 🧪 测试修复

### 测试 1: Scenario Mode

1. 选择任意 Scenario（例如：Restaurant Ordering）
2. 点击 "Start Conversation"
3. 发送一条消息
4. **预期结果**：
   - ✅ 收到 AI 回复
   - ✅ Suggested responses 更新
   - ✅ Checkpoints 显示进度
   - ❌ 不应显示 "Failed to process"

### 测试 2: All Completed Chapters Mode

1. 选择 "All Completed Lessons"
2. 点击 "Start Conversation"
3. AI 说："你好呀！今天要做什么？"
4. **预期的 Suggested Responses**：
   - ✅ "很好，你呢？"（回答问候）
   - ✅ "我今天要上課"（回答今天做什么）
   - ✅ "最近很忙"（回答近况）
   - ❌ **不应该是**："好的，开始吧"（这是开始对话的建议）

### 测试 3: 检查 Railway 日志

发送消息后，Railway Logs 应该显示：
```
✅ 💬 Processing message for session: xxx
✅ 📝 Transcript: 你好
✅ 🤖 AI Reply: {chinese: "很好！你呢？", english: "Great! How about you?"}
✅ Message processed successfully
```

**不应该有**：
```
❌ Error processing message: ...
❌ relation "conversation_sessions" does not exist
```

---

## 📊 成功标志

完成修复后，您应该看到：

### Scenario Mode
- ✅ 消息发送成功
- ✅ AI 正常回复
- ✅ Checkpoints 显示完成状态
- ✅ Suggested responses 符合对话上下文

### All Completed Chapters Mode
- ✅ 消息发送成功
- ✅ AI 使用复习词汇提问
- ✅ Suggested responses **直接回答 AI 的问题**
- ✅ 建议中包含复习词汇

### Railway Logs
- ✅ 无错误信息
- ✅ 显示 "Message processed successfully"
- ✅ Supabase 更新成功

---

## 🆘 仍然失败？

如果完成以上步骤后仍然有问题，请提供：

1. **Railway 完整日志截图**（从 "Processing message" 开始到错误结束）
2. **Supabase SQL 执行结果截图**（验证表已创建）
3. **Railway 环境变量列表截图**（可以隐藏敏感值）
4. **Browser Console 错误**（F12 → Console → Network → 查看失败的请求）

我会立即帮您诊断！

---

## 快速检查清单

- [ ] 在 Supabase SQL Editor 执行了创建表的 SQL
- [ ] 验证 `conversation_sessions` 表存在且有 `checkpoints` 列
- [ ] Railway 环境变量包含所有必需的值
- [ ] Railway 已重新部署（如果更改了环境变量）
- [ ] 测试 Scenario Mode - 消息发送成功
- [ ] 测试 All Completed Chapters - 建议回复符合 AI 问题
- [ ] Railway 日志无错误
