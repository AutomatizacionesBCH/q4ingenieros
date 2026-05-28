FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npx prisma generate

# Verificación crítica: si el binario correcto no existe, el build falla aquí (no en producción)
RUN ls node_modules/.prisma/client/ | grep "linux-musl-openssl-3.0.x" \
  || (echo "ERROR: Prisma binary linux-musl-openssl-3.0.x no fue generado. Verifica binaryTargets en schema.prisma" && exit 1)

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# OpenSSL 3 para el binario linux-musl-openssl-3.0.x
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# Forzar binario correcto — evita que Prisma auto-detecte el binario equivocado
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
EXPOSE 3000
CMD ["node", "server.js"]
