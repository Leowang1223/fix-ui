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
  mode TEXT NOT NULL,

  -- Scenario 模式专用字段
  scenario_id TEXT,
  user_role TEXT,
  ai_role TEXT,
  checkpoints JSONB,

  -- 会话数据
  conversation_data JSONB,
  messages_count INTEGER DEFAULT 0,

  -- Review 模式专用字段
  reviewed_lessons JSONB,
  vocabulary_items JSONB,

  -- 请求设置
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
CREATE POLICY "Users can view own conversation sessions"
  ON public.conversation_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversation sessions"
  ON public.conversation_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation sessions"
  ON public.conversation_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

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
