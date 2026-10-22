# Multi-stage Dockerfile for Synthetix AI Creator Studio
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

COPY . .

# Build Vite Frontend
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

# App code + built client + server modules. No ffmpeg (video encoding happens
# in the browser via MediaRecorder), no prisma, no redis.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts

# Non-root user for runtime
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
