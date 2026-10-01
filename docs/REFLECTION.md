# Engineering Reflection

Answers to the five questions on the assessment's submission form. Each answer is short enough to paste straight
into the form. The full decision log, with dates, is in [`PLAN.md`](../PLAN.md#open-questions--decisions-log).

## 1. Why did you choose this approach?

I started from the requirements, not the code. I turned them into a traceability matrix: every field, endpoint,
UI feature and validation rule maps to the code that implements it and the test that proves it. I then built in
layers (domain → API → security → tests → frontend), each on its own branch. The core CRUD and validation came
before any bonus feature. Laravel Form Requests, a service class and API Resources keep controllers thin and each
concern testable. PHP and TypeScript enums are the single source of truth for status and priority, so a value like
"In Progress" can't drift between the database, the API and the UI. Angular with Material gave typed reactive forms
and accessible components out of the box.

## 2. What tradeoffs did you make?

- **Cookie-based Sanctum auth instead of bearer tokens.** There's no token in `localStorage` for XSS to steal, and
  CSRF protection comes built in. The cost is that the SPA and API must share one origin (a dev proxy locally,
  nginx in Docker).
- **PUT as a full replacement, no PATCH.** It follows the spec and is simpler to validate. Clients must send the
  whole record.
- **MySQL as the target, with the code kept database-agnostic.** The tests run on in-memory SQLite with no setup,
  and the same suite is also verified on MySQL in CI.
- **Pagination supported by the API but not used by the UI.** With 12 records, loading the full list is simpler.
- **A hand-written OpenAPI spec.** It was quick to produce, but it can drift from the code.
- **No per-user ownership.** The spec's data model has no owner, so any signed-in user can manage every project.

## 3. What would you improve with more time?

- Pagination in the UI, and escaping `LIKE` wildcards in search
- Committing the Playwright browser checks as an end-to-end suite in CI
- Generating the OpenAPI spec from the code, or contract-testing responses against it
- Per-user ownership with a `ProjectPolicy` if multiple teams used it
- A deployment pipeline on top of the existing Docker and CI setup (HTTPS, real secrets, no demo seeding)

## 4. Did you use AI tools during development?

**Yes.**

## 5. If yes, which tools were used?

**Claude Code** (Anthropic's Claude), as a pair programmer. I used it for planning, scaffolding, writing code and
tests, running the test suites and browser checks, and drafting documentation. For the optional extras (Docker,
CI, the OpenAPI spec and the end-to-end UI check), one main session ran parallel subagents, each with its own
files. I made the design decisions, which are logged in `PLAN.md`. I set the rules it had to follow in
`CLAUDE.md`: enums for constant sets, a test for every rule, and checking each change against the assessment. I
reviewed every change before committing it. This is also disclosed in the README.
