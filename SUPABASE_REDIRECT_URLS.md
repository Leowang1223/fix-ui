# 🔐 Supabase Redirect URLs 配置

**您的 Vercel Domain**: `fix-ui-web.vercel.app`

---

## ✅ 方法 A：簡單配置（推薦）⭐

**只需添加 2 個 URL**，使用通配符涵蓋所有路由：

### Site URL
```
https://fix-ui-web.vercel.app
```

### Redirect URLs（點擊 Add URL 添加以下 2 個）
```
https://fix-ui-web.vercel.app/*
https://fix-ui-web.vercel.app/auth/callback
```

**完成！** 這樣就可以涵蓋所有當前和未來的路由。

---

## 📋 方法 B：詳細配置（可選）

如果您想精確控制每個路由，可以添加以下所有 URL：

### Site URL
```
https://fix-ui-web.vercel.app
```

### Redirect URLs（點擊 Add URL 逐個添加）

#### 基礎路由
```
https://fix-ui-web.vercel.app/
https://fix-ui-web.vercel.app/auth/callback
```

#### Public 路由
```
https://fix-ui-web.vercel.app/login
https://fix-ui-web.vercel.app/register
```

#### Protected 路由
```
https://fix-ui-web.vercel.app/dashboard
https://fix-ui-web.vercel.app/prepare
https://fix-ui-web.vercel.app/lesson/*
https://fix-ui-web.vercel.app/history
https://fix-ui-web.vercel.app/history/playback/*
https://fix-ui-web.vercel.app/flashcards
https://fix-ui-web.vercel.app/interview
https://fix-ui-web.vercel.app/analysis
https://fix-ui-web.vercel.app/report
https://fix-ui-web.vercel.app/conversation
https://fix-ui-web.vercel.app/conversation/chat
https://fix-ui-web.vercel.app/conversation/report/*
```

#### 本地開發（可選）
```
http://localhost:3000/*
http://localhost:3000/auth/callback
```

**總計**：16 個 URL（包含本地開發）

---

## 🚀 快速複製（方法 A - 推薦）

直接複製以下內容，在 Supabase 中逐行添加：

```
https://fix-ui-web.vercel.app/*
https://fix-ui-web.vercel.app/auth/callback
```

---

## 🚀 快速複製（方法 B - 完整版）

直接複製以下內容，在 Supabase 中逐行添加：

```
https://fix-ui-web.vercel.app/
https://fix-ui-web.vercel.app/auth/callback
https://fix-ui-web.vercel.app/login
https://fix-ui-web.vercel.app/register
https://fix-ui-web.vercel.app/dashboard
https://fix-ui-web.vercel.app/prepare
https://fix-ui-web.vercel.app/lesson/*
https://fix-ui-web.vercel.app/history
https://fix-ui-web.vercel.app/history/playback/*
https://fix-ui-web.vercel.app/flashcards
https://fix-ui-web.vercel.app/interview
https://fix-ui-web.vercel.app/analysis
https://fix-ui-web.vercel.app/report
https://fix-ui-web.vercel.app/conversation
https://fix-ui-web.vercel.app/conversation/chat
https://fix-ui-web.vercel.app/conversation/report/*
http://localhost:3000/*
http://localhost:3000/auth/callback
```

---

## 📖 配置步驟

### 1. 登入 Supabase

1. 前往 https://supabase.com/dashboard
2. 選擇您的項目（`fhgbfuafilqoouldfsdi`）

### 2. 進入 URL Configuration

進入 **Authentication** → **URL Configuration**

### 3. 設置 Site URL

在 **Site URL** 欄位輸入：
```
https://fix-ui-web.vercel.app
```

### 4. 添加 Redirect URLs

#### 使用方法 A（推薦）：

1. 點擊 **Add URL**
2. 輸入：`https://fix-ui-web.vercel.app/*`
3. 點擊確認
4. 再次點擊 **Add URL**
5. 輸入：`https://fix-ui-web.vercel.app/auth/callback`
6. 點擊確認

#### 使用方法 B（詳細）：

對上面列表中的每個 URL：
1. 點擊 **Add URL**
2. 輸入 URL
3. 點擊確認
4. 重複步驟 1-3，直到添加完所有 URL

### 5. 保存配置

點擊頁面底部的 **Save** 按鈕

---

## ✅ 驗證配置

配置完成後，您應該看到：

### Site URL
```
✅ https://fix-ui-web.vercel.app
```

### Redirect URLs（方法 A）
```
✅ https://fix-ui-web.vercel.app/*
✅ https://fix-ui-web.vercel.app/auth/callback
```

或

### Redirect URLs（方法 B）
```
✅ https://fix-ui-web.vercel.app/
✅ https://fix-ui-web.vercel.app/auth/callback
✅ https://fix-ui-web.vercel.app/login
... (共 16 個)
```

---

## 🎯 推薦配置

**我推薦使用方法 A（通配符）**，因為：

✅ **簡單**：只需添加 2 個 URL
✅ **靈活**：自動涵蓋未來新增的路由
✅ **維護容易**：不需要每次新增頁面都更新 Supabase
✅ **安全**：仍然限制在您的 domain 下

---

## 📝 配置完成檢查清單

- [ ] Site URL 設置為 `https://fix-ui-web.vercel.app`
- [ ] 至少添加了 `https://fix-ui-web.vercel.app/*`
- [ ] 至少添加了 `https://fix-ui-web.vercel.app/auth/callback`
- [ ] 點擊了 **Save** 按鈕
- [ ] 看到綠色的成功提示

---

## 🔧 下一步

配置完 Supabase 後，請繼續：

1. ✅ **配置 Vercel 環境變數**
   - 添加 `NEXT_PUBLIC_SITE_URL=https://fix-ui-web.vercel.app`

2. ✅ **重新部署 Vercel**
   - 取消勾選 Build Cache

3. ✅ **測試登入**
   - 清除瀏覽器緩存
   - Google 登入應該正確跳轉

詳細步驟請參考：[DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md)
