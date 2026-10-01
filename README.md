# Client Project Tracker

[![CI](https://github.com/Adrianne1001/Task-Management/actions/workflows/ci.yml/badge.svg)](https://github.com/Adrianne1001/Task-Management/actions/workflows/ci.yml)
[![Docker](https://github.com/Adrianne1001/Task-Management/actions/workflows/docker.yml/badge.svg)](https://github.com/Adrianne1001/Task-Management/actions/workflows/docker.yml)

A small full-stack app for a digital agency to track client projects: list, create, edit and delete projects, with
search, filters, sorting and sign-in. Built as a technical assessment.

- **Backend:** Laravel 12 REST API (PHP 8.3) with Sanctum cookie authentication
- **Frontend:** Angular 21 single-page app with Angular Material
- **Database:** MySQL (developed on MySQL 9.1 / WAMP). SQLite also works for a quick look.

| | |
|---|---|
| Tests | 133 backend (PHPUnit) · 92 frontend (Vitest) |
| Demo login | `demo@example.com` / `password` (local review only) |
| API base URL | `http://localhost:8000/api` |
| App URL | `http://localhost:4200` (`http://localhost:8080` with Docker) |
| API spec | [`docs/openapi.yaml`](docs/openapi.yaml) (OpenAPI 3.1) |

**Contents:** [Features](#features) · [Prerequisites](#prerequisites) · [Setup](#setup--run) ·
[Tests](#running-the-tests) · [API reference](#api-reference) · [Architecture](#architecture) ·
[Technical decisions](#technical-decisions--trade-offs) · [Assumptions](#assumptions) ·
[Limitations](#known-limitations--future-improvements) · [AI disclosure](#ai-tools-disclosure) ·
[Engineering reflection](docs/REFLECTION.md)

---

## Features

**Core requirements**

- REST API: `GET/POST /projects`, `GET/PUT/DELETE /projects/:id`
- Project list, create form, edit form, delete with a confirmation dialog
- Validation on both sides: client and project name required, status and priority must be valid values, due date
  cannot be before the start date. Invalid requests return a 422 with a message for each field.
- One JSON error format for every failure (401, 404, 405, 419, 422, 429, 500). No stack traces or SQL in responses.
- Seed data: the 12 projects from `test_data.json`, with their ids kept

**Bonus items**

- **Search** by client or project name (debounced in the UI)
- **Filter** by status and by priority
- **Sort** by any column, server-side. Status and priority sort in their natural order (Low → Medium → High), not
  alphabetically.
- **Authentication:** Laravel Sanctum SPA cookie sessions with CSRF protection and login throttling
- **Unit and feature tests** on both apps
- Optional server-side pagination (`?page=` / `?perPage=`)
- The list's search, filters and sort live in the URL, so refresh, back/forward and shared links keep the view
- Accessible and responsive: labelled fields, focus moves to the first invalid field, works at phone width (the
  table turns into cards, and sorting moves to a row of buttons)
- Modern UI: light and dark themes (follows the OS, with a remembered toggle), summary cards (total, in progress,
  overdue, completed), **Overdue** / **Due soon** tags, client avatars and loading skeletons
- Usability: click a row to open it, press `/` to jump to search, show/hide password, and a prompt before leaving a
  form with unsaved changes

Extras: a one-command [Docker Compose setup](#quick-start-with-docker), GitHub Actions CI (backend tests on SQLite
and MySQL, Pint, frontend format check, tests and build, plus a Docker build + end-to-end smoke test), and an
[OpenAPI 3.1 spec](docs/openapi.yaml). Deployment was not done.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| PHP | 8.2+ (developed on 8.3) | Extensions: `pdo_mysql` (or `pdo_sqlite`), `mbstring`, `openssl`, `fileinfo` |
| Composer | 2.x | |
| Node.js | 20.19+, 22.12+ or 24+ (developed on 22.17) | Required by Angular 21 |
| npm | 10+ | |
| MySQL | 8.0+ (developed on 9.1 via WAMP) | Not needed for the SQLite quick start |

With Docker you only need **Docker with Compose v2.17+**; see [Quick start with Docker](#quick-start-with-docker).

---

## Setup & run

```bash
git clone https://github.com/Adrianne1001/Task-Management.git
cd Task-Management
```

The app is **built for MySQL**, so the MySQL setup comes first. The SQLite option is **only a convenience** for
reviewers who don't want to install MySQL. Both use the same migrations and seeders.

### Quick start with Docker

One command runs the whole stack (MySQL 9.1, Laravel on PHP-FPM, nginx serving the Angular build):

```bash
docker compose up -d --build      # first build takes a few minutes
```

Open **http://localhost:8080** and sign in with `demo@example.com` / `password`. The database is migrated and seeded
on start. Stop and delete the data with `docker compose down -v`.

- nginx serves the SPA and passes `/api` and `/sanctum` to PHP-FPM, so the SPA and API share one origin, as with
  the dev proxy. MySQL is not exposed to the host, so it won't clash with a local MySQL on 3306.
- The credentials in `docker-compose.yml` are **local-review defaults only**. Override them with `WEB_PORT`,
  `DB_PASSWORD`, `APP_KEY` or `SEED_DATABASE=false` (environment variables or a root `.env`).
- `bash docker/smoke-test.sh` runs the same end-to-end checks as the Docker CI workflow (needs curl, jq and python3).

The manual setup below is how the app was developed, and is what to use for working on the code.

### 1. Backend: MySQL (primary)

1. Create the database and a user that can only access that database (MySQL console, phpMyAdmin or Workbench):

   ```sql
   CREATE DATABASE client_project_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'cpt_app'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
   GRANT ALL PRIVILEGES ON client_project_tracker.* TO 'cpt_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. Install, configure and seed:

   ```bash
   cd backend
   composer install
   cp .env.example .env          # PowerShell: Copy-Item .env.example .env
   php artisan key:generate
   ```

   In `backend/.env`, set `DB_PASSWORD` to the password you chose. The other `DB_*` values already match the SQL
   above (`127.0.0.1:3306`, database `client_project_tracker`, user `cpt_app`).

   ```bash
   php artisan migrate:fresh --seed   # creates the tables, 12 projects and the demo user
   php artisan serve                  # http://127.0.0.1:8000
   ```

> **WAMP users:** WAMP's MySQL can default to MyISAM. The app sets `engine => InnoDB` in `config/database.php`, so
> no server change is needed.

### 1. (Alternative) Backend: SQLite quick start

Use this instead of the MySQL steps above if you don't have MySQL installed.

```bash
cd backend
composer install
cp .env.example .env               # PowerShell: Copy-Item .env.example .env
php artisan key:generate
```

In `backend/.env`, set `DB_CONNECTION=sqlite` and **delete or comment out** the `DB_DATABASE` line (Laravel then
uses `database/database.sqlite`). The other `DB_*` lines are ignored. Then:

```bash
touch database/database.sqlite     # PowerShell: New-Item database/database.sqlite
php artisan migrate:fresh --seed
php artisan serve
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm ci        # installs exactly the versions in package-lock.json
npm start     # http://localhost:4200
```

Open **http://localhost:4200** and sign in with `demo@example.com` / `password`.

`npm start` runs a dev proxy that forwards `/api` and `/sanctum` to `http://127.0.0.1:8000`, so the browser sees
one origin.

> Use `localhost:4200`, not `127.0.0.1:4200`. Sanctum only issues session cookies to hosts listed in
> `SANCTUM_STATEFUL_DOMAINS` (`localhost:4200`).

### Environment variables worth knowing

| Variable | Default | Purpose |
|---|---|---|
| `APP_DEBUG` | `true` | Local only. With `false`, unexpected errors return a generic 500 message. |
| `FRONTEND_URL` | `http://localhost:4200` | The only origin CORS allows |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:4200` | Hosts that get cookie-session auth |
| `SESSION_DOMAIN` | `localhost` | Cookie domain shared by the SPA and the API |
| `DB_*` | MySQL on `127.0.0.1:3306` | See the setup steps above |

---

## Running the tests

```bash
# Backend: 133 tests. Uses in-memory SQLite (set in phpunit.xml), so no database setup is needed.
cd backend
php artisan test
./vendor/bin/pint --test           # code style check

# Frontend: 92 tests (Vitest + jsdom)
cd frontend
npm test -- --watch=false
npm run build                      # production build
```

The backend suite also passes on MySQL. Create a separate test database (for example
`client_project_tracker_test`, with the same grants for `cpt_app`) and override the connection in the shell. Shell
variables take precedence over `phpunit.xml`.

```bash
DB_CONNECTION=mysql DB_DATABASE=client_project_tracker_test php artisan test
# PowerShell: $env:DB_CONNECTION='mysql'; $env:DB_DATABASE='client_project_tracker_test'; php artisan test
```

**Coverage:**

- **Backend:** every endpoint (happy path plus 404/405/422), a validation matrix run against both POST and PUT,
  search/filter/sort/pagination, auth (401 on every protected route, login, logout, throttling), error envelopes,
  security headers, the seeder (matches `test_data.json` exactly and is idempotent), and the enums.
- **Frontend:** validators, form behaviour (required fields, date range, 422 mapping, edit mode, 404), the list
  (filters synced to the URL, debounce, sort, empty and error states, delete confirm/cancel), the HTTP error
  interceptor, auth service and guards, and a spec that keeps the TypeScript enum values identical to the backend's.

---

## API reference

All endpoints are under **`/api`**. Requests and responses are JSON with camelCase keys that match
`test_data.json`. Every endpoint except login (and `GET /sanctum/csrf-cookie`) requires a signed-in session.
The full contract is in [`docs/openapi.yaml`](docs/openapi.yaml) (OpenAPI 3.1, can be opened in Swagger Editor or
Redocly).

### Authentication (Sanctum SPA cookies)

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/sanctum/csrf-cookie` | — | 204, sets the `XSRF-TOKEN` cookie | |
| POST | `/api/auth/login` | `{ email, password }` | 200 `{ data: { id, name, email } }` | 419 missing CSRF token, 422 wrong credentials, 429 after 5 attempts per minute (per email + IP) |
| POST | `/api/auth/logout` | — | 204 | 401 |
| GET | `/api/auth/me` | — | 200 `{ data: { id, name, email } }` | 401 |

State-changing requests must send the `X-XSRF-TOKEN` header with the cookie's value. Angular does this
automatically.

### Projects

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/api/projects` | — (query options below) | 200 `{ data: Project[] }` | 401, 422 (bad query option) |
| GET | `/api/projects/{id}` | — | 200 `{ data: Project }` | 401, 404 |
| POST | `/api/projects` | `ProjectInput` | 201 `{ data: Project }` + `Location` header | 401, 422 |
| PUT | `/api/projects/{id}` | `ProjectInput` (full replacement) | 200 `{ data: Project }` | 401, 404, 422 |
| DELETE | `/api/projects/{id}` | — | 204 | 401, 404 |
| GET | `/api/meta/enums` | — | 200 `{ data: { statuses, priorities, sortFields, sortDirections } }` | 401 |

`PATCH` returns 405, because updates are full replacements via `PUT`. A non-numeric id returns 404. The API allows
60 requests per minute per signed-in user (per IP for guests), and returns 429 with a `Retry-After` header past that.

**Project**

```json
{
  "id": 1,
  "clientName": "Acme Corporation",
  "projectName": "Corporate Website Redesign",
  "description": "Redesign and modernize the company's corporate website.",
  "status": "In Progress",
  "priority": "High",
  "startDate": "2026-06-01",
  "dueDate": "2026-07-15"
}
```

**ProjectInput rules**

| Field | Rules |
|---|---|
| `clientName` | required, string, max 150 |
| `projectName` | required, string, max 150 |
| `description` | optional, string, max 2000 |
| `status` | required: `Planning`, `In Progress`, `On Hold` or `Completed` |
| `priority` | required: `Low`, `Medium` or `High` |
| `startDate` | optional, `YYYY-MM-DD`, must be a real date (`2026-02-30` is rejected) |
| `dueDate` | optional, `YYYY-MM-DD`, must be on or after `startDate` when both are given |

Strings are trimmed, so a whitespace-only name counts as missing. On `PUT`, an omitted optional field is set to
`null`.

**`GET /api/projects` query options** (each one is validated, and unknown values return 422)

| Param | Values |
|---|---|
| `search` | Text matched against client or project name (max 100 characters) |
| `status` | One of the status values |
| `priority` | One of the priority values |
| `sort` | `clientName`, `projectName`, `status`, `priority`, `startDate`, `dueDate` |
| `direction` | `asc` (default) or `desc` |
| `page`, `perPage` | Opt-in pagination (`perPage` defaults to 15, max 100). Adds `links` and `meta` to the response. |

Example: `GET /api/projects?status=In%20Progress&sort=dueDate&direction=desc`

### Error format

Every error has the same shape: a `message`, plus `errors` keyed by field for validation failures.

```jsonc
// 422 POST /api/projects
// body: { "clientName": "", "status": "Done", "priority": "Urgent", "startDate": "2026-05-10", "dueDate": "2026-05-01" }
{
  "message": "The client name field is required. (and 4 more errors)",
  "errors": {
    "clientName": ["The client name field is required."],
    "projectName": ["The project name field is required."],
    "status": ["Status must be one of: Planning, In Progress, On Hold, Completed."],
    "priority": ["Priority must be one of: Low, Medium, High."],
    "dueDate": ["The due date cannot be earlier than the start date."]
  }
}
```

| Status | Example `message` |
|---|---|
| 401 | `Unauthenticated.` |
| 404 | `Project not found.` (or `The requested resource was not found.` for unknown routes) |
| 405 | `The PATCH method is not supported for this endpoint.` |
| 419 | `CSRF token mismatch. Refresh the page and try again.` |
| 429 | `Too many requests. Please try again later.` |
| 500 | `Server error. Please try again later.` (when `APP_DEBUG=false`) |

---

## Architecture

```
Task-Management/
├── backend/                         Laravel 12 API
│   ├── app/
│   │   ├── Enums/                   ProjectStatus, ProjectPriority, ProjectSortField, SortDirection (+ HasValues trait)
│   │   ├── Http/
│   │   │   ├── Controllers/         Thin: ProjectController, AuthController, MetaController
│   │   │   ├── Requests/            Form Requests: ProjectRequest, IndexProjectRequest, LoginRequest
│   │   │   ├── Resources/           ProjectResource, UserResource (API output, camelCase)
│   │   │   └── Middleware/          ForceJsonResponse, SecurityHeaders
│   │   ├── Services/ProjectService  Query, filter, sort and persistence logic
│   │   ├── Data/ProjectFilters      Typed DTO built from the validated query string
│   │   ├── Exceptions/              ApiExceptionRenderer (one JSON error format)
│   │   └── Models/                  Project, User
│   ├── database/
│   │   ├── data/projects.json       test_data.json, unchanged
│   │   ├── migrations/ factories/ seeders/
│   ├── routes/api.php
│   └── tests/                       Feature/Api, Feature/Database, Unit/Enums
├── frontend/                        Angular 21 SPA
│   └── src/app/
│       ├── core/                    AuthService, guards, API error interceptor, notifications, API_URL token
│       ├── features/
│       │   ├── projects/            ProjectService, project-list, project-form
│       │   ├── auth/login/
│       │   └── not-found/
│       ├── shared/                  ConfirmDialog, status/priority badges, validators, date helpers
│       └── models/                  Project types + TypeScript enums mirroring the backend
├── docker/                          Dockerfiles, nginx config, entrypoint, smoke test (docker-compose.yml at the root)
├── .github/workflows/               ci.yml (tests, lint, build), docker.yml (Compose build + smoke test)
├── docs/
│   ├── openapi.yaml                 OpenAPI 3.1 API spec
│   └── REFLECTION.md                Engineering reflection (submission form answers)
└── PLAN.md                          Implementation checklist, decisions log, requirements traceability
```

**Request flow (backend):**

```
route (auth:sanctum, throttle) → Form Request (validate) → Controller → ProjectService → Eloquent
                                                                      ↓
                                     ProjectResource (camelCase JSON) ← model
Any exception under /api/* → ApiExceptionRenderer → { message, errors? }
```

**Frontend:** standalone components with `OnPush` change detection and signals, running zoneless. Routes are
lazy-loaded and protected by `authGuard` / `guestGuard`. Feature services wrap `HttpClient`. A single functional
interceptor turns every HTTP failure into a typed `ApiError` with a user-friendly message. On a 401 or 419 it clears
the session and sends the user to `/login?returnUrl=…`.

---

## Technical decisions & trade-offs

The full log, with dates, is in [`PLAN.md`](PLAN.md#open-questions--decisions-log). The main ones:

| Decision | Why | Trade-off |
|---|---|---|
| **PHP backed enums + matching TypeScript enums** for status, priority, sort field and direction | One source of truth. Validation (`Rule::enum`), DB enum columns (`Enum::values()`), error messages and the meta endpoint all derive from it. A frontend spec fails if the TS values drift from the backend's. | The values exist in two languages. The spec guards that, but code generation would remove it. |
| **Form Requests** (`ProjectRequest`, `IndexProjectRequest`) | Keep validation out of controllers. The query string is whitelisted and turned into a typed `ProjectFilters` DTO, so nothing unchecked reaches `WHERE` or `ORDER BY`. | |
| **One `ProjectRequest` for POST and PUT** | `PUT` is a full replacement, so the rules are identical. One class means one place to change them. | No partial updates. `PATCH` returns 405 on purpose. |
| **API Resources** | Control the output shape: camelCase keys identical to `test_data.json`, no timestamps or internal columns. | |
| **Thin controllers + `ProjectService`** | Controllers only handle HTTP. Query building (search, filters, enum-order sort, pagination) is in one testable class. | One more layer than this app strictly needs; it would pay off as features are added. |
| **`/api/projects`** rather than `/projects` | Laravel convention. Keeps API routes separate from web routes and the `/sanctum` endpoints. | Differs from the spec's literal paths. Documented here. |
| **`{ "data": … }` envelope** | Laravel's resource default. Lists, single records and paginated results all have the same shape. | Clients unwrap `data`. |
| **Enum sort by declared order** | Users expect High > Medium > Low, not alphabetical. Implemented as a bound `CASE` expression that runs on MySQL and SQLite. | The only raw SQL in the app. The values are bound and the column comes from an enum. |
| **Sanctum SPA cookie auth** (not bearer tokens) | No token in `localStorage` for XSS to steal. HttpOnly encrypted session cookie, CSRF protection, session regenerated on login. | The SPA and API must share a site. The dev proxy provides that, and production would serve both behind one host. |
| **Same-origin via dev proxy** | Angular only attaches the XSRF header to relative URLs, and Sanctum cookies need a shared site. CORS stays locked to `FRONTEND_URL` as a fallback. | A production deployment needs a reverse proxy, or the SPA served from Laravel. |
| **Central `ApiExceptionRenderer`** | Every error has the same `{ message, errors? }` shape, and messages are written for clients. Internals never leak when `APP_DEBUG=false`. | |
| **Security hardening** | `$fillable` whitelist, max lengths, strict date format, rate limits (60/min API, 5/min login), security headers (CSP, `X-Frame-Options`, `nosniff`, …), secrets only in `.env`, least-privilege DB user | |
| **Dates optional** | The spec only marks the two names as required. The due ≥ start rule applies only when both dates are set. | |
| **MySQL primary, DB-agnostic code** | The intended database is MySQL. Migrations, seeders and queries also run on SQLite, so tests need zero setup and reviewers have a quick start. The suite passes on both. | Tests run on SQLite by default. The MySQL test run is a documented manual step. |
| **Angular 21 LTS** (not 22) | Angular 22 needs Node ≥ 22.22. Angular 21 runs on more common Node versions and is still supported. | |
| **Angular Material** | Accessible table, sort, dialog, datepicker and form fields out of the box | Larger bundle than hand-written components |
| **List state in the URL** | Refresh, back/forward and shared links keep search, filters and sort. Unknown values are dropped by enum whitelists. | |

---

## Assumptions

- **Dates are optional.** Only client name and project name are required (as in the spec). Due date ≥ start date is
  enforced only when both are set, and equal dates are allowed.
- **`PUT` is a full update.** The whole object is sent, and omitted optional fields become `null`.
- **Dates are calendar dates** (`YYYY-MM-DD`, no time or time zone), as in `test_data.json`.
- **Authentication is single-tenant.** Any signed-in user can manage every project, because the spec's model has no
  owner field. There is no registration. The seeded demo user is for local review only.
- **Seed ids are kept,** so the data matches `test_data.json` exactly. New projects continue from id 13.

---

## Known limitations & future improvements

- **Demo-grade deployment only.** Docker is for local review, and the free Vercel + TiDB setup in
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) is a public demo (shared demo account, serverless cold starts). Production
  would need real accounts, a non-demo seeding policy and a host with a persistent PHP process.
- **The OpenAPI spec is hand-written**, so it can drift from the code. Generating it, or testing responses
  against it, would keep the two in sync.
- **The UI loads the full list.** The API supports pagination, but with 12 records the UI doesn't use it. A larger
  dataset would need a paginator wired to `page`/`perPage`.
- **Pagination `meta` keys are snake_case** (`current_page`, Laravel's default), unlike the camelCase record fields.
- **Search uses `LIKE`.** User input is a bound parameter, but `%` and `_` act as wildcards. Full-text search or
  escaping would be the next step.
- **No roles or per-user ownership.** Adding an `owner_id` and a `ProjectPolicy` would be straightforward.
- **End-to-end tests aren't committed.** The full flow was checked with a headless-browser smoke test (Playwright)
  against Laravel + MySQL. Committing it as a Playwright suite would guard against regressions.

---

## AI tools disclosure

This project was built with **Claude Code** (Anthropic) as an AI pair programmer. It was used to:

- read the assessment and draft the plan, checklist and requirements traceability matrix (`PLAN.md`, `CLAUDE.md`)
- scaffold the Laravel and Angular apps, and write application code, tests and documentation
- run the test suites, builds, linters and browser smoke tests during development
- for the optional extras (Docker, CI, OpenAPI spec), run as one orchestrating session plus parallel subagents,
  one per task with its own files. The main session reviewed each result, re-ran the checks and made the commits
  ([`PLAN.md` §8.0](PLAN.md#80-working-model--one-orchestrator-several-subagents))

I made the design decisions (logged with dates in [`PLAN.md`](PLAN.md#open-questions--decisions-log)), and I
reviewed every change before committing. Each feature was checked against `REQUIREMENTS.md` and verified with
automated tests and by running the app on MySQL. `CLAUDE.md` holds the conventions the assistant had to follow
(enums for constant sets, Form Requests, API Resources, a test for every rule, no AI attribution in commit
messages since it's disclosed here).

---

## Engineering reflection

Answers to the submission form's questions are in [`docs/REFLECTION.md`](docs/REFLECTION.md).
