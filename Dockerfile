FROM node:20-alpine AS base

# ── Deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
# libc6-compat: Alpine compatibility shim
# python3 make g++: required to compile native modules (better-sqlite3 uses node-gyp)
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# libc6-compat: needed at runtime for the compiled better-sqlite3 .node binary
# sqlite: CLI for manual DB inspection via EasyPanel terminal
RUN apk add --no-cache libc6-compat sqlite

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Static assets
COPY --from=builder /app/public ./public

# Standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Excel + SQLite data directory
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Native module: better-sqlite3 is not bundled by the standalone tracer.
# Copy the full package (including the compiled .node binding) explicitly.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
