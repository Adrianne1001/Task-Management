# Deploying to Vercel (free tier)

A live demo runs on free services only:

| Part | Host | Notes |
|---|---|---|
| Angular SPA | Vercel project #1 (root `frontend/`) | Static build; `/api/*` and `/sanctum/*` are proxied to the API |
| Laravel API | Vercel project #2 (root `backend/`) | Serverless PHP 8.3 via the community [`vercel-php`](https://github.com/vercel-community/php) runtime |
| MySQL | [TiDB Cloud Starter](https://tidbcloud.com) | MySQL-compatible, free, TLS required (port 4000) |

**Why the proxy:** Sanctum SPA auth relies on first-party cookies. `*.vercel.app` is a public suffix, so two Vercel
projects are two different *sites* and the browser would not send the session cookie across them. The frontend's
`vercel.json` rewrites `/api` and `/sanctum` to the API project, so the browser only ever talks to one origin, exactly
like the dev proxy (`proxy.conf.json`) and the Docker nginx setup.

**Serverless constraints handled by config:** the filesystem is read-only except `/tmp`, so Laravel's bootstrap caches
and compiled views go to `/tmp`, logs go to `stderr`, and sessions, cache and rate-limit counters live in the database
(already the defaults).

## 1. Database (TiDB Cloud Starter)

1. Sign up at <https://tidbcloud.com> → create a **Starter** (free) cluster in a region near your Vercel region.
2. **Connect** → *General* → note host, port (`4000`), user (`xxxx.root`) and generate a password.
3. In the SQL editor (or any MySQL client): `CREATE DATABASE client_project_tracker;`

## 2. Migrate and seed from your machine

TLS needs a CA bundle. Download one (e.g. <https://curl.se/ca/cacert.pem>) and run from `backend/`, with real values
(process environment variables override `.env`):

```bash
DB_HOST=gateway01.<region>.prod.aws.tidbcloud.com DB_PORT=4000 \
DB_DATABASE=client_project_tracker DB_USERNAME='<user>.root' DB_PASSWORD='<password>' \
MYSQL_ATTR_SSL_CA=/path/to/cacert.pem \
php artisan migrate:fresh --seed --force
```

This creates the tables (including `sessions` and `cache`) and seeds the 12 projects plus the demo user.

## 3. API project (Vercel)

1. Vercel → **Add New → Project** → import the GitHub repo.
2. **Import single project** for `backend` · **Project name:** `client-project-tracker-api` · **Root Directory:**
   `backend`. The framework preset doesn't matter: `backend/vercel.json` uses `builds`, so Vercel runs only the PHP
   builder (no `npm run build`).
3. **Environment Variables** — paste this block (Vercel accepts a pasted `.env`), filling in the `<…>` values:

```dotenv
APP_NAME="Client Project Tracker"
APP_ENV=production
APP_DEBUG=false
APP_KEY=<output of: php artisan key:generate --show>
APP_URL=https://client-project-tracker-api.vercel.app
FRONTEND_URL=https://client-project-tracker.vercel.app
SANCTUM_STATEFUL_DOMAINS=client-project-tracker.vercel.app
TRUSTED_PROXIES=*

DB_CONNECTION=mysql
DB_HOST=<tidb host>
DB_PORT=4000
DB_DATABASE=client_project_tracker
DB_USERNAME=<tidb user>
DB_PASSWORD=<tidb password>
MYSQL_ATTR_SSL_CA=/etc/pki/tls/certs/ca-bundle.crt

SESSION_DRIVER=database
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
SESSION_DOMAIN=
CACHE_STORE=database
QUEUE_CONNECTION=sync
LOG_CHANNEL=stderr
LOG_LEVEL=warning

APP_CONFIG_CACHE=/tmp/config.php
APP_EVENTS_CACHE=/tmp/events.php
APP_PACKAGES_CACHE=/tmp/packages.php
APP_ROUTES_CACHE=/tmp/routes.php
APP_SERVICES_CACHE=/tmp/services.php
VIEW_COMPILED_PATH=/tmp
```

4. **Deploy**, then open `https://<api-domain>/up` — it should return the Laravel health page.

## 4. Frontend project (Vercel)

1. **Add New → Project** → import the same repo again.
2. **Project name:** `client-project-tracker` · **Root Directory:** `frontend` · Framework preset: **Angular**
   (build settings come from `frontend/vercel.json`).
3. **Deploy** and open the site; log in with the demo account (`demo@example.com` / `password`).

## If Vercel gives a different domain

Project names are global; if one is taken Vercel appends a suffix. Then:

- update the two rewrite `destination`s in `frontend/vercel.json` to the real API domain and push;
- update `APP_URL`, `FRONTEND_URL` and `SANCTUM_STATEFUL_DOMAINS` on the API project and **redeploy** it
  (environment changes only apply to new deployments).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Login returns **419** | `SANCTUM_STATEFUL_DOMAINS` doesn't match the frontend domain exactly (no scheme), or `SESSION_DOMAIN` is set |
| Every call returns **401** after login | Same as above; or the frontend rewrites point to the wrong API domain |
| **500** with nothing in the browser | Vercel → API project → *Logs* (errors go to `stderr`); usually DB credentials or `APP_KEY` |
| DB connection error mentioning SSL | `MYSQL_ATTR_SSL_CA` missing or wrong path |

The demo account is public; anyone with the link can edit data. Re-run step 2 to reset it.
