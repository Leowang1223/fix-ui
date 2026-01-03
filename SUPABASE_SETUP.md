# Supabase 用戶認證系統設置指南

## ✅ 已完成的工作

所有代碼實現已完成並成功編譯！以下是實現的功能：

### 前端
- ✅ Email/密碼註冊與登入
- ✅ Google OAuth 登入
- ✅ 會話管理與路由保護
- ✅ 自動 JWT token 添加到 API 請求
- ✅ localStorage 數據自動遷移到 Supabase

### 後端
- ✅ JWT token 認證中間件
- ✅ Lesson History API (完整 CRUD)
- ✅ Conversation 路由已添加認證和 Supabase 持久化
- ✅ 用戶數據完全隔離

---

## 📋 您需要完成的設置步驟

### 步驟 1: 創建 Supabase 專案

1. 前往 https://supabase.com/dashboard
2. 創建新專案或使用現有專案
3. 等待專案初始化完成

### 步驟 2: 獲取 API 憑證

在 **Project Settings > API** 中複製以下值：

- `Project URL` (形如 `https://xxxxx.supabase.co`)
- `anon public` key
- `service_role` key (⚠️ 保密！)

### 步驟 3: 配置環境變數

#### 前端 (`apps/web/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的專案ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_public_key
```

**注意**：目前有一個 placeholder 的 `.env.local`，請用真實的憑證替換它！

#### 後端 (`apps/backend/.env`)

創建此文件並填入：

```env
# Supabase Configuration
SUPABASE_URL=https://你的專案ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key

# Gemini API Key (現有的，保持不變)
GEMINI_API_KEY=你現有的_gemini_api_key

# Server Configuration
PORT=8082
NODE_ENV=development
```

### 步驟 4: 配置 Google OAuth

1. 在 Supabase Dashboard: **Authentication → Providers → Google**
2. 啟用 Google provider
3. 填入您的 Google OAuth 憑證：
   ```
   Client ID: YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
   Client Secret: YOUR_GOOGLE_CLIENT_SECRET
   ```

   ⚠️ **重要**: 請從 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 取得您自己的 OAuth 憑證，不要在文件中儲存真實的秘密。
4. 複製顯示的 **Callback URL** (格式：`https://<project-id>.supabase.co/auth/v1/callback`)
5. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
6. 找到您的 OAuth 2.0 客戶端 ID
7. 在「已授權的重新導向 URI」中**添加** Supabase Callback URL

### 步驟 5: 禁用 Email 驗證

**Authentication → Settings → Email Auth**:
- 將 **"Confirm email"** 設為 **OFF** (允許無需驗證即可登入)

### 步驟 6: 創建資料庫表

在 **SQL Editor** 中執行以下 SQL：

```sql
-- ========== Profiles 表 ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  provider TEXT, -- 'email', 'google'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ========== Lesson History 表 ==========
CREATE TABLE public.lesson_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  lesson_title TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  total_score NUMERIC(5,2) NOT NULL,
  questions_count INTEGER NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  pronunciation_score NUMERIC(5,2),
  fluency_score NUMERIC(5,2),
  accuracy_score NUMERIC(5,2),
  comprehension_score NUMERIC(5,2),
  confidence_score NUMERIC(5,2),
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

CREATE INDEX idx_lesson_history_user ON lesson_history(user_id);
CREATE INDEX idx_lesson_history_lesson ON lesson_history(lesson_id);
CREATE INDEX idx_lesson_history_completed ON lesson_history(completed_at DESC);

ALTER TABLE public.lesson_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lesson history"
  ON public.lesson_history FOR ALL
  USING (auth.uid() = user_id);

-- ========== Conversation Sessions 表 ==========
CREATE TABLE public.conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'conversation',
  mode TEXT,
  completed_at TIMESTAMPTZ NOT NULL,
  messages_count INTEGER DEFAULT 0,
  report_id TEXT,
  settings JSONB,
  conversation_data JSONB,
  scenario_id TEXT,
  user_role TEXT,
  ai_role TEXT,
  checkpoints JSONB,
  reviewed_lessons JSONB,
  vocabulary_items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversation_user ON conversation_sessions(user_id);
CREATE INDEX idx_conversation_session ON conversation_sessions(session_id);
CREATE INDEX idx_conversation_completed ON conversation_sessions(completed_at DESC);

ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON public.conversation_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ========== Flashcards 表 ==========
CREATE TABLE public.flashcard_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deck_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, deck_name)
);

CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
  front TEXT NOT NULL,
  pinyin TEXT,
  back TEXT NOT NULL,
  deck_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flashcards_user ON flashcards(user_id);
CREATE INDEX idx_flashcards_deck ON flashcards(deck_id);

ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own decks"
  ON public.flashcard_decks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own flashcards"
  ON public.flashcards FOR ALL
  USING (auth.uid() = user_id);
```

---

## 🚀 測試步驟

完成上述設置後：

1. **啟動開發環境**：
   ```bash
   npm run dev
   ```

2. **前端測試**：
   - 訪問 http://localhost:3000
   - 測試註冊新帳號：http://localhost:3000/register
   - 測試 Email 登入：http://localhost:3000/login
   - 測試 Google 登入按鈕

3. **後端測試**：
   - 後端應該在 http://localhost:8082 運行
   - 檢查終端沒有認證相關錯誤

4. **數據遷移測試** (如果您有現有的 localStorage 數據)：
   - 登入後，打開瀏覽器 DevTools Console
   - 應該看到 "🔄 Starting data migration..." 訊息
   - 確認舊的 localStorage 數據被清除

---

## 🔐 安全檢查清單

- [ ] ✅ `SUPABASE_SERVICE_ROLE_KEY` 只存在於後端 `.env` (未提交到 Git)
- [ ] ✅ 所有資料庫表都啟用了 Row Level Security (RLS)
- [ ] ✅ Google OAuth Callback URL 已添加到 Google Cloud Console
- [ ] ✅ Email 確認已禁用（允許立即登入）
- [ ] ✅ 所有後端 API 路由都需要 JWT token 認證

---

## 📁 重要文件清單

### 新建文件
- `apps/web/src/lib/supabase/client.ts` - 前端 Supabase 客戶端
- `apps/web/src/lib/supabase/server.ts` - 服務端 Supabase 客戶端
- `apps/web/app/(public)/register/page.tsx` - 註冊頁面
- `apps/web/app/auth/callback/route.ts` - OAuth 回調處理
- `apps/web/src/lib/migration/migrate.ts` - 數據遷移工具
- `apps/backend/src/lib/supabase.ts` - 後端 Supabase 客戶端
- `apps/backend/src/middleware/auth.ts` - JWT 認證中間件
- `apps/backend/src/routes/lessonHistory.ts` - Lesson History API

### 已修改文件
- `apps/web/middleware.ts` - 使用 Supabase 會話管理
- `apps/web/src/components/AuthGuard.tsx` - 使用 Supabase 認證
- `apps/web/app/(public)/login/page.tsx` - 添加 Google OAuth
- `apps/web/src/lib/api.ts` - 自動添加 JWT token
- `apps/web/app/(protected)/dashboard/page.tsx` - 觸發數據遷移
- `apps/backend/src/routes/conversation.ts` - 添加認證和 Supabase 存儲
- `apps/backend/src/server.ts` - 註冊新路由

---

## ❓ 常見問題

### Q: 編譯時出現 "Supabase URL and API key are required" 錯誤？
A: 確保 `apps/web/.env.local` 存在並包含正確的 Supabase 憑證。

### Q: Google 登入後沒有重定向？
A: 檢查 Google Cloud Console 中的重定向 URI 是否正確添加了 Supabase Callback URL。

### Q: 註冊後收到 "Failed to create profile" 錯誤？
A: 確認 Supabase 中的 `profiles` 表已創建且 RLS 策略正確設置。

### Q: 後端 API 返回 401 Unauthorized？
A: 檢查前端是否正確獲取 JWT token，並在 API 請求中添加 Authorization header。

---

## 📞 需要幫助？

如果遇到問題：
1. 檢查瀏覽器 Console 是否有錯誤訊息
2. 檢查後端終端是否有錯誤日誌
3. 確認所有環境變數都已正確設置
4. 驗證 Supabase Dashboard 中的設置是否完成

設置完成後，您的應用將擁有：
- 🔐 完整的用戶認證系統
- 👤 每個用戶獨立的數據存儲
- 🔄 自動數據遷移
- 🚀 Google OAuth 快速登入
- 📊 所有用戶數據安全隔離
