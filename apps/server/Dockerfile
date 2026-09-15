# syntax=docker/dockerfile:1
# Контекст сборки — корень репозитория (общий lockfile npm workspaces).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts

FROM deps AS build
COPY packages/contracts packages/contracts
COPY apps/server apps/server
# esbuild собирает сервер вместе с зависимостями в один файл
RUN npm run build -w @staff-pulse/server

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/server/dist/index.js ./index.js
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${SERVER_PORT:-3001}/api/health" >/dev/null || exit 1
CMD ["node", "index.js"]
