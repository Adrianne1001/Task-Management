# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Session start — do this first, every session

1. **Read `PLAN.md` in full before doing anything else**, even if the user's first message is short or unrelated.
   Use it to know what's done, what's in progress (`[~]`), the decisions log, and the next unchecked item.
2. Briefly tell the user where things stand (last progress log entry + next item) before starting work.

## Session hygiene — remind the user to start a new session

Proactively tell the user, in one short line at the end of a reply, when starting a fresh session is recommended:

- A plan phase (a `##` section of `PLAN.md`) has just been completed and committed.
- The conversation has accumulated a lot of file reads, large diffs, or long test/build output.
- The work is about to switch area (e.g. backend → frontend, code → docs/submission).

Before suggesting it, make sure `PLAN.md` (checkboxes + progress log) is updated and the work is committed, so the
next session can pick up from `PLAN.md` alone. Suggest the opening prompt, e.g.
*"Continue with PLAN.md §4 (API layer)."*

## What this is

A technical assessment submission: a **Client Project Tracker** (CRUD for client projects).

- Frontend: **Angular** (`/frontend`)
- Backend: **Laravel 12 / PHP 8.3** REST API (`/backend`)
- Database: **MySQL 9.1** (local WAMP at `D:\Documents\Clients\Server\Wamp`)

## Source of truth — the assessment

Assessment files live at:
`C:\Users\adria\Downloads\fullstack-developer-assessment-main\fullstack-developer-assessment-main\`

- `README.md` — objective, allowed tools (AI use must be disclosed), evaluation criteria
- `REQUIREMENTS.md` — project model, status/priority values, endpoints, UI features, validation rules, bonus items
- `SUBMISSION.md` — public GitHub repo, setup/run instructions, technical reflection, rubric
- `test_data.json` — 12 seed projects (copied to `backend/database/data/projects.json`)

**Before starting or finishing any task, check it against these files.** If an implementation choice deviates from
them (naming, endpoints, field names, allowed values, validation), stop and flag it to the user instead of silently
diverging. API JSON field names and enum string values must match `test_data.json` exactly
(`clientName`, `projectName`, `"In Progress"`, `"On Hold"`, …).

Rubric weights: Functionality 30% · Code Quality 25% · Architecture 20% · Documentation 10% · Error Handling &
Validation 10% · Communication 5%. Quality over quantity.

## ALWAYS keep PLAN.md updated

`PLAN.md` is the living checklist.

- After completing any item, tick it (`[x]`) in the same change set as the code.
- Mark in-progress work `[~]`; dropped items `[-]` with a reason.
- Record answered questions in the **Open Questions / Decisions Log** table.
- Add a dated line to the **Progress Log** at the end of each work session.
- Keep the **Requirements Traceability Matrix** (§0) accurate — every requirement maps to code and a test.

## Non-negotiable conventions

- **Enums for all small constant sets.** PHP 8.1+ backed enums in `backend/app/Enums` (`ProjectStatus`,
  `ProjectPriority`, sort field/direction, …) and matching TypeScript `enum`s in the frontend with identical values.
  Never hard-code status/priority strings elsewhere; DB enum columns are built from `Enum::values()`.
- **Security first:** Form Request validation (`Rule::enum`, `after_or_equal`, max lengths, strict date format),
  `$fillable` whitelists, API Resources for output, whitelisted sort/filter params, rate limiting, CORS restricted
  to the frontend origin, security headers, consistent JSON errors with no stack traces/SQL leaked, secrets only in
  `.env`. No raw SQL with user input.
- **Migrations + seeders:** schema changes only via migrations; `ProjectSeeder` seeds from `test_data.json`
  preserving ids. `php artisan migrate:fresh --seed` must always work.
- Thin controllers; query/filter logic in a service class. camelCase in the API, snake_case in the DB.
- Every endpoint and validation rule has a feature test. Run tests before marking an item done.
- Commit on the `devsite` branch; PR to `main`. Don't commit `.env`, `vendor/`, `node_modules/`.
- Commit messages and PR descriptions carry **no AI attribution** (no `Co-Authored-By: Claude`, no "Generated with Claude Code"). AI use is disclosed in the README instead.

## Common commands

```bash
# Backend (from /backend)
composer install
php artisan migrate:fresh --seed
php artisan serve            # http://127.0.0.1:8000
php artisan test
./vendor/bin/pint

# Frontend (from /frontend)
npm install
npm start                    # ng serve with proxy to backend
npm test
npm run build
```
