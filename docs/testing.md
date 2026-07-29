# Testing

## Current state

| Layer | Runner | Config | Location | Status |
| --- | --- | --- | --- | --- |
| Unit / component | Vitest 4.1.10 | `vitest.config.ts` | `tests/unit/**` | 17 files, 236 tests, all passing |
| Integration | Vitest 4.1.10 | `vitest.integration.config.ts` | `tests/integration/**` | 14 files, 274 tests, all passing against a real in-memory MongoDB |
| End-to-end | Playwright 1.62.0 | `playwright.config.ts` | `tests/e2e/**` | 11 spec files × 3 projects. Compile-verified (`npx playwright test --list`); needs a seeded database to be meaningful |
| Types | `tsc` | `tsconfig.json` | — | `npx tsc --noEmit` → 0 errors |
| Lint | ESLint 9.39.1 | `eslint.config.mjs` | — | `npx eslint .` → 0 errors, 55 warnings |
| Build | `next build` | `next.config.ts` | — | `npm run build` → succeeds (compiles with placeholder env when secrets are absent) |

Unit and integration together: **510 tests**.

Supporting libraries: `@testing-library/react` 16.3.0, `@testing-library/dom` 10.4.1, `@testing-library/jest-dom` 6.9.1, `jsdom` 26.1.0, `mongodb-memory-server` 10.1.4.

The 55 lint warnings are deliberate, not debt in flight: 29 React Compiler advisory rules from `eslint-plugin-react-hooks` v7 (`set-state-in-effect` 13, `purity` 9, `incompatible-library` 4, `refs` 2, `immutability` 1) that `eslint.config.mjs` downgrades from `error` to `warn`, 11 unused `eslint-disable` directives, 12 `@typescript-eslint/no-unused-vars`, 2 `react-hooks/exhaustive-deps` and 1 `@typescript-eslint/no-explicit-any`. Re-run `npx eslint .` rather than trusting this count after a change.

### Verified by hand, not by a spec

These were checked against a running server with a seeded database. Nothing in the automated suites covers them yet, so they are listed here rather than counted above.

`scripts/verify-login.sh [baseUrl]` automates the sign-in half of this table against a running server: it drives `/api/auth/callback/credentials` for correct, wrong and unknown credentials, prints the resulting roles and permission counts from `/api/auth/session`, and checks `/admin`, `/admin/pages` and `/dashboard` for admin, staff, student and anonymous callers. Requires a seeded database.

| Check | Result |
| --- | --- |
| `/sitemap.xml` | 200, valid `<sitemapindex>` |
| `/sitemaps/static.xml` | 200, valid `<urlset>` |
| `/robots.txt` | 200, and its advertised `Sitemap:` URL resolves |
| `/colleges/does-not-exist`, `/exams/nope`, `/courses/nope`, `/predictors/nope`, `/articles/nope`, `/nonexistent-slug`, `/foo/bar/baz` | 404 |
| `/`, `/about` and the other valid routes | 200 |
| The nine CMS slugs after `npm run db:seed` | 200 with their real titles |
| `/admin`, `/admin/colleges`, `/dashboard` while signed out | 307 to `/login?callbackUrl=…` |
| `/api/compare/pdf?slugs=a,b` | `application/pdf` |
| `/api/education-loans/summary?...` | 3-page PDF |
| Credentials sign-in (admin / student / staff) | Session issued with the right roles and permission counts (52 / 0 / 17) |
| Wrong password and unknown email | `?error=CredentialsSignin`, no session issued |

## Commands

| Command | Runner | Purpose |
| --- | --- | --- |
| `npm test` | Vitest | Unit suite — everything under `tests/**` except `tests/e2e/**` and `tests/integration/**` |
| `npm run test:unit` | Vitest | `vitest run tests/unit` — the same set, path-scoped |
| `npm run test:integration` | Vitest | `tests/integration/**` against an ephemeral in-memory MongoDB |
| `npm run test:all` | Vitest | Unit then integration |
| `npm run test:watch` | Vitest | Watch mode during development |
| `npm run test:e2e` | Playwright | Runs `tests/e2e` against `baseURL` |
| `npm run test:e2e:ui` | Playwright | Interactive UI mode |
| `npm run typecheck` | tsc | Type-level regression check |
| `npm run lint` / `npm run lint:fix` | ESLint | Flat config lint, with or without `--fix` |

## Layout

```
tests/
├── setup.ts                              # env stubbing + jest-dom matchers
├── stubs/
│   └── server-only.ts                    # aliased over the `server-only` package
├── unit/
│   ├── lib/
│   │   ├── emi.test.ts                   # src/lib/finance/emi.ts
│   │   ├── rate-limit.test.ts            # fixed-window buckets
│   │   ├── rbac.test.ts                  # resolvePermissions / can / canAny / canAll
│   │   └── utils.test.ts                 # slugify, truncate, formatters
│   ├── schemas/
│   │   └── validation.test.ts            # Zod schemas from src/schemas
│   ├── services/
│   │   └── predictor-rules.test.ts       # probability band bucketing
│   └── components/
│       └── jsdom-environment.test.tsx    # jsdom + Testing Library example
├── integration/
│   ├── setup.ts                          # starts an in-memory MongoDB, wipes between tests
│   ├── authorization.test.ts             # server-side RBAC across seven action modules
│   ├── repositories/                     # base, college, content, geo, lead, system
│   ├── services/                         # lead-admin, predictor, review, saved, search
│   └── actions/                          # lead, saved, admin-crud
└── e2e/
    ├── helpers.ts                        # shared assertions and breakpoints
    ├── admin-helpers.ts                  # sign-in (session-cached) + admin form helpers
    ├── home.spec.ts
    ├── search.spec.ts
    ├── colleges.spec.ts
    ├── compare.spec.ts
    ├── predictor.spec.ts
    ├── counselling.spec.ts
    ├── seo-landing-pages.spec.ts
    ├── auth.spec.ts
    ├── admin-workflows.spec.ts
    ├── admin-leads.spec.ts
    ├── mobile-drawer.spec.ts
    ├── accessibility.spec.ts
    └── responsive.spec.ts
```

### Two traps the E2E specs are written around

**Login is rate-limited.** `loginAction` allows ten attempts per email per fifteen
minutes. Signing in per test exhausts that partway through the admin suite and the
rest silently skip, which looks like passing. `signInAsAdmin` therefore performs one
real credentials login per run, caches the cookies under
`test-results/.auth/admin-session.json`, replays them for later tests, and only falls
back to a fresh login when the replayed session stops working.

**Clicks before hydration are dropped.** Interactive controls are Client Components,
so a click that lands before hydration does nothing and the assertion that follows
times out — a race that passes or fails on bundle size and machine speed. Specs that
drive a client control wrap the interaction in `expect(async () => { … }).toPass()`
so the click is retried, and prefer `expect(page).toHaveURL()` over `waitForURL()`
for client-side navigations, whose default `load` event never fires. Where the
retried action is not naturally idempotent (changing a lead's stage), the target is
recomputed inside the retry.

### Measuring horizontal overflow

`expectNoHorizontalOverflow` compares `documentElement.scrollWidth` against
`clientWidth`. That is the right check for public pages, but Chromium over-reports
`scrollWidth` on any page containing a nested horizontal scroller even though the
document cannot actually be scrolled sideways — `body { overflow-x: hidden }` clips
it. For screens built around a deliberate rail (the lead board, wide admin tables)
use `expectContainedHorizontalScroll`, which asserts the real invariant: the rail is
no wider than the viewport, and the page itself does not scroll.

## Integration suite

`tests/integration/**` runs the real Mongoose models against an ephemeral MongoDB
started by `mongodb-memory-server`, so repositories, services and Server Actions
are exercised with real schema validation, real unique indexes and real query
semantics. Nothing about the data layer is mocked.

Two things make it work, and both are easy to break:

**1. The server starts in the setup module's body, not in `beforeAll`.**
`src/lib/env.ts` validates `process.env` the first time it is imported, and a test
file's static imports are evaluated before any hook runs. `tests/integration/setup.ts`
therefore uses a top-level `await MongoMemoryServer.create()` and assigns
`MONGODB_URI` immediately, which is the only point early enough.

**2. `fileParallelism` is off.** Each file owns a `mongod` process; running them in
parallel would start a dozen at once.

Collections are wiped `afterEach`, so tests are order-independent — verified with
`--sequence.shuffle`.

Action and authorization tests mock exactly two things: `@/lib/auth/session` (the
actor) and the request-scoped Next.js primitives `next/headers` and `next/cache`,
which throw outside a request. `requirePermission` still runs the real `can()` from
`@/lib/auth/rbac` against permissions derived by the real `resolvePermissions()`,
so the RBAC matrix is genuinely exercised rather than stubbed.

`tests/integration/authorization.test.ts` is the one to keep honest: for each admin
action it asserts that an anonymous caller, and a signed-in student, and a staff
member holding the wrong permission are all refused — **and that the target
collection is unchanged afterwards**. That last assertion is what proves the guard
is server-side and not just a hidden button.

## Vitest configuration

```ts
// vitest.config.ts (abridged)
resolve: {
    alias: [
        { find: /^server-only$/, replacement: './tests/stubs/server-only.ts' },
        { find: /^@\/(.*)$/, replacement: './src/$1' },
    ],
},
test: {
    globals: true,
    environment: 'node',                 // component tests opt into jsdom per file
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**', 'tests/e2e/**', 'coverage/**'],
    clearMocks: true,
    restoreMocks: true,
    coverage: { reportsDirectory: './coverage', include: ['src/lib/**', 'src/schemas/**', 'src/services/**'] },
}
```

Three details matter when adding tests:

**1. The `server-only` alias stub.** The real `server-only` package throws unless it is resolved under the `react-server` condition. Vitest runs in plain Node, so importing anything in the server layer (`@/lib/env`, `@/lib/cache`, any `*.service.ts`, any model) would fail at import time. `tests/stubs/server-only.ts` is an empty module aliased over the package, which makes those imports work in tests without loosening the boundary in product code.

**2. The environment default is `node`.** Files that render React opt in with a docblock on the first line:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
```

`tests/unit/components/jsdom-environment.test.tsx` is the reference example. Keeping node as the default keeps pure-logic suites fast.

**3. `tests/setup.ts` assigns env vars before anything imports `@/lib/env`.** `src/lib/env.ts` validates `process.env` with Zod at import time, so the setup file writes dummy values first (`MONGODB_URI`, a 48-character `AUTH_SECRET`, `console`/`mock` providers) and only then loads the jest-dom matchers. It also deletes `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and `REDIS_URL` so a stale local config can never make the rate limiter reach the network. Existing values are never overwritten — a real `.env` export wins.

## Playwright configuration

```ts
// playwright.config.ts (abridged)
testDir: './tests/e2e',
fullyParallel: true,
timeout: 60_000,
expect: { timeout: 10_000 },
use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000', trace: 'on-first-retry' },
webServer: { command: 'npm run build && npm run start', url: baseURL, reuseExistingServer: !process.env.CI },
```

Three projects, chosen to cover the layouts that actually break:

| Project | Device base | Viewport | Notes |
| --- | --- | --- | --- |
| `chromium-desktop` | Desktop Chrome | 1280 × 800 | At/above the desktop nav breakpoint |
| `mobile-360` | Pixel 5 | 360 × 800 | Narrowest supported width, touch enabled |
| `mobile-390` | iPhone 13 | 390 × 844 | Forced to `browserName: 'chromium'` so the suite needs one browser install; switch to WebKit once `npx playwright install webkit` is in CI |

`tests/e2e/helpers.ts` exports the shared pieces:

- `BREAKPOINTS` = `[360, 390, 430, 768, 1024, 1280, 1440, 1920]`
- `DESKTOP_NAV_MIN_WIDTH` = `1280` — the header switches from the drawer to inline navigation at Tailwind's `xl`. Assertions about nav shape must branch on this value, not on a hardcoded 1024.
- `expectNoHorizontalOverflow(page, label)` — fails on sideways scroll, with one pixel of slack, and names the widest offending element
- `expectContainedHorizontalScroll(page, selector, label)` — for pages with a deliberate rail; see "Measuring horizontal overflow" above
- `expectSingleH1(page)`, `gotoStable(page, path)`, `isErrorPage(page)`, `countOrZero(page, selector)`

**E2E specs need a seeded database.** `webServer` starts the app but nothing populates MongoDB. Run `npm run db:seed:fresh` against a dedicated test database first, or the dataset-dependent specs (college detail, predictor detail, comparison table) fall back to their empty-state branches and assert much less than intended. Several specs are written to degrade gracefully rather than fail on an empty dataset, so a green run on an unseeded database is not evidence of working journeys.

## E2E coverage today

`accessibility.spec.ts` and `responsive.spec.ts` cut across pages rather than following a single journey:

| Spec | Asserts |
| --- | --- |
| `accessibility.spec.ts` | Skip link resolves to a real target, exactly one `h1` with no skipped heading levels, every image has `alt`, every form control has an accessible name, focus is visible and reachable by keyboard, `main` landmark and document language present |
| `responsive.spec.ts` | No horizontal overflow across `BREAKPOINTS` on key pages, correct nav shape either side of `DESKTOP_NAV_MIN_WIDTH`, header tap targets ≥ 40px, mobile drawer opens and closes, layout survives a very short viewport |

## Critical journeys

Specs exist for the rows marked ✅. The rest are the intended backlog, kept here because they are the journeys that matter, not because they are covered.

### Public discovery

| # | Journey | Spec |
| --- | --- | --- |
| 1 | Homepage renders enabled sections in `displayOrder`; landmarks and single `h1` present | ✅ `home.spec.ts` |
| 2 | Sticky counselling CTA and hero search entry point present | ✅ `home.spec.ts` |
| 3 | Header navigation reachable | ✅ `home.spec.ts` |
| 4 | Hero search → suggestions from `/api/search/suggest` or submit to `/search` | ✅ `search.spec.ts` |
| 5 | `/search` renders for a query, for a no-match query and for an empty query | ✅ `search.spec.ts` |
| 5a | Every SEO directory index renders with one `h1` and no overflow; enum landings resolve and unknown slugs 404; static segments win over sibling dynamic routes; the footer links every index; the taxonomy sitemap shard lists the enum landings | ✅ `seo-landing-pages.spec.ts` |
| 6 | College listing renders; URL-param filter stays healthy; unmatched filter shows an empty state | ✅ `colleges.spec.ts` |
| 7 | College detail opens and the courses / fees / cutoff / reviews tabs resolve | ✅ `colleges.spec.ts` |
| 8 | `/compare-colleges` renders with an empty state or a table; preselected slugs do not break it; narrow viewport holds | ✅ `compare.spec.ts` |
| 9 | Hero form submits a lead successfully end to end | — |
| 10 | Course listing → course detail → syllabus and colleges tabs | — |
| 11 | Exam page: every configured section loads | — |
| 12 | Location and category landing pages (`/colleges/state/[slug]`, `/colleges/city/[slug]`, `/courses/category/[slug]`) | — |
| 13 | CMS pages (`/about`, `/privacy-policy`, …) render, and a renamed slug 308-redirects to the canonical URL | — |
| 14 | `/faqs` renders and emits FAQPage JSON-LD; `/guides` lists guide resources | — |
| 15 | Unknown URL returns HTTP 404 (not 200) and renders not-found; `/403` renders for a forbidden area | — |
| 16 | `/sitemap.xml` parses as a `<sitemapindex>` and every `/sitemaps/<shard>.xml` child it lists parses as a valid `<urlset>` | — |

### Lead capture and counselling

| # | Journey | Spec |
| --- | --- | --- |
| 17 | Counselling form renders with name and mobile fields | ✅ `counselling.spec.ts` |
| 18 | Empty submit surfaces validation errors; invalid mobile rejected; layout holds at 360px | ✅ `counselling.spec.ts` |
| 19 | Lead reaches `/admin/leads` with the right `source` | — |
| 19a | The form creates a real `Lead`, is idempotent per token, and flags a repeat number as a duplicate | ✅ `integration/actions/lead.actions.test.ts` |
| 19b | A filled honeypot returns a fake success and writes nothing | ✅ `integration/actions/lead.actions.test.ts` |
| 20 | `/contact` submission creates a `ContactSubmission` and queues notifications | — |
| 21 | `/book-counselling`: counsellor + slot → booking visible in `/dashboard/bookings` | — |
| 22 | Repeated submits hit the rate limit and show a friendly message, not an error page | — |

### Predictors

| # | Journey | Spec |
| --- | --- | --- |
| 23 | Predictor listing renders | ✅ `predictor.spec.ts` |
| 24 | Predictor detail exposes the form and the mandatory disclaimer | ✅ `predictor.spec.ts` |
| 25 | Unknown predictor slug does not crash the app | ✅ `predictor.spec.ts` |
| 26 | Submitting a rank groups results into probability bands from the configured rules | ✅ `integration/services/predictor.service.test.ts` |
| 26a | A prediction reads only *published* cut-off rows, never a staged dataset | ✅ `integration/services/predictor.service.test.ts` |
| 26b | Each run is persisted as a `PredictionSession` | ✅ `integration/services/predictor.service.test.ts` |
| 27 | Out-of-range or missing input shows field-level errors | — |
| 28 | A signed-in student's prediction is listed in `/dashboard/predictions` | — |

### Auth and RBAC

| # | Journey | Spec |
| --- | --- | --- |
| 29 | Signup renders its fields; bad email and weak password show client validation | ✅ `auth.spec.ts` |
| 30 | Login renders, validates, and links to signup and password recovery | ✅ `auth.spec.ts` |
| 31 | Anonymous `/admin` → login, and a deep link keeps `callbackUrl` | ✅ `auth.spec.ts` |
| 32 | Login as student → `/dashboard`; as staff → `/admin` | — |
| 33 | Signed-in user visiting `/login` is redirected away | — |
| 34 | Student visiting `/admin` → `/403` | — |
| 35 | Five wrong passwords lock the account for 15 minutes | — |
| 36 | Google button present only when the OAuth credentials are configured | — |

### Loans and finance

| # | Journey | Spec |
| --- | --- | --- |
| 37 | EMI calculator updates the monthly figure when amount, rate or tenure change | — |
| 38 | `/api/education-loans/summary` returns a PDF for valid inputs and 400 for out-of-range ones | — |
| 39 | `/api/compare/pdf` returns a PDF for `?slugs=` and for `?share=`, 400 with neither | — |
| 40 | Eligibility form returns a result and captures a lead | — |
| 41 | Loan comparison lists providers with rates | — |

### Admin CMS

| # | Journey | Spec |
| --- | --- | --- |
| 42 | Generic CRUD on a resource: create → list → edit → delete | ✅ `integration/actions/admin-crud.actions.test.ts` |
| 43 | Generated Zod errors render against the right fields | ✅ `integration/actions/admin-crud.actions.test.ts` (field errors + nothing written) |
| 44 | A role without the permission cannot invoke the action, and nothing is mutated | ✅ `integration/authorization.test.ts` |
| 45 | Reference picker refuses a model the actor cannot read | — |
| 46 | `pages` resource rejects a slug in `RESERVED_PAGE_SLUGS` | — |
| 47 | Homepage builder: edit → save → persists across a reload | ✅ `e2e/admin-workflows.spec.ts` (12) |
| 48 | Media upload: valid image succeeds; oversized and disallowed types are rejected | — |
| 49 | Every mutation appears in the audit log with before/after values and a hashed IP | ✅ `integration/actions/admin-crud.actions.test.ts` |
| 50 | Roles editor: only the owner may rewrite a role, and `super_admin` cannot be reduced | ✅ `integration/authorization.test.ts` |
| 51 | Cut-off dataset import → publish → rollback re-publishes the previous version | ✅ `integration/services/predictor.service.test.ts` |
| 52 | Admin reaches the college create form and the cut-off import screen | ✅ `e2e/admin-workflows.spec.ts` (8, 9) |
| 53 | Lead detail exposes status, assignment and follow-up controls | ✅ `e2e/admin-workflows.spec.ts` (10) |
| 54 | A content manager (not just the super admin) can reach article publishing | ✅ `e2e/admin-workflows.spec.ts` (11) |
| 55 | The admin console is served `noindex` | ✅ `e2e/admin-workflows.spec.ts` |
| 56 | Every sidebar entry resolves, and every registered resource is reachable | ✅ `unit/config/admin-nav.test.ts` |
| 57 | Lead board groups every lifecycle stage, keeps empty stages, and honours the filters | ✅ `integration/services/lead-admin.service.test.ts` |
| 58 | A stage change, assignment, call outcome and note each write their own timeline entry | ✅ `integration/services/lead-admin.service.test.ts` |
| 59 | Clearing an assignment really clears it and releases the counsellor's load | ✅ `integration/services/lead-admin.service.test.ts` |
| 60 | A follow-up date queues a scheduled reminder | ✅ `integration/services/lead-admin.service.test.ts` |
| 61 | Lead CSV export escapes quotes, defuses formula injection and omits the consent IP hash | ✅ `integration/services/lead-admin.service.test.ts` |
| 62 | `lead.assign` and `lead.export` are enforced separately from `lead.update` | ✅ `integration/authorization.test.ts` |
| 63 | Board ↔ table toggle, URL-shareable filters, manual lead creation and a stage change through the UI | ✅ `e2e/admin-leads.spec.ts` |
| 64 | The board and table rails scroll without dragging the page sideways at 768px and 360px | ✅ `e2e/admin-leads.spec.ts` |
| 65 | Internal link scan is refused without `seo.manage` | ✅ `integration/authorization.test.ts` |

`admin-workflows.spec.ts` and `admin-leads.spec.ts` need a signed-in staff session,
so every test in them skips with an explanatory message when `npm run db:seed` has
not been run against a reachable MongoDB. A skipped run is not a passing run — check
the report.

### AI assistant

| # | Journey | Spec |
| --- | --- | --- |
| 52 | In-scope question streams an answer with source links | — |
| 53 | Blocked or out-of-scope question returns the moderation reply with no provider call | — |
| 54 | Exceeding the AI rate limit is handled as a 429 in the UI | — |
| 55 | `/admin/ai` is reachable with `ai.manage` and refused without it | — |

### Analytics and notifications

| # | Journey | Spec |
| --- | --- | --- |
| 56 | Navigation posts events to `/api/analytics/collect` and they surface in `/admin/analytics` | — |
| 57 | `/api/cron/notifications` returns 200 with the correct Bearer secret and 401 without it | — |
| 58 | A queued notification is delivered when the worker runs; in-app entries appear in `/dashboard/notifications` | — |

## Notes for writing these tests

- Put anything that needs a database in `tests/integration/**`, which gives you a real MongoDB. Keep `tests/unit/**` connection-free: it must stay fast and runnable with no services present.
- When seeding fixtures, respect required schema fields — Mongoose runs with `strict: 'throw'`, so an unknown key throws rather than being dropped. Two fixture quirks are worth knowing: `createdAt` is immutable, so back-dating rows means writing through `Model.collection.updateOne`; and behaviours that depend on a unique or sparse index need `await Model.init()` first.
- For not-found journeys, assert the HTTP status from the `page.goto()` response, not just the rendered copy. A soft 404 (404 UI under a 200) is exactly the regression a `loading.tsx` above a `notFound()` route reintroduces.
- Prefer accessible roles/labels or `data-testid` over CSS selectors; the UI is Tailwind utility classes that change often.
- Rate limiting is per-IP and in-memory by default, so specs that submit forms repeatedly can poison later specs in the same process. Assert the limit deliberately or isolate those specs.
- The AI, email, WhatsApp and SMS adapters default to `mock`/`console`, so no external calls happen as long as no provider keys are set.
- `tsconfig.json` excludes `tests/e2e`, so Playwright specs are not covered by `npm run typecheck`. `npx playwright test --list` transpiles and enumerates them without launching a browser, which is the cheapest way to catch a broken spec. `npm run lint` also checks them, under a looser rule set (`@typescript-eslint/no-explicit-any` and `no-non-null-assertion` are off for `tests/**`).
