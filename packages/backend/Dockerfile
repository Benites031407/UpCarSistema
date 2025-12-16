# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
RUN npm ci

# Copy source code
COPY packages/backend ./packages/backend
COPY tsconfig.json ./

# Build the application
WORKDIR /app/packages/backend
RUN echo "Skipping TypeScript build - using tsx runtime"

# Production image
FROM base AS runner
WORKDIR /app

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

# Copy built application
COPY --from=builder --chown=backend:nodejs /app/packages/backend/src ./src
COPY --from=builder --chown=backend:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=backend:nodejs /app/packages/backend/tsconfig.json ./tsconfig.json
COPY --from=deps --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=backend:nodejs /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --chown=backend:nodejs packages/backend/package.json ./

# Copy database migrations
COPY --chown=backend:nodejs packages/backend/src/database/migrations ./src/database/migrations

USER backend

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npx", "tsx", "src/index.ts"]
