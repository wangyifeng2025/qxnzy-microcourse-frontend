FROM node:24.14.1-alpine3.23 AS base
# 1. 替换 Alpine 官方源为阿里云镜像（解决 apk 慢的问题）
RUN sed -i 's|https://dl-cdn.alpinelinux.org/alpine|https://mirrors.aliyun.com/alpine|g' /etc/apk/repositories \
    && apk add --no-cache libc6-compat \
    && rm -rf /var/cache/apk/*
RUN corepack enable
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
# 2. 编译依赖只在 install 阶段安装，runner 不需要
RUN apk add --no-cache python3 make g++ \
    && rm -rf /var/cache/apk/*
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set registry https://registry.npmmirror.com/ 
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

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]