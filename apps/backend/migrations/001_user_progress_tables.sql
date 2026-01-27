-- ============================================
-- 用戶進度追蹤資料表
-- 執行此 SQL 在 Supabase Dashboard > SQL Editor
-- ============================================

-- 1. 用戶每日目標設定表
CREATE TABLE IF NOT EXISTS user_daily_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lessons_goal INTEGER DEFAULT 3,
  minutes_goal INTEGER DEFAULT 30,
  questions_goal INTEGER DEFAULT 10,
  conversations_goal INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. 每日進度追蹤表
CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  lessons_completed INTEGER DEFAULT 0,
  minutes_studied INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  conversations_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 3. 用戶里程碑表
CREATE TABLE IF NOT EXISTS user_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_order INTEGER NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  target INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- lessons, streak, score, conversations
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 用戶成就表
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- 索引優化
-- ============================================

-- daily_progress 索引
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date
ON daily_progress(user_id, date DESC);

-- user_milestones 索引
CREATE INDEX IF NOT EXISTS idx_user_milestones_user
ON user_milestones(user_id, milestone_order);

-- user_achievements 索引
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
ON user_achievements(user_id, unlocked_at DESC);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- 啟用 RLS
ALTER TABLE user_daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- user_daily_goals 政策
CREATE POLICY "Users can view own daily goals" ON user_daily_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily goals" ON user_daily_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily goals" ON user_daily_goals
  FOR UPDATE USING (auth.uid() = user_id);

-- daily_progress 政策
CREATE POLICY "Users can view own daily progress" ON daily_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily progress" ON daily_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily progress" ON daily_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- user_milestones 政策
CREATE POLICY "Users can view own milestones" ON user_milestones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestones" ON user_milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own milestones" ON user_milestones
  FOR UPDATE USING (auth.uid() = user_id);

-- user_achievements 政策
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Service Role 繞過 RLS (後端使用)
-- ============================================

-- 允許 service_role 繞過 RLS 以便後端 API 操作
-- Supabase 預設已允許 service_role 繞過 RLS

-- ============================================
-- 自動更新 updated_at 觸發器
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_daily_goals_updated_at
  BEFORE UPDATE ON user_daily_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_progress_updated_at
  BEFORE UPDATE ON daily_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_milestones_updated_at
  BEFORE UPDATE ON user_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
