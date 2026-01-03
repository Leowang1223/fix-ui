# 使用 Node.js 18 Alpine 版本（輕量級）
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案（利用 Docker 層快取）
COPY package*.json ./

# 安裝依賴（包括開發依賴，需要 TypeScript 編譯器）
RUN npm install

# 複製後端原始碼
COPY . ./

# 建置 TypeScript 到 JavaScript
RUN npm run build

# 創建 logs 目錄
RUN mkdir -p logs/sessions

# 暴露端口
EXPOSE 8081

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/health || exit 1

# 啟動應用
CMD ["npm", "start"]
