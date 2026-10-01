# Technical Reflection

Short answers about how the Client Project Tracker was built. The decision log, with dates, is in
[`PLAN.md`](../PLAN.md#open-questions--decisions-log).

## 1. How did you approach the problem?

I started from the requirements, not the code. I turned `REQUIREMENTS.md` into a traceability matrix where every
model field, endpoint, UI feature and validation rule maps to the code that implements it and the test that proves
it. Then I built in thin vertical layers, each on its own branch and merged into `main` when done:

1. **Domain:** enums, migration, model, seeders that reproduce `test_data.json` exactly
2. **API:** routes, Form Requests, service, resources
3. **Security and errors:** auth, rate limits, headers, one error format
4. **Tests on both databases**
5. **Angular frontend**

The core CRUD and validation came first. Bonus features (search, filters, sort, auth) were added only once the core
was tested.

## 2. What were the key technical decisions, and why?

- **Enums as the single source of truth.** The status and priority values appear in validation, DB columns, error
  messages, sorting and the UI. Each is a PHP backed enum with a matching TypeScript enum, and a spec fails if they
  drift apart. This removes the most likely bug in this app: a typo in `"In Progress"`.
- **Layering in Laravel.** Validation is in Form Requests, query logic in `ProjectService`, and output shape in API
  Resources. That leaves controllers at a few lines each. Every layer can be read and tested on its own.
- **Validation on both sides, with the server as the authority.** Angular gives instant feedback. The API is the
  real gate, and its 422 field errors are mapped back onto the form controls, so the user sees a server-side
  rejection the same way as a client-side one.
- **Cookie-based Sanctum auth over bearer tokens.** No token in `localStorage` for XSS to steal, and CSRF comes
  built in. The cost is that the SPA and API must share a site, which I handled with a dev proxy.
- **MySQL as the target, code kept database-agnostic.** That lets the tests run on in-memory SQLite with zero setup,
  and I confirmed the same suite passes on MySQL.

## 3. What was the most challenging part?

- **Small environment problems.** WAMP's MySQL defaulted to MyISAM, which broke migrations (1000-byte index limit,
  no transactions), so I forced InnoDB in config. An npm 10.9 bug broke the first `npm install`. A critical advisory
  in a transitive Angular build dependency needed a pinned override to get `npm audit` to zero.
- **Edge cases in validation.** One example: if the start date is invalid, the due-date comparison shouldn't also
  fail, because the user would get two errors for one mistake. The `after_or_equal` rule now applies only when the
  start date is itself valid. Another: sorting by priority should go Low → Medium → High, not alphabetically. I used
  a bound `CASE` expression that works on both MySQL and SQLite.
- **Getting cookie auth, CSRF and the Angular proxy to agree** on origin, cookie domain and header names. This was
  verified end to end in a headless browser, not just in unit tests.

## 4. How did you handle errors and validation?

- Every API error goes through one renderer and has the shape `{ message, errors? }`. Statuses are 401, 404, 405,
  419, 422, 429 and 500. Messages are written for clients, and stack traces or SQL never leak in production mode.
- The input rules cover more than the spec requires: max lengths, strict `YYYY-MM-DD` dates (`2026-02-30` is
  rejected), trimmed strings (whitespace-only names count as missing), and whitelisted query parameters.
- On the frontend, one interceptor turns every HTTP failure into a typed `ApiError` with a friendly message. It
  handles an expired session by sending the user back to the login page, and returns them to where they were after
  they sign in.
- Each rule has a test, and the validation matrix runs against both POST and PUT.

## 5. What would you improve with more time?

- A CI pipeline (GitHub Actions) and Docker Compose, so a reviewer runs one command
- Pagination in the UI (the API already supports it) and escaping `LIKE` wildcards in search
- An OpenAPI spec generated from the Form Requests and Resources
- Per-user ownership with a `ProjectPolicy`, if the product needed multiple teams
- Committing the Playwright smoke test as a real end-to-end suite

## 6. How did you use AI tools?

I used **Claude Code** throughout, as a pair programmer: for planning, scaffolding, writing code and tests, running
the test suites and browser checks, and drafting these docs. I kept control of the decisions (each one is logged in
`PLAN.md` with its date), and I wrote down the conventions the assistant had to follow in `CLAUDE.md`. Examples:
enums for constant sets, a test for every rule, check each change against the assessment files. I reviewed each
change before committing it. The AI was most useful for speed and for thorough test coverage. My job was keeping it
on the spec and making the trade-off calls.
