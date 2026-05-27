# syntax=docker/dockerfile:1.7

# ── Stage 1: build ──
FROM node:20-alpine AS build
WORKDIR /app

# Install build deps (bcrypt native needs python3 + make + g++)
RUN apk add --no-cache python3 make g++

# Install all deps (incl. dev) for build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: runtime ──
FROM node:20-alpine AS runtime
WORKDIR /app

# Runtime native deps for bcrypt
RUN apk add --no-cache libstdc++

ENV NODE_ENV=production
# Cloud Run injects PORT (default 8080). We respect it via process.env.PORT.
ENV PORT=8080

# Only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Built artifacts from stage 1
COPY --from=build /app/dist ./dist

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 8080

# Note: Cloud Run probes /api/health (liveness) and /api/healthz (readiness w/ DB)
CMD ["node", "dist/index.js"]
