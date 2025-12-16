# IoT Controller Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/iot-controller/package*.json ./packages/iot-controller/
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
COPY packages/iot-controller/package*.json ./packages/iot-controller/
RUN npm ci

# Copy source code
COPY packages/iot-controller ./packages/iot-controller
COPY tsconfig.json ./

# Build the application
WORKDIR /app/packages/iot-controller
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Install runtime dependencies for GPIO access
RUN apk add --no-cache python3

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 iot

# Copy built application
COPY --from=builder --chown=iot:nodejs /app/packages/iot-controller/dist ./dist
COPY --from=deps --chown=iot:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=iot:nodejs /app/packages/iot-controller/node_modules ./packages/iot-controller/node_modules
COPY --chown=iot:nodejs packages/iot-controller/package.json ./

# Note: In production on Raspberry Pi, this container needs privileged access for GPIO
# or specific device mappings for hardware access

USER iot

ENV NODE_ENV=production

# Health check via MQTT ping
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const mqtt = require('mqtt'); const client = mqtt.connect(process.env.MQTT_BROKER_URL); client.on('connect', () => { client.end(); process.exit(0); }); client.on('error', () => process.exit(1)); setTimeout(() => process.exit(1), 5000);"

CMD ["node", "dist/index.js"]