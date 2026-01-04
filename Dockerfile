# Use official Node.js 20 Alpine image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/shared/package*.json ./apps/shared/
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm install --prefix apps/shared
RUN npm install --prefix apps/backend --legacy-peer-deps

# Copy source files
COPY apps/shared ./apps/shared
COPY apps/backend ./apps/backend

# Build shared package
RUN npm run build --prefix apps/shared

# Build backend
RUN npm run build --prefix apps/backend

# CRITICAL: Copy course data files to dist/plugins DURING build
RUN mkdir -p apps/backend/dist/plugins && \
    cp -r apps/backend/src/plugins/chinese-lessons apps/backend/dist/plugins/ && \
    echo "✅ Copied course files to dist/plugins" && \
    ls -la apps/backend/dist/plugins/chinese-lessons/ | head -10

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files for production
COPY --from=builder /app/apps/backend/package*.json ./apps/backend/
COPY --from=builder /app/apps/shared/package*.json ./apps/shared/

# Install production dependencies only
RUN npm install --prefix apps/shared --production
RUN npm install --prefix apps/backend --legacy-peer-deps --production

# Copy built files
COPY --from=builder /app/apps/shared/dist ./apps/shared/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Copy course data files to both src/plugins (for backward compatibility) and dist/plugins
COPY --from=builder /app/apps/backend/src/plugins ./apps/backend/src/plugins
COPY --from=builder /app/apps/backend/src/plugins ./apps/backend/dist/plugins

# Expose port (Railway will override this)
EXPOSE 8082

# Start the application
CMD ["node", "apps/backend/dist/server.js"]
