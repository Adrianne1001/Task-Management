#!/bin/sh
# Prepares the Laravel app, then runs the container command (php-fpm by default).
#
#   1. APP_KEY: uses the env var if set; otherwise generates one once and keeps it in the storage volume,
#      so sessions survive container restarts. Fine for local review; set APP_KEY explicitly anywhere else.
#   2. Waits for MySQL to accept connections with the app credentials.
#   3. Caches config/routes/events/views (env is only read here, at container start).
#   4. Runs migrations and, unless SEED_DATABASE=false, the idempotent seeders (demo user + 12 projects).
set -eu

cd /var/www/html

log() {
    printf '[entrypoint] %s\n' "$*"
}

if [ -z "${APP_KEY:-}" ]; then
    key_file="${APP_KEY_FILE:-storage/app/private/.app_key}"
    if [ ! -s "$key_file" ]; then
        log "APP_KEY not set; generating one in $key_file"
        (umask 077 && php -r 'echo "base64:".base64_encode(random_bytes(32));' > "$key_file")
    fi
    APP_KEY="$(cat "$key_file")"
    export APP_KEY
fi

log "Waiting for database ${DB_HOST:-?}:${DB_PORT:-3306}"
# shellcheck disable=SC2016 # PHP code: the $variables are PHP's, not the shell's.
php -r '
    $dsn = sprintf("mysql:host=%s;port=%s;dbname=%s", getenv("DB_HOST"), getenv("DB_PORT") ?: "3306", getenv("DB_DATABASE"));
    for ($attempt = 1; $attempt <= 60; $attempt++) {
        try {
            new PDO($dsn, getenv("DB_USERNAME"), getenv("DB_PASSWORD"));
            exit(0);
        } catch (PDOException $e) {
            fwrite(STDERR, "[entrypoint] database not ready ({$attempt}/60): {$e->getMessage()}\n");
            sleep(2);
        }
    }
    exit(1);
'

php artisan optimize --no-interaction
php artisan migrate --force --no-interaction

if [ "${SEED_DATABASE:-true}" = "true" ]; then
    log "Seeding database (idempotent)"
    php artisan db:seed --force --no-interaction
fi

log "Starting: $*"
exec "$@"
