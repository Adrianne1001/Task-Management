# syntax=docker/dockerfile:1
#
# Laravel API on PHP-FPM. Built by docker-compose.yml with ./backend as the build context and
# ./docker/php as the extra "docker" context (entrypoint + PHP config).

ARG PHP_VERSION=8.3

# --- PHP runtime with the extensions Laravel + MySQL need -------------------------------------------------------
FROM php:${PHP_VERSION}-fpm-alpine AS base

# mbstring, openssl, tokenizer, ctype, xml, ... are compiled into the official image already.
RUN docker-php-ext-install -j"$(nproc)" pdo_mysql opcache \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY --from=docker php.ini "$PHP_INI_DIR/conf.d/zz-app.ini"

WORKDIR /var/www/html

# --- Composer dependencies (no dev packages); cached until composer.json/lock change ------------------------------
FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
# Platform requirements are checked against the real runtime in the "build" stage below.
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist \
        --no-scripts --no-autoloader --ignore-platform-reqs

# --- Application code + optimized autoloader ---------------------------------------------------------------------
FROM base AS build

ENV COMPOSER_ALLOW_SUPERUSER=1
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY . .
COPY --from=vendor /app/vendor ./vendor

# check-platform-reqs fails the build if a required PHP extension is missing from the runtime image.
# dump-autoload runs the post-autoload-dump scripts (package:discover) to build bootstrap/cache/packages.php.
RUN mkdir -p storage/app/private storage/app/public storage/logs \
        storage/framework/cache/data storage/framework/sessions storage/framework/views bootstrap/cache \
    && composer check-platform-reqs --no-dev \
    && composer dump-autoload --no-dev --optimize --no-interaction

# --- Final image: code owned by root, only storage/ and bootstrap/cache writable by the FPM user ----------------
FROM base AS app

COPY --from=build /var/www/html /var/www/html
COPY --from=docker --chmod=0755 entrypoint.sh /usr/local/bin/app-entrypoint

# Guard against CRLF line endings if the repo was checked out on Windows without .gitattributes.
RUN sed -i 's/\r$//' /usr/local/bin/app-entrypoint \
    && chown -R www-data:www-data storage bootstrap/cache

# Runs php-fpm (master and workers) as www-data. FPM logs one notice that its "user" directive is ignored.
USER www-data

EXPOSE 9000
ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm"]
