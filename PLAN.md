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
| R9 | UI: project list | `ProjectListComponent` | Manual + unit test |
| R10 | UI: create project | `ProjectFormComponent` (create mode) | Manual + unit test |
| R11 | UI: edit project | `ProjectFormComponent` (edit mode) | Manual + unit test |
| R12 | UI: delete project | List action + confirm dialog | Manual |
| V1 | Client Name required | `ProjectRequest` + Angular `Validators.required` | `ProjectValidationTest` (+ Angular unit test §7) |
| V2 | Project Name required | `ProjectRequest` + Angular `Validators.required` | `ProjectValidationTest` (+ Angular unit test §7) |
| V3 | Status must be valid | `Rule::enum(ProjectStatus::class)` in `ProjectRequest` | `ProjectValidationTest` |
| V4 | Priority must be valid | `Rule::enum(ProjectPriority::class)` in `ProjectRequest` | `ProjectValidationTest` |
| V5 | Due Date ≥ Start Date | `after_or_equal:startDate` (when start date valid) + Angular cross-field validator | `ProjectValidationTest` (+ Angular unit test §7) |
| V6 | Invalid requests → meaningful errors | `App\Exceptions\ApiExceptionRenderer` — one `{ message, errors? }` envelope (401/404/405/419/422/429/500) | `ErrorHandlingTest`, `AuthTest` |
| S1 | Public GitHub repo, setup/run instructions, technical reflection, AI disclosure (SUBMISSION/README) | Root `README.md`, `docs/` | Checklist §9 |
| D1 | Seed data = `test_data.json` (12 projects, ids preserved) | `ProjectSeeder` + `database/data/projects.json` | Seeder test |

---

## 1. Repository & Environment Setup

- [~] Confirm repo layout (monorepo) — `/backend` done, `/frontend` pending (§7): `/backend` (Laravel), `/frontend` (Angular), root `README.md`, `PLAN.md`, `CLAUDE.md`, `docs/`
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
- [ ] Portability check: full suite + `migrate:fresh --seed` pass on both SQLite and MySQL; no raw MySQL-only SQL

## 7. Frontend — Angular

- [ ] `ng new frontend` (standalone components, routing, SCSS, strict mode)
- [ ] Angular Material (Q3): table + sort, dialog, snackbar, datepicker, select, form-field
- [ ] Structure:
  - `core/` — `ProjectService`, `AuthService` (signals for current user), interceptors (`withCredentials`, error → 401 redirects to login), `withXsrfConfiguration` (XSRF-TOKEN / X-XSRF-TOKEN), `environment.apiUrl`
  - `shared/` — confirm dialog, toast/snackbar, loading spinner, status/priority badge components
  - `features/projects/` — `project-list`, `project-form`, models
  - `models/` — `Project` interface, **TS enums** `ProjectStatus`, `ProjectPriority`, `SortDirection` (values identical to backend)
- [ ] Dev proxy (`proxy.conf.json`) for `/api` and `/sanctum` → Laravel, so the SPA and API share an origin (needed for cookie auth; no CORS in dev)
- [ ] Routes: `/login`, `/projects` (list), `/projects/new`, `/projects/:id/edit`, `**` → not found; functional `authGuard` on project routes
- [ ] Project list: table/cards with client, project, status badge, priority badge, dates; empty / loading / error states
- [ ] Bonus on list: search box (debounced), status & priority filters, sortable columns (server-side via query params)
- [ ] Project form (typed Reactive Forms): required validators (names, status, priority), enum dropdowns, optional date pickers, **cross-field validator** `dueDate >= startDate` (only when both set), inline error messages, disable submit while saving
- [ ] Map backend 422 `errors` onto form controls (server is still the authority)
- [ ] Delete: confirmation dialog → success toast → list refresh
- [ ] Global HTTP error interceptor → friendly messages for 0/404/422/429/500
- [ ] Accessibility: labels, keyboard navigation, focus on first invalid field
- [ ] Responsive layout
- [ ] Unit tests: `ProjectService` (HttpTestingController), date-range validator, form component basics

## 8. Optional Extras (only if time allows — quality over quantity)

- [ ] Docker Compose (php-fpm/nginx, mysql, angular) — Docker not currently installed locally
- [ ] OpenAPI spec or Postman collection in `docs/`
- [ ] GitHub Actions CI: backend tests + Pint, frontend lint + tests + build
- [ ] Deployment (only if requested)

## 9. Documentation & Submission (SUBMISSION.md)

- [ ] Root `README.md`:
  - [ ] Overview & features (core + bonus)
  - [ ] Tech stack & prerequisites (PHP 8.3, Composer, Node 22, MySQL)
  - [ ] Setup & run instructions — copy-paste ready, two paths:
    - [ ] **Full setup (MySQL, primary — listed first):** MySQL 9.1 via WAMP (or any MySQL 8+); create DB + least-privilege user (SQL snippet), migrate+seed
    - [ ] **Quick start (SQLite, optional):** `DB_CONNECTION=sqlite`, touch `database/database.sqlite`, migrate+seed
    - [ ] Clear note to the reviewer: the app is **built and intended to run on MySQL**; the SQLite option exists **only for their convenience** when testing, and the same migrations/seeders run on MySQL (WAMP) unchanged
  - [ ] Running tests
  - [ ] API reference table (method, path, body, responses, error format examples)
  - [ ] Architecture overview + folder structure
  - [ ] Technical decisions & trade-offs (enums, Form Requests, Resources, service layer, security choices)
  - [ ] Assumptions (e.g. dates required, PUT = full update)
  - [ ] Known limitations / future improvements
  - [ ] **AI tools disclosure** (Claude Code) — required by README.md
- [ ] Draft short technical reflection answers (`docs/REFLECTION.md`)
- [ ] Final traceability check: every row in §0 ticked
- [ ] Fresh-clone test: follow README from scratch on a clean checkout
- [ ] All phase PRs merged into `main`; make GitHub repo **public**
- [ ] Submit via the official form: repo link, setup instructions, reflection answers

---

## Open Questions / Decisions Log

| # | Question | Decision |
|---|---|---|
| Q1 | API path: `/api/projects` (Laravel convention) vs exactly `/projects` (spec literal) | **`/api/projects`**; document in README (2026-10-01) |
| Q2 | Authentication (Sanctum) in scope? Cookie-based SPA auth vs Bearer tokens | **Sanctum SPA cookie auth** + CSRF (2026-10-01) |
| Q3 | Angular UI library: Angular Material vs Tailwind vs Bootstrap | **Angular Material** (2026-10-01) |
| Q4 | Start/Due dates required, or optional (spec only requires names)? | **Both optional (nullable)**; due ≥ start enforced only when both present (2026-10-01) |
| Q5 | Docker / CI / deployment in scope? | _default: optional extras, after core is done_ |
| Q6 | Test runner: Pest vs PHPUnit | _default: PHPUnit (Laravel default)_ |
| Q7 | MySQL vs SQLite? | **MySQL is primary (dev + docs); code stays DB-agnostic (Eloquent/schema builder only); SQLite quick-start for reviewers; tests on in-memory SQLite**. README must state SQLite is a reviewer convenience only; MySQL (WAMP) is the intended database (2026-10-01) |
| Q9 | Demo user credentials for auth | **`demo@example.com` / `password`** via `DemoUserSeeder`; local-review only, documented in README (2026-10-01) |
| Q10 | Response envelope? (spec doesn't define one) | **Laravel resource default `{ "data": … }`** for single + list responses — consistent with paginated `data/links/meta`; record keys inside match `test_data.json` exactly (2026-10-02) |
| Q11 | PATCH on `/projects/:id`? | **Not supported (405)** — spec lists PUT; PUT is a full replacement (2026-10-02) |
| Q12 | Is `GET /api/meta/enums` public? | **Behind `auth:sanctum`** like the data endpoints — the login page doesn't need it; simpler rule: everything except login requires a session (2026-10-02) |
| Q13 | Project `Policy`? | **Dropped** — no ownership in the spec's model; authorization = authenticated (2026-10-02) |
| Q8 | Branching workflow | **Branch per phase + PR into `main`**; history kept linear, no AI attribution in commits (2026-10-01) |

## Progress Log

- 2026-10-01 — Read assessment, created `PLAN.md` and `CLAUDE.md`; decided Q1–Q4.
- 2026-10-01 — §1/§2: repo config files, Laravel 12 + Sanctum scaffolded, MySQL env, CORS locked down, seed data copied. DB creation waiting on MySQL service.
- 2026-10-01 — MySQL DB + `cpt_app` user created; InnoDB forced; default migrations run on MySQL.
- 2026-10-01 — Removed Claude co-author trailers from history; branches made linear; switched to branch-per-phase workflow (`feature/backend-domain` for §3).
- 2026-10-01 — §3 done: enums (+ sort field/direction), `projects` migration, `Project` model, factory, `ProjectSeeder` (upsert on id) + `DemoUserSeeder`; 18 tests green; `migrate:fresh --seed` verified on MySQL. Next: §4 API layer.
- 2026-10-02 — §4 done on `feature/backend-API-Layer`: explicit project routes, thin `ProjectController` + `ProjectService`, `ProjectRequest` (store/update), `IndexProjectRequest` → `ProjectFilters`, `ProjectResource`, search/filter/sort/opt-in pagination, `GET /api/meta/enums`; 107 tests green (SQLite), Pint clean, sort/search queries verified on MySQL. Next: §5 security & error handling.
- 2026-10-02 — §5 done on `feature/security`: `ApiExceptionRenderer` (uniform JSON errors, no leaks), `ForceJsonResponse`, `SecurityHeaders`, `api`/`login` rate limiters, Sanctum SPA auth (`AuthController` login/logout/me) with all data routes behind `auth:sanctum`; 133 tests green, Pint clean, cookie+CSRF flow verified live on MySQL. Next: §6 portability check, then §7 frontend.
