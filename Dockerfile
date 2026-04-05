# syntax=docker/dockerfile:1
# Next.js standalone：与 package.json 中的 packageManager（pnpm）一致

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 仅安装依赖，源码变更时仍可命中缓存
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
