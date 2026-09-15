# syntax=docker/dockerfile:1
# Контекст сборки — корень репозитория (общий lockfile npm workspaces).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts
COPY packages/contracts packages/contracts
COPY apps/web apps/web
COPY scripts scripts
# Сборка падает, если gzip-размер JS+CSS больше бюджета (200 КБ)
RUN npm run build -w @staff-pulse/web

FROM nginx:1.27-alpine AS runtime
# Официальный образ подставляет переменные окружения в шаблоны из /etc/nginx/templates
COPY apps/web/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# Скрипты из docker-entrypoint.d/ запускаются по алфавиту перед стартом nginx
COPY apps/web/nginx/99-print-ready.sh /docker-entrypoint.d/99-print-ready.sh
RUN chmod +x /docker-entrypoint.d/99-print-ready.sh
ENV SERVER_UPSTREAM=server:3001 \
    NGINX_ENVSUBST_FILTER=^SERVER_UPSTREAM$
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
