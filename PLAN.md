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
| R4 | GET /projects | `ProjectController@index` | Feature test |
| R5 | GET /projects/:id | `ProjectController@show` | Feature test (200 + 404) |
| R6 | POST /projects | `ProjectController@store` | Feature test (201 + 422) |
| R7 | PUT /projects/:id | `ProjectController@update` | Feature test (200 + 404 + 422) |
| R8 | DELETE /projects/:id | `ProjectController@destroy` | Feature test (204 + 404) |
| R9 | UI: project list | `ProjectListComponent` | Manual + unit test |
| R10 | UI: create project | `ProjectFormComponent` (create mode) | Manual + unit test |
| R11 | UI: edit project | `ProjectFormComponent` (edit mode) | Manual + unit test |
| R12 | UI: delete project | List action + confirm dialog | Manual |
| V1 | Client Name required | `ProjectRequest` + Angular `Validators.required` | Test |
| V2 | Project Name required | `ProjectRequest` + Angular `Validators.required` | Test |
| V3 | Status must be valid | `Rule::enum(ProjectStatus::class)` | Test |
| V4 | Priority must be valid | `Rule::enum(ProjectPriority::class)` | Test |
| V5 | Due Date ≥ Start Date | `after_or_equal:startDate` + Angular cross-field validator | Test |
| V6 | Invalid requests → meaningful errors | Consistent JSON error envelope (422/404/405/429/500) | Test |
| S1 | Public GitHub repo, setup/run instructions, technical reflection, AI disclosure (SUBMISSION/README) | Root `README.md`, `docs/` | Checklist §9 |
| D1 | Seed data = `test_data.json` (12 projects, ids preserved) | `ProjectSeeder` + `database/data/projects.json` | Seeder test |

---

## 1. Repository & Environment Setup

- [ ] Confirm repo layout (monorepo): `/backend` (Laravel), `/frontend` (Angular), root `README.md`, `PLAN.md`, `CLAUDE.md`, `docs/`
- [ ] Root `.gitignore` / `.editorconfig` (LF, 4-space PHP, 2-space TS)
- [ ] Copy `test_data.json` into `backend/database/data/projects.json` (unchanged)
- [ ] Create MySQL database `client_project_tracker` + dedicated DB user (least privilege, not root)
- [ ] Install Angular CLI (`npx @angular/cli` or global) — currently not installed
- [ ] Work on `devsite` branch; small, descriptive commits per phase; PR to `main` at the end

## 2. Backend — Laravel Scaffold & Config

- [ ] `composer create-project laravel/laravel backend` (Laravel 12)
- [ ] `php artisan install:api` (adds `routes/api.php` + Sanctum)
- [ ] `.env` / `.env.example`: MySQL connection, `APP_DEBUG=false` in example for prod notes, `FRONTEND_URL`
- [ ] API served under `/api` → `/api/projects` (Q1); README states base URL clearly
- [ ] Code style: Laravel Pint configured; `strict_types` in app code

## 3. Backend — Domain: Enums, Migration, Model, Seeders

- [ ] `app/Enums/ProjectStatus.php` — string-backed enum: `Planning`, `InProgress = 'In Progress'`, `OnHold = 'On Hold'`, `Completed` + `values()` / `label()` helpers
- [ ] `app/Enums/ProjectPriority.php` — `Low`, `Medium`, `High` + helpers
- [ ] Any other small constant sets as enums too (e.g. `SortField`, `SortDirection` for list sorting)
- [ ] Migration `create_projects_table`:
  - `id` (bigIncrements), `client_name` varchar(150) not null, `project_name` varchar(150) not null,
  - `description` text nullable, `status` enum(from `ProjectStatus::values()`), `priority` enum(from `ProjectPriority::values()`),
  - `start_date` date **nullable**, `due_date` date **nullable** (Q4), timestamps
  - Indexes on `status`, `priority`, `due_date`
- [ ] `Project` model: `$fillable` whitelist, `casts()` → enums + `date:Y-m-d` (prevents mass-assignment & guarantees enum integrity)
- [ ] `ProjectFactory` (uses enum cases; due date always ≥ start date; states for null dates)
- [ ] `ProjectSeeder`: reads `database/data/projects.json`, maps camelCase → snake_case, converts strings via `ProjectStatus::from()` / `ProjectPriority::from()` (fails loudly on invalid data), preserves ids, idempotent (`upsert` on id)
- [ ] `DatabaseSeeder` calls `ProjectSeeder` (+ demo user if auth is in scope)
- [ ] `php artisan migrate:fresh --seed` → 12 rows verified

## 4. Backend — API Layer

- [ ] `routes/api.php`: `Route::apiResource('projects', ProjectController::class)` (index, show, store, update, destroy only)
- [ ] `ProjectController` — thin; delegates to a `ProjectService` (or action classes) for query/filter logic
- [ ] `StoreProjectRequest` / `UpdateProjectRequest` (PUT = full replacement, same rules):
  - `clientName` required|string|max:150 · `projectName` required|string|max:150
  - `description` nullable|string|max:2000
  - `status` required|`Rule::enum(ProjectStatus::class)` · `priority` required|`Rule::enum(ProjectPriority::class)`
  - `startDate` nullable|date_format:Y-m-d · `dueDate` nullable|date_format:Y-m-d, plus `after_or_equal:startDate` **only when startDate is filled** (`Rule::when`) — Laravel otherwise fails the comparison against a null field
  - Custom, human-readable messages (e.g. "Status must be one of: Planning, In Progress, On Hold, Completed.")
  - Map camelCase input → snake_case attributes in one place (`validatedAttributes()`)
- [ ] `ProjectResource` — camelCase output matching `test_data.json` shape exactly
- [ ] Status codes: 200 list/show/update, 201 create (+ `Location` header), 204 delete, 404, 422, 429
- [ ] Bonus (index query params, all whitelisted/validated via `IndexProjectRequest`):
  - [ ] `search` (client/project name, parameter-bound `LIKE`)
  - [ ] `status` filter · `priority` filter (validated against enums)
  - [ ] `sort` (enum whitelist: clientName, projectName, status, priority, startDate, dueDate) + `direction` (asc|desc)
  - [ ] Optional pagination (`page`, `perPage` capped e.g. 100)
- [ ] `GET /meta/enums` (optional) so the frontend can render dropdowns from backend enums — single source of truth

## 5. Backend — Security & Error Handling

- [ ] Global JSON error rendering in `bootstrap/app.php` → consistent envelope `{ "message": "...", "errors": { field: [..] } }`
  - `ModelNotFoundException`/`NotFoundHttpException` → 404 "Project not found."
  - `ValidationException` → 422 · `MethodNotAllowed` → 405 · `ThrottleRequests` → 429
  - Anything else → 500 generic message (no stack traces / SQL leaked when `APP_DEBUG=false`)
- [ ] Force JSON responses for API routes (middleware setting `Accept: application/json`)
- [ ] Rate limiting: `throttle:api` (e.g. 60 req/min per IP/user), stricter on login
- [ ] CORS (`config/cors.php`): only the Angular origin (`FRONTEND_URL`), only needed methods/headers — no `*`
- [ ] Security headers middleware: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, basic CSP for API responses
- [ ] Mass-assignment protection (`$fillable`), Eloquent/bound params only (no raw SQL with input), whitelisted sort columns
- [ ] Input hardening: max lengths, strict date format, reject unknown enum values, `trim` (default middleware)
- [ ] Authentication — **Sanctum SPA cookie auth** (Q2): `GET /sanctum/csrf-cookie`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`; `projects` routes behind `auth:sanctum`; `statefulApi()`; `SANCTUM_STATEFUL_DOMAINS` + `SESSION_DOMAIN` set; session regenerated on login, invalidated on logout; login throttled (5/min); seeded demo user (hashed password, credentials in README)
- [ ] Secrets only in `.env` (never committed); `.env.example` documented
- [ ] Optional: `Policy` for projects (structure for future roles)

## 6. Backend — Tests (PHPUnit / Pest)

- [ ] Feature tests per endpoint: happy path + 404 + 422 cases
- [ ] Validation matrix: missing clientName, missing projectName, invalid status, invalid priority, dueDate < startDate, dueDate == startDate (allowed), only one date given (allowed), both dates null (allowed), bad date format, over-length strings
- [ ] Resource shape test (keys exactly match `test_data.json`)
- [ ] Seeder test: 12 rows, values equal `test_data.json`
- [ ] Filter / search / sort tests; invalid sort column rejected
- [ ] Auth tests: 401 on projects without session, login success/failure, logout, login throttling
- [ ] Unit tests for enums (`values()`, `from()` failure)
- [ ] Test DB: separate MySQL test DB (or SQLite in-memory) configured in `phpunit.xml`

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
  - [ ] Setup & run instructions (backend, DB create, migrate+seed, frontend) — copy-paste ready
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
- [ ] Merge `devsite` → `main`; make GitHub repo **public**
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

## Progress Log

- 2026-10-01 — Read assessment, created `PLAN.md` and `CLAUDE.md`; decided Q1–Q4.
