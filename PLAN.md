# Client Project Tracker — Implementation Plan & Checklist

> Source of truth for progress. Update the checkboxes as work is completed (see `CLAUDE.md`).
> Assessment source: `C:\Users\adria\Downloads\fullstack-developer-assessment-main\fullstack-developer-assessment-main\`
> (`README.md`, `REQUIREMENTS.md`, `SUBMISSION.md`, `test_data.json`).

**Stack:** Angular (frontend) · Laravel 12 / PHP 8.3 (backend) · MySQL 9.1 (WAMP)
**Legend:** `[ ]` todo · `[x]` done · `[~]` in progress · `[-]` dropped (with reason)

---

## 0. Requirements Traceability Matrix

Every requirement below must map to code + a test before submission.

| # | Requirement (source) | Where it lives | Verified by |
|---|---|---|---|
| R1 | Project model: id, clientName, projectName, description, status, priority, startDate, dueDate (REQUIREMENTS) | migration, `Project` model, `ProjectResource`, TS `Project` interface | Feature test: resource shape |
| R2 | Status ∈ Planning, In Progress, On Hold, Completed | `App\Enums\ProjectStatus`, TS `ProjectStatus` enum | Validation tests |
| R3 | Priority ∈ Low, Medium, High | `App\Enums\ProjectPriority`, TS `ProjectPriority` enum | Validation tests |
| R4 | GET /projects | `ProjectController@index` → `ProjectService::list()` | `ProjectCrudTest`, `ProjectIndexQueryTest` |
| R5 | GET /projects/:id | `ProjectController@show` | `ProjectCrudTest` (200 + 404) |
| R6 | POST /projects | `ProjectController@store` | `ProjectCrudTest` (201 + Location), `ProjectValidationTest` (422) |
| R7 | PUT /projects/:id | `ProjectController@update` | `ProjectCrudTest` (200 + 404 + 422), `ProjectValidationTest` |
| R8 | DELETE /projects/:id | `ProjectController@destroy` | `ProjectCrudTest` (204 + 404) |
| R9 | UI: project list | `features/projects/project-list` (`ProjectList`) | `project-list.spec.ts` + browser smoke test |
| R10 | UI: create project | `ProjectForm` (`/projects/new`) | `project-form.spec.ts` (create mode) + smoke test |
| R11 | UI: edit project | `ProjectForm` (`/projects/:id/edit`) | `project-form.spec.ts` (edit mode) + smoke test |
| R12 | UI: delete project | List action + `ConfirmDialog` | `project-list.spec.ts` (confirm + cancel) + smoke test |
| V1 | Client Name required | `ProjectRequest` + Angular `Validators.required` / `notBlank` | `ProjectValidationTest`, `project-form.spec.ts`, `project-validators.spec.ts` |
| V2 | Project Name required | `ProjectRequest` + Angular `Validators.required` / `notBlank` | `ProjectValidationTest`, `project-form.spec.ts`, `project-validators.spec.ts` |
| V3 | Status must be valid | `Rule::enum(ProjectStatus::class)` in `ProjectRequest` | `ProjectValidationTest` |
| V4 | Priority must be valid | `Rule::enum(ProjectPriority::class)` in `ProjectRequest` | `ProjectValidationTest` |
| V5 | Due Date ≥ Start Date | `after_or_equal:startDate` (when start date valid) + `dateRangeValidator` | `ProjectValidationTest`, `project-validators.spec.ts`, `project-form.spec.ts` |
| V6 | Invalid requests → meaningful errors | `App\Exceptions\ApiExceptionRenderer` — one `{ message, errors? }` envelope (401/404/405/419/422/429/500) | `ErrorHandlingTest`, `AuthTest` |
| S1 | Public GitHub repo, setup/run instructions, technical reflection, AI disclosure (SUBMISSION/README) | Root `README.md`, `docs/REFLECTION.md` | Checklist §9 + fresh-clone test |
| D1 | Seed data = `test_data.json` (12 projects, ids preserved) | `ProjectSeeder` + `database/data/projects.json` | Seeder test |

---

## 1. Repository & Environment Setup

- [x] Confirm repo layout (monorepo): `/backend` (Laravel), `/frontend` (Angular), root `README.md`, `PLAN.md`, `CLAUDE.md`, `docs/`
- [x] Root `.gitignore` / `.editorconfig` / `.gitattributes` (LF, 4-space PHP, 2-space TS)
- [x] Copy `test_data.json` into `backend/database/data/projects.json` (unchanged)
- [x] Create MySQL database `client_project_tracker` (utf8mb4) + dedicated DB user `cpt_app` (grants on that DB only; random password in `.env`) on WAMP MySQL 9.1 @ 3306
- [x] Force `InnoDB` engine in `config/database.php` (WAMP defaults to MyISAM → no transactions/FKs, 1000-byte key limit broke migrations)
- [x] Angular CLI: use `npx @angular/cli` at scaffold time (no global install needed)
- [~] Branch per phase (`feature/<area>`, e.g. `feature/backend-domain`) off `main`; small, descriptive commits; PR → `main` when the phase is done, so `main` always holds the latest finished work — ongoing convention (Q8)

## 2. Backend — Laravel Scaffold & Config

- [x] `composer create-project laravel/laravel backend` (Laravel 12.69.3)
- [x] `php artisan install:api` (adds `routes/api.php` + Sanctum); removed unused `personal_access_tokens` migration (cookie auth, not tokens)
- [x] `.env` / `.env.example`: MySQL connection, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, encrypted sessions; SQLite file removed
- [x] API served under `/api` → `/api/projects` (Q1); README states base URL clearly
- [x] Code style: Laravel Pint (`pint.json`); `declare(strict_types=1)` added manually to new `app/` files

## 3. Backend — Domain: Enums, Migration, Model, Seeders

- [x] `app/Enums/ProjectStatus.php` — string-backed enum: `Planning`, `InProgress = 'In Progress'`, `OnHold = 'On Hold'`, `Completed` + `values()` / `label()` helpers (shared `Concerns\HasValues` trait: `values()`, `valuesForHumans()` for error messages)
- [x] `app/Enums/ProjectPriority.php` — `Low`, `Medium`, `High` + helpers
- [x] Any other small constant sets as enums too — `ProjectSortField` (camelCase API value → `column()` snake_case DB column) and `SortDirection`
- [x] Migration `create_projects_table`:
  - `id` (bigIncrements), `client_name` varchar(150) not null, `project_name` varchar(150) not null,
  - `description` text nullable, `status` enum(from `ProjectStatus::values()`), `priority` enum(from `ProjectPriority::values()`),
  - `start_date` date **nullable**, `due_date` date **nullable** (Q4), timestamps
  - Indexes on `status`, `priority`, `due_date`
- [x] `Project` model: max-length constants (`CLIENT_NAME_MAX_LENGTH` …) shared by migration + validation, `$fillable` whitelist, `casts()` → enums + `date:Y-m-d` (prevents mass-assignment & guarantees enum integrity)
- [x] `ProjectFactory` (uses enum cases; due date always ≥ start date; states for null dates)
- [x] `ProjectSeeder`: reads `database/data/projects.json`, maps camelCase → snake_case, converts strings via `ProjectStatus::from()` / `ProjectPriority::from()` (fails loudly on invalid data), preserves ids, idempotent (`upsert` on id)
- [x] `DatabaseSeeder` calls `ProjectSeeder` + `DemoUserSeeder` (`demo@example.com` / `password`, idempotent `updateOrCreate`, hashed via cast)
- [x] `php artisan migrate:fresh --seed` → 12 rows verified on MySQL (InnoDB, enum columns, AUTO_INCREMENT=13) and SQLite; re-seed stays at 12

## 4. Backend — API Layer

- [x] `routes/api.php`: the five spec routes declared explicitly (named `projects.*`, `whereNumber('project')`) instead of `apiResource`, so updates accept **PUT only** (PATCH → 405; Q11)
- [x] `ProjectController` — thin; delegates to `App\Services\ProjectService` (list/create/update/delete)
- [x] `ProjectRequest` — **one** Form Request for store + update (PUT = full replacement, identical rules; replaces the planned Store/Update pair):
  - `clientName` required|string|max:150 · `projectName` required|string|max:150 (limits from `Project::*_MAX_LENGTH`)
  - `description` nullable|string|max:2000
  - `status` required|`Rule::enum(ProjectStatus::class)` · `priority` required|`Rule::enum(ProjectPriority::class)`
  - `startDate` / `dueDate` nullable|date_format:Y-m-d (rejects impossible dates like 2026-02-30); `after_or_equal:startDate` added via `Rule::when` **only when startDate is a valid date**, so a bad start date doesn't also flag the due date
  - Custom, human-readable messages (e.g. "Status must be one of: Planning, In Progress, On Hold, Completed.") built from `Enum::valuesForHumans()`
  - `validatedAttributes()` maps camelCase → snake_case in one place; always returns every attribute so omitted optional fields become null on PUT
- [x] `ProjectResource` — camelCase output matching `test_data.json` exactly (no timestamps); wrapped in `{ "data": … }` (Q10)
- [x] Status codes: 200 list/show/update, 201 create (+ `Location` header), 204 delete, 404 (missing / non-numeric id), 405 (PATCH), 422 — 429 comes with rate limiting in §5
- [x] Bonus (index query params, all whitelisted/validated via `IndexProjectRequest` → typed `App\Data\ProjectFilters` DTO):
  - [x] `search` (client/project name, parameter-bound `LIKE`, max 100 chars)
  - [x] `status` filter · `priority` filter (validated against enums)
  - [x] `sort` (enum whitelist: clientName, projectName, status, priority, startDate, dueDate) + `direction` (asc|desc); default order `id`, `id` tie-breaker; status/priority sort in **declared order** (Low < Medium < High) via a portable bound `CASE` expression (`ProjectSortField::orderedValues()`), not alphabetically
  - [x] Opt-in pagination: only when `page` or `perPage` is sent (`perPage` default 15, max 100) → `data` + `links` + `meta`; links keep the query string
- [x] `GET /api/meta/enums` → `{ data: { statuses, priorities, sortFields, sortDirections } }` so the frontend renders dropdowns from backend enums

## 5. Backend — Security & Error Handling

- [x] Global JSON error rendering — `App\Exceptions\ApiExceptionRenderer` registered in `bootstrap/app.php`, applies to `api/*` → envelope `{ "message": "..." }` (+ `"errors": { field: [..] }` on 422)
  - `ModelNotFoundException` → 404 "Project not found." (named from the model) · unmatched route → 404 generic (path not echoed)
  - `ValidationException` → 422 (Laravel's `{message, errors}`) · 401 "Unauthenticated." · 405 "The PATCH method is not supported for this endpoint." · 419 CSRF · 429 (keeps `Retry-After` / `X-RateLimit-*` headers)
  - Anything else → 500 "Server error. Please try again later." when `APP_DEBUG=false` (no traces/SQL); debug mode falls through to Laravel's detailed output for local work
- [x] Force JSON responses for API routes (`ForceJsonResponse` middleware prepended to the `api` group → no redirects/HTML even without an `Accept` header)
- [x] Rate limiting (`AppServiceProvider`): `api` 60 req/min keyed by user id, else IP (`throttleApi()`); `login` 5/min keyed by email + IP
- [x] CORS (`config/cors.php`): only the Angular origin (`FRONTEND_URL`), only needed methods/headers — no `*`
- [x] Security headers (`SecurityHeaders`, global so 404s for unmatched routes get them too): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`; CSP `default-src 'none'; frame-ancestors 'none'` on `api/*` only; HSTS only over HTTPS
- [x] Mass-assignment protection (`$fillable`), Eloquent/bound params only (no raw SQL with input), whitelisted sort columns (enum → `column()`)
- [x] Input hardening: max lengths, strict date format, reject unknown enum values, `trim` (default middleware) — covered by `ProjectValidationTest`
- [x] Authentication — **Sanctum SPA cookie auth** (Q2): `GET /sanctum/csrf-cookie`, `POST /api/auth/login` (`LoginRequest`, `throttle:login`), `POST /api/auth/logout`, `GET /api/auth/me` (`UserResource`: id, name, email); projects **and** `meta/enums` behind `auth:sanctum` (Q12); `statefulApi()`; session regenerated on login, invalidated + CSRF token rotated on logout; scaffolded `GET /api/user` removed. Verified live on MySQL with curl: csrf-cookie → 401 → login → 200; POST without XSRF header → 419
- [x] Secrets only in `.env` (git-ignored, never committed); `.env.example` comments on `APP_KEY`, `APP_DEBUG`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, `DB_PASSWORD`
- [-] Optional: `Policy` for projects — dropped (Q13): single-tenant app with no ownership in the spec's data model; a policy would need an `owner` column that `test_data.json` doesn't have

## 6. Backend — Tests (PHPUnit / Pest)

- [x] Feature tests per endpoint: happy path + 404 + 422 cases (`tests/Feature/Api/ProjectCrudTest.php`)
- [x] Validation matrix (`ProjectValidationTest`, data providers run against both POST and PUT): missing clientName, missing projectName, invalid status, invalid priority, dueDate < startDate, dueDate == startDate (allowed), only one date given (allowed), both dates null (allowed), bad date format, over-length strings
- [x] Resource shape test (keys exactly match `test_data.json`; seeded list equals the file exactly)
- [x] Seeder test: 12 rows, values equal `test_data.json`, idempotent (`tests/Feature/Database/ProjectSeederTest.php`) + model/factory tests (`ProjectModelTest.php`)
- [x] Filter / search / sort / pagination tests; invalid sort column rejected (`ProjectIndexQueryTest`) + `MetaEnumsTest`
- [x] Auth tests (`AuthTest`): 401 on every protected endpoint without a session, login success/wrong password/missing + malformed fields, `me`, logout, login throttling (6th attempt → 429, even with the right password); `ErrorHandlingTest` (404/405/422/429/500 envelopes, JSON without `Accept`), `SecurityHeadersTest`; existing API tests sign in via `Tests\Concerns\AuthenticatesUser`
- [x] Unit tests for enums (`values()`, `from()` failure) — `tests/Unit/Enums/EnumTest.php`
- [x] Test DB: SQLite in-memory configured in `phpunit.xml` (Q7) — reviewers can run tests with zero DB setup
- [x] Portability check: 133/133 tests pass on in-memory SQLite **and** MySQL 9.1 (separate `client_project_tracker_test` DB, same least-privilege grants for `cpt_app`; run with `DB_CONNECTION=mysql DB_DATABASE=client_project_tracker_test php artisan test` — shell env beats `phpunit.xml`'s non-forced `<env>`); `migrate:fresh --seed` → 12 projects + 1 user on MySQL and on a SQLite file; only raw SQL is the bound ANSI `CASE` in `ProjectService::applySort()` (portable). README §9 should mention the MySQL test command

## 7. Frontend — Angular

- [x] Scaffold: **Angular 21 LTS** (Q14) — standalone components, routing, SCSS, strict TS + strict templates, zoneless, Vitest/jsdom; OnPush + signals throughout. `npm ci` works on stock npm 10 (scaffold-time `npm install` hit an npm 10.9 arborist bug, so the lockfile was resolved once with npm 11); `piscina` overridden to 5.3.2 (critical advisory in `@angular/build`'s pinned 5.2.0) → `npm audit` 0 vulnerabilities
- [x] Angular Material (Q3): table + sort, dialog, snackbar, datepicker (native adapter), select, form-field, progress bar, tooltip; M3 theme via `mat.theme()`
- [x] Structure:
  - `core/` — `AuthService` (signal `user`, one `/auth/me` check per page load, CSRF cookie → login, logout), `authGuard` / `guestGuard`, `apiErrorInterceptor`, `ApiError`, `NotificationService`, `API_URL` token (`/api`, relative) + `withXsrfConfiguration` (XSRF-TOKEN / X-XSRF-TOKEN). No `withCredentials` interceptor: the SPA and API share an origin via the proxy (Q16)
  - `shared/` — `ConfirmDialog` + `confirmAction()`, `StatusBadge` / `PriorityBadge`, `notBlank` + `dateRangeValidator`, local-time date helpers (`fromApiDate` / `toApiDate`)
  - `features/` — `projects/` (`ProjectService`, `project-list`, `project-form`), `auth/login`, `not-found`
  - `models/` — `Project`, `ProjectInput`, `ProjectQuery`, **TS enums** `ProjectStatus`, `ProjectPriority`, `ProjectSortField`, `SortDirection` (values identical to backend; a spec pins them), `PROJECT_LIMITS` (max lengths shared with the API)
- [x] Dev proxy (`proxy.conf.json`, wired into `ng serve`) for `/api` and `/sanctum` → `127.0.0.1:8000`
- [x] Routes (lazy `loadComponent`): `/login` (guest), `/projects`, `/projects/new`, `/projects/:id/edit` (auth), `''` → `/projects`, `**` → not found; `withComponentInputBinding()`; page titles "X · Client Project Tracker"; login honours `returnUrl` (in-app paths only — no open redirect)
- [x] Project list: Material table — client, project (+ 1-line description), status badge, priority badge, dates, edit/delete; loading bar (keeps previous rows), error state with retry, empty + "no matches" states
- [x] Bonus on list: debounced search (300 ms), status & priority filters, server-side sortable headers; **all list state in the URL query string** (refresh/back/links keep the view; unknown values dropped via enum whitelists)
- [x] Project form (typed Reactive Forms, one component for create + edit): `required` + `notBlank` (whitespace-only rejected, like the API's trim) + `maxLength` from `PROJECT_LIMITS`, enum dropdowns, optional date pickers, group validator `dueDate >= startDate` (only when both set) shown on the Due date field via an `ErrorStateMatcher`, inline messages, submit disabled while saving, description counter; edit loads by id (404 / non-numeric id → not-found state)
- [x] Map backend 422 `errors` onto form controls (`server` error key; unmatched keys shown in a form-level alert)
- [x] Delete: confirmation dialog (focus starts on Cancel) → success toast → list refresh
- [x] Global HTTP error interceptor → every failure becomes an `ApiError` with a friendly message for 0/401/403/404/419/422/429/5xx (server text kept only for 403/404/422); 401/419 outside the auth endpoints → clear session, toast, redirect to `/login?returnUrl=…`
- [x] Accessibility: labels on every field, `aria-label` on icon buttons, focus moves to the first invalid field on submit, skip link, table caption, badges always show text (not colour-only), toasts announced via live region (errors assertive)
- [x] Responsive layout: filters wrap; table scrolls inside its card with a sticky actions column; dates/description hidden < 600 px; single-column form on phones — verified at 390 px (no page-level horizontal scroll)
- [x] Unit tests (Vitest, 67 passing): enum parity, date helpers, validators, `ApiError`, interceptor (401/419 redirect, auth endpoints exempt), `AuthService` + guards, `ProjectService` (HttpTestingController), `ProjectForm` (required/blank/date-range/focus/payload/422 mapping/edit/404), `ProjectList` (Material harnesses: rows, URL filters, debounce, sort, empty/error states, delete confirm/cancel), `App` shell
- [x] Browser smoke test against Laravel + MySQL (headless Chrome, Playwright, not committed): guard → login (bad + good password) → returnUrl → list/sort/search/filter → create (required + date-range errors) → edit → delete → missing project → 404 → phone width → sign out

## 8. Optional Extras (only if time allows — quality over quantity)

Branch: `feature/extras`.

### 8.0 Working model — one orchestrator, several subagents

From §8 on, tasks are split across agents to save time and keep the main context small:

- **Orchestrator (main session):** reads `PLAN.md`, checks scope against the assessment files, splits the phase into
  independent tasks, writes each subagent's brief, then **reviews every diff**. It also re-runs the checks, does all
  edits to `PLAN.md` / `README.md`, and makes every commit.
- **Subagents (one per task, run in parallel):** each gets a self-contained brief: goal, the files it **owns**
  (no two agents touch the same file), the conventions it must follow (`CLAUDE.md`) and how to verify its work.
  Subagents never commit, never edit `PLAN.md` / `README.md` / `CLAUDE.md`, and report back with the files they
  changed, the commands they ran and their results, and any open questions or deviations from the spec.
- **When to use it:** independent work with disjoint files (e.g. Docker vs CI vs API spec). Sequential or tightly
  coupled work (one feature across controller + request + test) stays in one agent.
- Add new tasks below as `8.x` items, noting the owning agent and the files it owns.

### 8.1 Tasks

- [x] OpenAPI 3.1 spec `docs/openapi.yaml` — *agent: api-spec* (owns `docs/openapi.yaml`): every endpoint incl. `/sanctum/csrf-cookie` (path-level server override), cookie + XSRF security schemes, index query params with exact limits, plain vs paginated list (`oneOf`), reusable 401/404/405/419/422/429/500 responses with real messages, examples from `projects.json`. `redocly lint`: valid, 5 deliberate warnings (localhost servers, no license, csrf-cookie has no 4xx, PATCH documented as 405-only). README API reference fixed where the agent found it imprecise (csrf-cookie public, login 419, guest rate limit per IP)
- [~] GitHub Actions CI `.github/workflows/ci.yml` — *agent: ci* (owns `.github/workflows/ci.yml`): jobs `backend-sqlite` (Pint `--test` + tests), `backend-mysql` (`mysql:9.1` service, app + test DB with least-privilege user, tests, `migrate:fresh --seed`, asserts 12 rows), `frontend` (`npm ci`, Prettier check, `npm test -- --watch=false`, prod build, non-blocking `npm audit`). All commands pass locally (133 + 133 MySQL backend, 67 frontend); actionlint clean. Awaiting first green run on GitHub
- [~] Docker Compose (nginx serving the Angular build + proxying `/api` & `/sanctum` → php-fpm, MySQL) — *agent: docker* (owns `docker-compose.yml`, `docker/`, `.dockerignore` files, `.github/workflows/docker.yml`). Docker is not installed locally, so a CI workflow builds the stack and smoke-tests it
  - `db` `mysql:9.1` (random root password, app user scoped to its DB, not published to the host) · `app` `php:8.3-fpm-alpine`, `--no-dev` vendor, `check-platform-reqs`, runs as `www-data`; entrypoint: APP_KEY (env or generated once into the storage volume) → wait for DB → `optimize` → `migrate --force` → idempotent seed · `web` `nginx-unprivileged` serving `dist/frontend/browser` with SPA fallback, `/api` + `/sanctum` via FastCGI → one origin at `http://localhost:8080`
  - SPA `Referrer-Policy: strict-origin-when-cross-origin` (not `no-referrer`): Sanctum needs the Referer on same-origin GETs to treat them as stateful
  - `docker/smoke-test.sh`: SPA + deep links, 401 without session, csrf-cookie 204, login without XSRF → 419, login → me → 12 projects → JSON 404 → logout. Passed locally against the real nginx config (nginx for Windows + php-cgi + SQLite); `docker.yml` runs it on the real stack (and again after restarting `app`). Awaiting first green run on GitHub
- [ ] Deployment (only if requested)

## 9. Documentation & Submission (SUBMISSION.md)

- [x] Root `README.md`:
  - [x] Overview & features (core + bonus)
  - [x] Tech stack & prerequisites (PHP 8.2+ (dev 8.3), Composer, Node ^20.19/^22.12/≥24 per Angular 21, MySQL 8+)
  - [x] Setup & run instructions — copy-paste ready, two paths:
    - [x] **Full setup (MySQL, primary — listed first):** MySQL 9.1 via WAMP (or any MySQL 8+); create DB + least-privilege user (SQL snippet), migrate+seed
    - [x] **Quick start (SQLite, optional):** `DB_CONNECTION=sqlite`, touch `database/database.sqlite`, migrate+seed
    - [x] Clear note to the reviewer: the app is **built and intended to run on MySQL**; the SQLite option exists **only for their convenience** when testing, and the same migrations/seeders run on MySQL (WAMP) unchanged
  - [x] Running tests
  - [x] API reference table (method, path, body, responses, error format examples)
  - [x] Architecture overview + folder structure
  - [x] Technical decisions & trade-offs (enums, Form Requests, Resources, service layer, security choices)
  - [x] Assumptions (dates optional per Q4, PUT = full update, single-tenant auth, ids preserved)
  - [x] Known limitations / future improvements
  - [x] **AI tools disclosure** (Claude Code) — required by README.md
- [x] Draft short technical reflection answers (`docs/REFLECTION.md`) — six common questions (approach, decisions, challenges, errors/validation, improvements, AI use); the official form's exact questions are only visible in the form, so adapt the answers when submitting
- [x] `backend/README.md` Laravel boilerplate replaced with a short pointer to the root README
- [x] Final traceability check: every row in §0 maps to existing code + tests (S1 → README + `docs/REFLECTION.md`)
- [x] Fresh-clone test: clean clone of `feature/docs`, README SQLite path → `composer install`, `migrate:fresh --seed` (12 projects + 1 user), 133 backend tests, Pint clean; `npm ci` (0 vulnerabilities), 67 frontend tests, prod build; `php artisan serve` + `npm start` → CSRF cookie, login and project list through the dev proxy. MySQL path already verified in §6
- [~] All phase PRs merged into `main`; make GitHub repo **public** — `feature/docs` PR open; making the repo public is the user's step
- [ ] Submit via the official form: repo link, setup instructions, reflection answers (user)

---

## Open Questions / Decisions Log

| # | Question | Decision |
|---|---|---|
| Q1 | API path: `/api/projects` (Laravel convention) vs exactly `/projects` (spec literal) | **`/api/projects`**; document in README (2026-10-01) |
| Q2 | Authentication (Sanctum) in scope? Cookie-based SPA auth vs Bearer tokens | **Sanctum SPA cookie auth** + CSRF (2026-10-01) |
| Q3 | Angular UI library: Angular Material vs Tailwind vs Bootstrap | **Angular Material** (2026-10-01) |
| Q4 | Start/Due dates required, or optional (spec only requires names)? | **Both optional (nullable)**; due ≥ start enforced only when both present (2026-10-01) |
| Q5 | Docker / CI / deployment in scope? | **Docker Compose + GitHub Actions CI + OpenAPI spec done as §8 extras; no deployment** (not requested). Docker image builds are verified in CI because Docker isn't installed locally (2026-10-02) |
| Q6 | Test runner: Pest vs PHPUnit | _default: PHPUnit (Laravel default)_ |
| Q7 | MySQL vs SQLite? | **MySQL is primary (dev + docs); code stays DB-agnostic (Eloquent/schema builder only); SQLite quick-start for reviewers; tests on in-memory SQLite**. README must state SQLite is a reviewer convenience only; MySQL (WAMP) is the intended database (2026-10-01) |
| Q9 | Demo user credentials for auth | **`demo@example.com` / `password`** via `DemoUserSeeder`; local-review only, documented in README (2026-10-01) |
| Q10 | Response envelope? (spec doesn't define one) | **Laravel resource default `{ "data": … }`** for single + list responses — consistent with paginated `data/links/meta`; record keys inside match `test_data.json` exactly (2026-10-02) |
| Q11 | PATCH on `/projects/:id`? | **Not supported (405)** — spec lists PUT; PUT is a full replacement (2026-10-02) |
| Q12 | Is `GET /api/meta/enums` public? | **Behind `auth:sanctum`** like the data endpoints — the login page doesn't need it; simpler rule: everything except login requires a session (2026-10-02) |
| Q13 | Project `Policy`? | **Dropped** — no ownership in the spec's model; authorization = authenticated (2026-10-02) |
| Q14 | Angular 22 or 21? (22 needs Node ≥ 22.22; this machine and many reviewers have Node 22.12–22.21) | **Angular 21 LTS** — runs on Node ^20.19 / ^22.12 / ≥24, still in LTS (2026-10-02) |
| Q15 | Frontend dropdowns from `GET /api/meta/enums` or TS enums? | **TS enums** (required by CLAUDE.md; no extra request or loading state); a spec pins the values to the backend's. The meta endpoint stays for other clients (2026-10-02) |
| Q16 | Cross-origin SPA (CORS + `withCredentials`) or same origin? | **Same origin** via the dev proxy (prod: serve both behind one host). Angular only adds the XSRF header to relative URLs, and Sanctum cookies need a shared site anyway; CORS config stays locked down as a fallback (2026-10-02) |
| Q8 | Branching workflow | **Branch per phase + PR into `main`**; history kept linear, no AI attribution in commits (2026-10-01) |

## Progress Log

- 2026-10-01 — Read assessment, created `PLAN.md` and `CLAUDE.md`; decided Q1–Q4.
- 2026-10-01 — §1/§2: repo config files, Laravel 12 + Sanctum scaffolded, MySQL env, CORS locked down, seed data copied. DB creation waiting on MySQL service.
- 2026-10-01 — MySQL DB + `cpt_app` user created; InnoDB forced; default migrations run on MySQL.
- 2026-10-01 — Removed Claude co-author trailers from history; branches made linear; switched to branch-per-phase workflow (`feature/backend-domain` for §3).
- 2026-10-01 — §3 done: enums (+ sort field/direction), `projects` migration, `Project` model, factory, `ProjectSeeder` (upsert on id) + `DemoUserSeeder`; 18 tests green; `migrate:fresh --seed` verified on MySQL. Next: §4 API layer.
- 2026-10-02 — §4 done on `feature/backend-API-Layer`: explicit project routes, thin `ProjectController` + `ProjectService`, `ProjectRequest` (store/update), `IndexProjectRequest` → `ProjectFilters`, `ProjectResource`, search/filter/sort/opt-in pagination, `GET /api/meta/enums`; 107 tests green (SQLite), Pint clean, sort/search queries verified on MySQL. Next: §5 security & error handling.
- 2026-10-02 — §5 done on `feature/security`: `ApiExceptionRenderer` (uniform JSON errors, no leaks), `ForceJsonResponse`, `SecurityHeaders`, `api`/`login` rate limiters, Sanctum SPA auth (`AuthController` login/logout/me) with all data routes behind `auth:sanctum`; 133 tests green, Pint clean, cookie+CSRF flow verified live on MySQL. Next: §6 portability check, then §7 frontend.
- 2026-10-02 — §6 done on `feature/backend-tests`: portability check — full suite green on SQLite and MySQL (`client_project_tracker_test`), `migrate:fresh --seed` verified on both. Next: §7 frontend on `feature/frontend`.
- 2026-10-02 — §7 done on `feature/frontend`: Angular 21 + Material SPA — Sanctum login, guarded routes, project list (URL-synced search/filters/server sort), create/edit form (client validation mirroring the API + 422 mapping), delete confirm, global error interceptor, responsive + a11y; 67 Vitest tests green, prod build clean, `npm audit` 0; full flow verified in headless Chrome against Laravel + MySQL. Next: §9 documentation & submission (§8 extras optional).
- 2026-10-02 — §9 on `feature/docs`: root `README.md` (features, prerequisites, MySQL-first setup + SQLite quick start, tests, API reference with real responses, architecture, decisions, assumptions, limitations, AI disclosure), `docs/REFLECTION.md`, backend README boilerplate replaced; fresh-clone test passed. Remaining: review/merge PR, make repo public, submit the form (user). §8 extras still optional.
- 2026-10-02 — §8 on `feature/extras`: adopted the orchestrator + subagents model (§8.0); three parallel subagents wrote the OpenAPI spec, CI workflow and Docker Compose setup; orchestrator reviewed the diffs, re-ran checks, updated README (Docker quick start, CI badges, spec link, limitations, AI disclosure) and REFLECTION. Next: confirm green CI + Docker runs on GitHub, then PR → `main`.
