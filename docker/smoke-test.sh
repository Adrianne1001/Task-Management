#!/usr/bin/env bash
# End-to-end smoke test of the running Docker Compose stack, through nginx, exactly as the browser uses it:
# CSRF cookie -> login (session cookie) -> authenticated API call, plus the SPA and a deep link.
#
#   docker compose up -d --build --wait && bash docker/smoke-test.sh
#
# Requires curl, jq and python3 (URL-decoding the XSRF cookie).
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
EMAIL="${DEMO_EMAIL:-demo@example.com}"
PASSWORD="${DEMO_PASSWORD:-password}"
EXPECTED_PROJECTS="${EXPECTED_PROJECTS:-12}"

JAR="$(mktemp)"
BODY="$(mktemp)"
trap 'rm -f "$JAR" "$BODY"' EXIT

fail() {
    echo "FAIL: $*" >&2
    if [ -s "$BODY" ]; then
        echo "--- response body ---" >&2
        head -c 2000 "$BODY" >&2
        echo >&2
    fi
    exit 1
}

pass() {
    echo "ok   $*"
}

# Sanctum treats a request as a first-party SPA request (session + CSRF) only when its Referer/Origin matches
# SANCTUM_STATEFUL_DOMAINS, so send both like a browser on the SPA would.
# Usage: request <expected status> <curl args...>; the body is left in $BODY.
request() {
    local expected="$1"
    shift
    local status
    status="$(curl --silent --show-error --output "$BODY" --write-out '%{http_code}' \
        --cookie "$JAR" --cookie-jar "$JAR" \
        -H 'Accept: application/json' \
        -H "Referer: $BASE_URL/" \
        -H "Origin: $BASE_URL" \
        "$@")"
    [ "$status" = "$expected" ] || fail "$* -> HTTP $status (expected $expected)"
}

xsrf_token() {
    # Netscape cookie-jar columns: domain, subdomains, path, secure, expiry, name, value. The value is URL-encoded.
    local raw
    raw="$(awk -F '\t' '$6 == "XSRF-TOKEN" { value = $7 } END { print value }' "$JAR")"
    [ -n "$raw" ] || fail "no XSRF-TOKEN cookie was set"
    python3 -c 'import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))' "$raw"
}

# 1. SPA shell and a client-side route (deep link must fall back to index.html).
for path in / /projects /projects/1/edit; do
    request 200 -H 'Accept: text/html' "$BASE_URL$path"
    grep -q '<app-root' "$BODY" || fail "GET $path did not return the Angular index.html"
    pass "GET $path serves the SPA"
done
# The SPA page must not suppress the Referer, or Sanctum would not treat its same-origin GETs as stateful.
spa_headers="$(curl --silent --output /dev/null --dump-header - "$BASE_URL/projects")"
grep -qi '^referrer-policy: strict-origin-when-cross-origin' <<< "$spa_headers" \
    || fail "SPA is missing Referrer-Policy: strict-origin-when-cross-origin"
grep -qi '^x-frame-options: deny' <<< "$spa_headers" || fail "SPA is missing X-Frame-Options"
pass "SPA security headers are present"

# 2. API is protected.
request 401 "$BASE_URL/api/projects"
pass "GET /api/projects without a session -> 401"

# 3. CSRF cookie, then a write without the token is rejected.
request 204 "$BASE_URL/sanctum/csrf-cookie"
pass "GET /sanctum/csrf-cookie -> 204"
TOKEN="$(xsrf_token)"

request 419 -X POST -H 'Content-Type: application/json' \
    --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" "$BASE_URL/api/auth/login"
pass "POST /api/auth/login without X-XSRF-TOKEN -> 419"

# 4. Login with the token.
request 200 -X POST -H 'Content-Type: application/json' -H "X-XSRF-TOKEN: $TOKEN" \
    --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" "$BASE_URL/api/auth/login"
jq -e --arg email "$EMAIL" '.data.email == $email' "$BODY" > /dev/null || fail "login response has no user"
pass "POST /api/auth/login -> 200 ($EMAIL)"

# 5. Authenticated reads through the session cookie.
request 200 "$BASE_URL/api/auth/me"
jq -e --arg email "$EMAIL" '.data.email == $email' "$BODY" > /dev/null || fail "/api/auth/me is not the demo user"
pass "GET /api/auth/me -> 200"

request 200 "$BASE_URL/api/projects"
count="$(jq '.data | length' "$BODY")"
[ "$count" = "$EXPECTED_PROJECTS" ] || fail "expected $EXPECTED_PROJECTS projects, got $count"
jq -e '.data[0] | has("clientName") and has("projectName") and has("status") and has("priority")' "$BODY" > /dev/null \
    || fail "project JSON is missing camelCase fields"
pass "GET /api/projects -> $count projects"

# 6. Laravel's error handling and security headers survive the proxy (no HTML, no stack trace).
request 404 "$BASE_URL/api/projects/999999"
jq -e 'has("message")' "$BODY" > /dev/null || fail "404 is not a JSON error"
grep -qiE 'stack|trace|vendor/laravel' "$BODY" && fail "404 response leaks internals"
headers="$(curl --silent --output /dev/null --dump-header - "$BASE_URL/api/projects")"
grep -qi '^x-content-type-options: nosniff' <<< "$headers" || fail "API response is missing security headers"
grep -qi '^x-powered-by' <<< "$headers" && fail "API response exposes X-Powered-By"
pass "API errors are JSON and security headers are present"

# 7. Logout ends the session.
TOKEN="$(xsrf_token)"
request 204 -X POST -H "X-XSRF-TOKEN: $TOKEN" "$BASE_URL/api/auth/logout"
request 401 "$BASE_URL/api/auth/me"
pass "POST /api/auth/logout -> 204, then /api/auth/me -> 401"

echo "All smoke tests passed against $BASE_URL"
