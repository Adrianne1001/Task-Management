# syntax=docker/dockerfile:1
#
# Angular SPA served by nginx, which also passes /api and /sanctum to php-fpm. Built by docker-compose.yml with
# ./frontend as the build context and ./docker/web as the extra "nginx" context.

# --- Build the Angular app (production configuration) -----------------------------------------------------------
FROM node:22-bookworm-slim AS build

ENV NG_CLI_ANALYTICS=false CI=true
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# --- Serve it (nginx-unprivileged: runs as a non-root user and listens on 8080) --------------------------------
FROM nginxinc/nginx-unprivileged:1.30-alpine

COPY --from=nginx default.conf /etc/nginx/conf.d/default.conf
COPY --from=nginx spa-headers.conf /etc/nginx/snippets/spa-headers.conf
# Angular's application builder writes the browser bundle to dist/<project>/browser.
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 8080
