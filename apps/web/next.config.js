const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {

  // 圖片優化設定
  images: {
    unoptimized: true
  },

  // 重寫規則（如果需要）
  async rewrites() { return [] }
}

module.exports = withNextIntl(nextConfig)