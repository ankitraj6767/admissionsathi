# Admission Sathi

**Your Career, Our Mission** — an education discovery, counselling, prediction, loan and admission-management platform for Indian students.

Single Next.js 16 App Router application. There is no separate backend service: data access runs inside Server Components, Server Actions and a small number of Route Handlers, all of which talk to MongoDB Atlas through Mongoose.

> **Seed data is demonstration data.** Fees, cut-offs, rankings, ratings and placement figures inserted by `npm run db:seed` are illustrative samples. The exact wording used across the UI is exported as `DEMO_DATA_NOTICE` in [`src/config/constants.ts`](src/config/constants.ts). Replace every seeded record with verified content before production use.

## Documentation

| Document | Contents |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Layered request flow, `server-only` boundary, adapters, caching, registries |
| [docs/setup.md](docs/setup.md) | Local development, Atlas, Google OAuth, Cloudinary, troubleshooting |
| [docs/environment.md](docs/environment.md) | Every environment variable, required/optional, server vs public |
| [docs/deployment.md](docs/deployment.md) | Vercel deploy, production checklist, backups, monitoring |
| [docs/testing.md](docs/testing.md) | Unit (Vitest) and E2E (Playwright) layout, commands and critical-journey coverage |

## Features by module

### Discovery
- College directory (`/colleges`) with detail tabs: overview, courses, fees, cut-off, placements, facilities, gallery, reviews, scholarships, admissions.
- Location and taxonomy landing pages: `/colleges/state/[slug]`, `/colleges/city/[slug]`, `/colleges/course/[slug]`.
- Course catalogue (`/courses`) with syllabus, fees, specializations, career and colleges tabs, plus category pages.
- Exam pages (`/exams/[slug]/[section]`) driven by the section config in `src/config/exam-sections.ts`.
- Global search page plus an autocomplete endpoint (`/api/search/suggest`), with search-term logging for the admin search report.
- College comparison (`/compare-colleges`, up to 4 colleges) hydrated from `localStorage` slugs through `/api/colleges/mini`.

### Counselling
- Lead capture from the homepage hero form, counselling pages and entity enquiry forms; leads are rate limited and stored with source, status, priority and assignment.
- Counsellor directory (`/counsellors`) and booking flow (`/book-counselling`) with booking statuses (`requested` → `confirmed` → `completed`, plus `rescheduled` / `cancelled` / `no_show`).
- Topic landing pages: `/career-counselling`, `/college-counselling`, `/course-counselling`, `/counselling`.
- Student dashboard sections for bookings, saved items, predictions, loans, notifications and profile.
- Notifications are queued into MongoDB and delivered by a background worker (`processNotificationQueue`, drained by `/api/cron/notifications`), so a slow provider never blocks a form submit. The worker returns 401 unless `CRON_SECRET` is set.

### Predictors
- Predictor listing and per-predictor pages (`/predictors/[slug]`), each configured in the admin with metric (`rank` / `percentile` / `score`), metric direction, JSON band rules and a mandatory disclaimer.
- Results are bucketed into probability bands (`very_high` … `very_low`) defined in `src/config/constants.ts`.
- Cut-off datasets are imported and published from the admin (`/admin/cutoff-datasets`, permissions `cutoff.import` / `cutoff.publish`).
- Predictions submitted by signed-in students appear in `/dashboard/predictions`.

### Loans and finance
- Lender directory (`/education-loans`, `/education-loans/[providerSlug]`), comparison and eligibility pages.
- EMI calculator backed by `src/lib/finance/emi.ts` and the tunables in `src/config/finance.ts`.
- Scholarships listing and detail pages.

### Resources
- Articles, news, guides (`/guides`), e-books, webinars, mock tests and previous-year papers, all stored as content records with publishing workflow (`draft`, `in_review`, `scheduled`, `published`, `archived`).
- Reviews with moderation states (`pending`, `approved`, `rejected`, `hidden`), plus a reviews hub at `/college-reviews` (`src/services/review.service.ts`).
- FAQ hub (`/faqs`) with `FAQPage` structured data (`src/services/faq.service.ts`).
- Contact form (`/contact`) writing a `ContactSubmission`, then queueing an email acknowledgement to the sender and an in-app notification to staff (`src/actions/contact.actions.ts`, `src/schemas/contact.schema.ts`). Submissions are managed at `/admin/contact-submissions`.

### Editor-managed pages
- `/[pageSlug]` serves standalone pages from the `StaticPage` collection (`src/db/models/site.model.ts`, `src/services/page.service.ts`). `seedStaticPages()` creates nine: `/about`, `/careers`, `/partner-with-us`, `/editorial-policy`, `/app`, `/privacy-policy`, `/terms-of-use`, `/refund-policy`, `/disclaimer`.
- `RESERVED_PAGE_SLUGS` rejects any slug that would shadow a real route, and `slugHistory` 308-redirects renamed pages to their canonical URL.
- The route is rendered per request (`dynamic = 'force-dynamic'`, no `generateStaticParams()`, no `revalidate`) because the shared public header reads the session; page content is still cached by `getPublishedPage()` under the `pages` tag. Pages published after a deploy resolve without a rebuild. Seeding through the CLI script writes to MongoDB outside Next.js, so a cached `pages` entry can stay stale until its 30-minute TTL expires — publishing through `/admin/pages` invalidates the tag immediately.

### SEO routes
- `src/app/robots.ts` (`/robots.txt`), `src/app/manifest.ts` (`/manifest.webmanifest`, icons from `public/brand/logo.svg` and `public/icon.svg`).
- Sitemaps are Route Handlers: `src/app/sitemap.xml/route.ts` serves the `<sitemapindex>` at `/sitemap.xml`, and `src/app/sitemaps/[shard]/route.ts` serves one `<urlset>` per shard at `/sitemaps/<shard>.xml` (14 named shards, all prerendered). XML rendering lives in `src/services/sitemap-xml.ts`, the data in `src/services/sitemap.service.ts`. See [docs/architecture.md](docs/architecture.md#sitemap-index-and-sharding) for the shard list.

### Exports
- Server-side PDF downloads with no PDF dependency: college comparison (`/api/compare/pdf`) and EMI + amortisation summary (`/api/education-loans/summary`), both rendered by `src/lib/pdf/table-pdf.ts`.

### Admin CMS
- Generic CRUD for 28 registered resources at `/admin/[resource]`, driven entirely by the registry in `src/config/admin-resources.ts` (columns, form fields, search fields, permissions, revalidation tags, public URL builder). The `pages` resource edits `StaticPage` records under the `page.manage` permission.
- Homepage builder (`/admin/homepage`) editing 11 fixed section keys with draft/publish state.
- AI console (`/admin/ai`), guarded by `ai.manage`, reading the conversation listing and stats helpers in `src/services/ai.service.ts`.
- Navigation, SEO, settings, media library, roles and permissions, integrations status, audit log, analytics dashboard, cut-off datasets, search reports and notifications.
- Every mutation runs `requirePermission()` server-side and writes an audit record.

### AI assistant
- Retrieval-grounded assistant (`/api/ai/chat`) that answers only from platform content, with deterministic moderation, per-user rate limiting and a streamed response. The default provider is an extractive `mock` adapter; OpenAI and Anthropic adapters are wired and activate when credentials are present.
- Full-page chat at `/ai-assistant` (`src/components/ai/assistant-chat.tsx`, `src/hooks/use-ai-chat.ts`).

## Tech stack

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.2.11 |
| UI runtime | React / React DOM | 19.2.8 |
| Language | TypeScript (strict) | 5.9.3 |
| Database | MongoDB driver / Mongoose | 6.21.0 / 8.24.1 |
| Auth | Auth.js (`next-auth`) + `@auth/mongodb-adapter` | 5.0.0-beta.32 / 3.11.3 |
| Password hashing | bcryptjs | 3.0.3 |
| Styling | Tailwind CSS + `@tailwindcss/postcss` | 4.3.3 |
| Validation | Zod | 4.4.3 |
| Forms | React Hook Form + `@hookform/resolvers` | 7.83.0 / 5.4.1 |
| Tables | TanStack Table | 8.21.3 |
| Charts | Recharts | 3.10.0 |
| Animation | Framer Motion | 12.42.2 |
| Primitives / icons | Radix UI, lucide-react | see `package.json` / 1.26.0 |
| Media storage | Cloudinary SDK (local FS fallback) | 2.10.0 |
| Unit tests | Vitest + Testing Library + jsdom | 4.1.10 |
| Integration tests | Vitest + mongodb-memory-server | 10.1.4 |
| E2E tests | Playwright | 1.62.0 |
| Lint | ESLint + `eslint-config-next` | 9.39.1 / 16.2.11 |
| Scripts runner | tsx | 4.20.6 |

## Quick start

### Prerequisites
- Node.js `>=20.9.0` (declared in `package.json` `engines`)
- npm
- A MongoDB connection string (Atlas free tier is fine, or a local `mongod`)

### 1. Install
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Fill in at minimum `MONGODB_URI` and `AUTH_SECRET` (`openssl rand -base64 32`). `src/lib/env.ts` validates the server variables on first import and throws with a list of problems if anything is missing. See [docs/environment.md](docs/environment.md).

### 3. Create indexes
```bash
npm run db:indexes
```
Production runs with `autoIndex: false`, so this script is the supported way to create indexes. Safe to re-run.

### 4. Seed demonstration data
```bash
npm run db:seed          # idempotent upsert
npm run db:seed:fresh    # clears collections first
```

### 5. Run
```bash
npm run dev
```
Open `http://localhost:3000`, sign in at `/login`, and staff users land on `/admin`.

## npm scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `next dev` | Development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve the production build |
| `lint` | `eslint .` | Lint the repo |
| `typecheck` | `tsc --noEmit` | Type-check without emitting |
| `db:indexes` | `tsx --conditions=react-server src/db/migrations/run-indexes.ts` | Sync MongoDB indexes for every registered model |
| `db:seed` | `tsx --conditions=react-server src/db/seeds/run-seed.ts` | Seed demonstration data (upsert) |
| `db:seed:fresh` | `tsx --conditions=react-server src/db/seeds/run-seed.ts --fresh` | Reset collections, then seed |
| `lint:fix` | `eslint . --fix` | Lint and auto-fix |
| `test` | `vitest run` | Unit + component tests once |
| `test:watch` | `vitest` | Unit tests in watch mode |
| `test:unit` | `vitest run tests/unit` | Unit tests, path-scoped |
| `test:integration` | `vitest run --config vitest.integration.config.ts` | Repository, service, Server Action and authorization tests against an in-memory MongoDB |
| `test:all` | `npm run test:unit && npm run test:integration` | Both Vitest suites |
| `test:e2e` | `playwright test` | End-to-end tests |
| `test:e2e:ui` | `playwright test --ui` | Playwright UI mode |
| `analyze` | `ANALYZE=true next build` | Build with the `ANALYZE` flag set |

Verified status of the toolchain:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | Succeeds. Compiles with placeholder env when secrets are absent; `connectToDatabase()` refuses placeholder credentials at runtime |
| `npm run test:unit` | 236 tests passing across 17 files |
| `npm run test:integration` | 274 tests passing across 14 files, against a real in-memory MongoDB |
| `npx eslint .` | 0 errors, 55 warnings (React Compiler advisory rules, unused `eslint-disable` directives, unused vars — all set to `warn` on purpose) |
| `npx playwright test` | Specs are compile-verified (`--list`). The admin workflow specs skip unless `npm run db:seed` has been run against a reachable MongoDB |

See [docs/testing.md](docs/testing.md) for the full breakdown. The `analyze` script sets `ANALYZE=true` but no bundle-analyzer plugin is wired into `next.config.ts` yet.

## Project structure

```
.
├── next.config.ts              # Security headers + CSP, image domains, package optimisation
├── postcss.config.mjs          # Tailwind 4 PostCSS pipeline
├── eslint.config.mjs           # ESLint flat config (eslint-config-next v16 subpath exports)
├── vitest.config.ts            # Unit tests: node by default, `server-only` aliased to a stub
├── vitest.integration.config.ts # Integration tests: real models, in-memory MongoDB, serial
├── playwright.config.ts        # E2E: desktop 1280 + mobile 360/390 projects
├── tsconfig.json               # strict TS, `@/*` → `src/*`, excludes tests/e2e
├── vercel.json                 # Vercel framework + notification cron schedule
├── public/brand/               # Logo, hero illustrations, WhatsApp QR (SVG)
├── public/icon.svg             # Maskable PWA icon referenced by app/manifest.ts
├── tests/
│   ├── setup.ts                # env stubs + jest-dom matchers
│   ├── stubs/server-only.ts    # empty module aliased over the `server-only` package
│   ├── unit/                   # lib, schemas, services, emails, config, jsdom components
│   ├── integration/            # repositories, services, actions, authorization (real MongoDB)
│   └── e2e/                    # helpers + 11 Playwright specs incl. admin workflows
└── src
    ├── proxy.ts                # Edge auth gate for /admin and /dashboard (Next.js 16 proxy convention)
    ├── actions/                # Server Actions (mutations), one file per domain
    │   └── admin/              # Admin-only actions: generic CRUD, homepage, roles, settings, media, cut-offs
    ├── app/
    │   ├── (auth)/             # login, signup, forgot-password
    │   ├── (public)/           # Public site + student dashboard, incl. /[pageSlug] CMS pages
    │   ├── admin/              # Admin console, including generic /admin/[resource] and /admin/ai
    │   ├── api/                # Route Handlers (auth, ai chat, analytics, search, uploads,
    │   │                       # college mini, cron worker, two PDF exports)
    │   ├── sitemap.xml/        # Route Handler: <sitemapindex> at /sitemap.xml
    │   ├── sitemaps/[shard]/   # Route Handler: one <urlset> per shard at /sitemaps/<shard>.xml
    │   ├── robots.ts           # robots.txt
    │   └── manifest.ts         # PWA manifest
    ├── components/             # UI grouped by domain (colleges, predictors, admin, ai, ui, …)
    ├── config/                 # Static registries: permissions, admin resources, homepage defaults, constants
    ├── db/
    │   ├── connect.ts          # Cached Mongoose connection
    │   ├── load-script-env.ts  # dotenv loader for standalone scripts
    │   ├── models/             # Mongoose schemas + central registry (index.ts)
    │   ├── repositories/       # The ONLY place a Mongoose query is written
    │   ├── migrations/         # run-indexes.ts
    │   └── seeds/              # Seed runner, module seeders and demo datasets
    ├── emails/                 # Branded transactional email shell (table markup, inline styles)
    ├── hooks/                  # Client hooks (comparison, debounce, recent searches, ai chat)
    ├── lib/                    # env, cache, revalidate, logger, rate-limit, auth, storage,
    │                           # analytics, seo, observability, finance, pdf
    ├── schemas/                # Zod schemas shared by forms and actions
    ├── services/               # Domain logic; composes repositories, never queries directly
    └── types/                  # Shared types and Auth.js module augmentation
```

## Demo credentials

Created by `npm run db:seed` (`src/db/seeds/seed-core.ts`). Emails and passwords for the admin and student accounts come from `SEED_*` environment variables, with these defaults:

| Account | Email | Password | Roles |
| --- | --- | --- | --- |
| Super admin | `admin@admissionsathi.org` (`SEED_SUPER_ADMIN_EMAIL`) | `Admin@12345` (`SEED_SUPER_ADMIN_PASSWORD`) | `super_admin` |
| Student | `student@admissionsathi.org` (`SEED_STUDENT_EMAIL`) | `Student@12345` (`SEED_STUDENT_PASSWORD`) | `student` |
| Content Manager (demo) | `content@admissionsathi.org` | `Staff@12345` | `content_manager` |
| College Manager (demo) | `colleges@admissionsathi.org` | `Staff@12345` | `college_manager` |
| Exam Manager (demo) | `exams@admissionsathi.org` | `Staff@12345` | `exam_manager` |
| Predictor Manager (demo) | `predictors@admissionsathi.org` | `Staff@12345` | `predictor_manager` |
| Lead Manager (demo) | `leads@admissionsathi.org` | `Staff@12345` | `lead_manager` |
| Finance Manager (demo) | `finance@admissionsathi.org` | `Staff@12345` | `finance_manager` |
| Support Agent (demo) | `support@admissionsathi.org` | `Staff@12345` | `support_agent` |
| Analyst (demo) | `analyst@admissionsathi.org` | `Staff@12345` | `analyst` |

The staff password `Staff@12345` is hard-coded in the seed script. These accounts exist for local development only — delete or rotate them before any deployment that is reachable publicly.
