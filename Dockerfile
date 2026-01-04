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

# Copy course data files (required for lessons API)
COPY --from=builder /app/apps/backend/src/plugins ./apps/backend/src/plugins

# Expose port (Railway will override this)
EXPOSE 8082

# Start the application
CMD ["node", "apps/backend/dist/server.js"]
