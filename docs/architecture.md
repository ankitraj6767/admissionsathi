# Architecture

Admission Sathi is one Next.js 16 App Router application. All data access happens on the server; the browser only receives serialised results.

## Layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Browser                                                                  │
│   Client Components ('use client')  ── forms, tables, charts, widgets     │
└───────────────┬──────────────────────────────────┬───────────────────────┘
                │ Server Action call               │ fetch()
                ▼                                  ▼
┌──────────────────────────────┐   ┌───────────────────────────────────────┐
│ src/actions/*.actions.ts     │   │ src/app/api/**/route.ts               │
│ 'use server'                 │   │ Route Handlers (streaming, multipart, │
│ Zod parse → requirePermission│   │ binary downloads, cron, cacheable GET)│
│ → service → audit → revalidate│  └───────────────┬───────────────────────┘
└───────────────┬──────────────┘                   │
                ▼                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ src/services/*.service.ts            (domain logic, 'server-only')       │
│  authorization re-checks, business rules, caching, notifications         │
└───────────────┬──────────────────────────────────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ src/db/repositories/*.repository.ts  (queries, lean projections, toPlain) │
└───────────────┬──────────────────────────────────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ src/db/models/*.model.ts  (Mongoose schemas, plugins, indexes)            │
└───────────────┬──────────────────────────────────────────────────────────┘
                ▼
        MongoDB Atlas  ← single cached connection (src/db/connect.ts)
```

Server Components read through the same service layer directly (no action round-trip), which is why most public pages have zero client-side data fetching.

### The layering is enforced, not aspirational

Two rules hold across the codebase, and both are cheap to verify:

```bash
# No UI or action file may import a Mongoose model as a value, or open a connection.
grep -rE "from '@/db/models" src/app src/actions | grep -v 'import type'   # → no matches
grep -rn 'connectToDatabase' src/app src/actions                          # → no matches

# No service may build an ad-hoc query chain; queries live in repositories.
grep -rE "\.(find|findOne|create|updateOne|deleteMany|countDocuments|aggregate|distinct)\(" src/services
```

`import type { CollegeDoc }` in a page or service is fine — types are erased and
carry no runtime dependency. What is not fine is a page holding a live model
handle, because that is how a query ends up inside a component.

Every read goes through the helpers in `src/db/repositories/base.repository.ts`
(`paginate`, `findLean`, `findOneLean`, `countDocs`, `aggregateLean`,
`distinctLean`, `toPlain`). They exist so that three invariants are structural
rather than remembered per query:

- **Nothing is unbounded.** `paginate` clamps `pageSize` to `siteConfig.pagination.maxLimit`; `findLean` caps at 500 rows.
- **Nothing leaks a Mongoose document into React.** Everything is `.lean()`, and `toPlain()` converts `ObjectId`/`Date` to JSON-safe values at the RSC boundary.
- **A credential-less `next build` still completes.** When `src/lib/env.ts` is running on placeholders, the read helpers short-circuit to empty results instead of attempting a connection, so pre-rendering finishes on a machine with no database. At runtime `connectToDatabase()` calls `assertRuntimeEnv()` and refuses to serve traffic on placeholder credentials.

## Why the browser never touches MongoDB

- The connection string lives in `MONGODB_URI`, which is only read inside `src/lib/env.ts`. That file starts with `import 'server-only'`, so any import chain that reaches a Client Component fails the build instead of leaking the secret.
- `src/db/connect.ts`, `src/db/models/index.ts`, every service, `src/lib/cache.ts`, `src/lib/revalidate.ts`, `src/lib/rate-limit.ts`, `src/lib/storage/index.ts` and `src/lib/action-helpers.ts` all carry the same `server-only` marker.
- `next.config.ts` lists `mongoose`, `bcryptjs` and `cloudinary` in `serverExternalPackages`, keeping them out of the bundler graph entirely.
- Mutations cross the boundary as Server Actions, which return a serialisable `ActionResult<T>` (`src/types/common.ts`) — never a Mongoose document. Repositories use `.lean()` and a `toPlain()` helper so documents are converted before they reach React.

### The `server-only` boundary in practice

```
Client Component  ──imports──►  src/schemas/*.schema.ts        ✅ shared Zod, no secrets
Client Component  ──imports──►  src/config/permissions.ts      ✅ pure constants
Client Component  ──imports──►  src/config/site.ts             ✅ public constants only
Client Component  ──imports──►  src/lib/env.ts                 ❌ build error ('server-only')
Client Component  ──imports──►  src/services/*.service.ts      ❌ build error ('server-only')
```

Client Components receive data as props from a Server Component, or call a Server Action / Route Handler.

## Admin rich text and HTML sanitisation

Twelve resources carry rich-text fields (course overviews, exam syllabi, college
admission notes, FAQ answers, CMS pages, email bodies — 27 fields in total). They
are stored as HTML because the public site renders them through `.prose-sathi`,
but nobody is expected to author HTML by hand.

```
Admin types / pastes
        │
        ▼
RichTextEditor ('use client')  ── contentEditable + toolbar
  └─ lib/html/clean-client.ts  ── paste cleanup via DOMParser (convenience)
        │  emits HTML
        ▼
Server Action ─► buildResourceSchema ─► z.preprocess(sanitizeRichText)   ◄── the boundary
        │                               lib/html/sanitize.ts ('server-only')
        ▼
Repository ─► Mongoose ─► MongoDB
        │
        ▼
RichText / FaqList ── dangerouslySetInnerHTML, safe because of the step above
```

The two cleanup layers are not redundant, and it matters which one is trusted:

- **`clean-client.ts` is a convenience.** Its job is that pasting from Word or
  Google Docs produces usable content instead of a wall of `<span style>` and
  `class="MsoNormal"`. It is not a security control — a request can be crafted
  that never touches the browser.
- **`sanitize.ts` is the boundary.** It runs inside the Zod schema on every write,
  so it applies to any caller. It is `server-only` and backed by `sanitize-html`
  rather than hand-rolled regex, because regex-based HTML filtering is a well
  known source of bypasses. This is what makes `dangerouslySetInnerHTML` on the
  public site defensible.

Both share one allow-list in `lib/html/policy.ts`, which is dependency-free and
free of `server-only` precisely so the client can import it — otherwise the editor
would permit formatting the server then silently discards.

Two policies exist. `web` is the default and mirrors what `.prose-sathi` styles,
so content cannot render unstyled. `email` additionally allows layout `div`s and a
narrow set of inline style declarations, because email clients strip stylesheets
and classes — sanitising a template with the web policy would destroy its
formatting. A field opts in with `htmlPolicy: 'email'` in `admin-resources.ts`.

Sanitisation applies to writes. Rows created before it existed (seed data, and
anything authored earlier) were never filtered, so treat a one-time re-save or a
backfill as outstanding if that history matters.

## Images and video

Every model already carried image fields (`logo`, `banner`, `gallery`,
`featuredImage`, `heroImage`, `thumbnail`, `photo`), but none of them were exposed
in the admin console, so the only way to populate one was to edit MongoDB by hand.
Three field types close that, and they are wired by *type* rather than per screen:

| Field type | Stored as | Editor |
| --- | --- | --- |
| `image` | `ImageRef` — `{ url, alt, width, height, mediaId }` | Library picker + upload, with an alt-text input |
| `gallery` | `GalleryItem[]` | Ordered list of images and videos, with captions and reordering |
| `video` | Provider embed URL (string) | URL field with a live thumbnail preview |

```
MediaPicker ──► GET  /api/admin/media    (browse, search, paginate)
            └─► POST /api/admin/upload   (validate MIME/size, store, record MediaAsset)
                        │
Server Action ──► fieldSchema('image' | 'gallery' | 'video')   ◄── the boundary
                        │  re-derives every video embed URL
Repository ──► MongoDB ──► GalleryView (grid + lightbox)
```

**Videos are referenced, never uploaded.** `validateUpload` rejects video MIME
types deliberately: the image ceiling is 5 MB, and self-hosting video would mean
no adaptive bitrate, no poster frames and a large egress bill. `lib/media/video.ts`
parses YouTube, Vimeo and direct-file URLs into an embed URL plus a poster frame.
It is dependency-free and has no `server-only` marker, so the admin editor
validates a pasted URL in the browser using exactly the rules the server applies.

**A video's `embedUrl` is always recomputed server-side.** The browser sends one,
but trusting it would let a crafted request choose what origin a public page loads
in an `iframe`. YouTube embeds use `youtube-nocookie.com` so no tracking cookie is
set before playback.

**`GalleryItem` is a strict superset of `ImageRef`.** That is what makes adding
video non-breaking: rows written as `{ url, alt }` stay valid and read back as
images because `kind` defaults to `image`. The public page also falls back to
array position when `displayOrder` is absent, so a pre-existing gallery keeps its
original order.

**Adding a media host means editing the CSP.** `frame-src` and `img-src` in
`next.config.ts` are allow-lists, and a missing host shows up only as a blank
iframe or broken image in production. `tests/unit/config/csp.test.ts` pins the
hosts each feature needs so that failure mode becomes a failing test instead.

## Server Actions vs Route Handlers

Server Actions are the default for mutations. Route Handlers are used only when a Server Action cannot do the job. The complete list under `src/app/api`:

| Route | Method | Runtime | Why a Route Handler |
| --- | --- | --- | --- |
| `/api/auth/[...nextauth]` | GET, POST | nodejs | Auth.js v5 catch-all: sign-in/out, session, CSRF, OAuth callbacks |
| `/api/ai/chat` | POST | nodejs | Streams a Server-Sent-Events response so the answer renders progressively |
| `/api/admin/upload` | POST | nodejs | Streams `multipart/form-data` file uploads into the storage adapter |
| `/api/analytics/collect` | POST | nodejs | Called via `navigator.sendBeacon`; must be fire-and-forget and always answer `204` |
| `/api/search/suggest` | GET | nodejs | Called on every keystroke; needs to be cacheable and abortable from the client |
| `/api/colleges/mini` | GET | nodejs | Hydrates the comparison widget from slugs held in `localStorage`; cacheable GET |
| `/api/compare/pdf` | GET | nodejs | Returns a binary PDF download, which a Server Action cannot do |
| `/api/education-loans/summary` | GET | nodejs | Same: binary EMI + amortisation PDF |
| `/api/cron/notifications` | GET, POST | nodejs | Scheduled worker invoked by Vercel Cron with a Bearer header; not a user interaction |

Two more Route Handlers sit outside `src/app/api` because their URL is fixed by convention: `src/app/sitemap.xml/route.ts` and `src/app/sitemaps/[shard]/route.ts` (see [Sitemap index and sharding](#sitemap-index-and-sharding)).

### `/api/cron/notifications`

Drains the notification queue by calling `processNotificationQueue(limit)`. `vercel.json` schedules it every 15 minutes.

- `dynamic = 'force-dynamic'`, `maxDuration = 60`.
- Authentication is a constant-time (`timingSafeEqual`) comparison of the `Authorization: Bearer …` value against `CRON_SECRET`, with a length pre-check so the compare never throws.
- **When `CRON_SECRET` is unset the route refuses to run and returns 401.** It never exposes an unauthenticated worker. That makes `CRON_SECRET` a hard requirement in any environment where queued notifications must actually be delivered.
- `?limit=` is optional, coerced, and capped at 100; the default is 25.
- Success returns `{ ok: true, requestId, ...processNotificationQueue() }`. A thrown error returns 500 so the platform surfaces the failure in its cron dashboard. Every response carries `Cache-Control: no-store`.

### Server-side PDF exports

Both PDF endpoints render through `src/lib/pdf/table-pdf.ts` and re-derive every figure on the server from the query parameters, so a caller cannot inject fabricated fees, rankings or EMI numbers into a branded document.

| Route | Input | Output |
| --- | --- | --- |
| `/api/compare/pdf` | `?slugs=a,b,c` (slug-pattern filtered, capped at `siteConfig.compare.maxColleges`) or `?share=<id>` resolving a saved comparison | College comparison table grouped by attribute section, with a verification disclaimer and `DEMO_DATA_NOTICE` |
| `/api/education-loans/summary` | `amount`, `rate`, `tenure`, plus optional `moratorium`, `fee`, `capitalise`, validated by a Zod schema mirroring the calculator bounds | Loan summary plus a month-by-month amortisation schedule grouped by repayment year |

Both are rate limited (10 requests per 5 minutes), respond `Content-Type: application/pdf` with `Content-Disposition: attachment`, `Cache-Control: private, max-age=0, must-revalidate` and `X-Content-Type-Options: nosniff`, and return 400/404/429/500 as JSON.

**Why hand-rolled rather than a PDF library.** The only server-side PDF the platform produces is a text table. A headless browser or a full PDF toolkit adds tens of megabytes to a serverless bundle and a cold start that a download endpoint cannot absorb. `table-pdf.ts` emits a valid PDF 1.4 document using the base-14 Helvetica fonts every reader ships, so nothing has to be embedded. It has no dependencies.

Stated limits, taken from the module's own header:

- WinAnsi (Latin-1) text only. `₹` → `Rs.`, em/en dashes → `-`, curly quotes → straight, `…` → `...`, `★` → `*`, `•` → `-`; anything still outside Latin-1 is dropped rather than emitted as a corrupt stream.
- No images, vector art or selectable table semantics.
- Column widths are fixed by the caller and overflowing text is clipped, using real Helvetica advance widths rather than a monospace estimate.
- A4 portrait (595.28 × 841.89 pt), 40 pt margins, table headers repeated on every page.

The proxy matcher in `src/proxy.ts` deliberately excludes `/api/analytics` so the collector stays as cheap as possible.

## Route loading states and 404 correctness

A `loading.tsx` file creates an implicit Suspense boundary around **its whole route subtree**. Next.js flushes the HTML shell for that boundary as soon as it is reached, which commits the `200` status line before the page component has finished. If a page under that boundary then calls `notFound()`, the 404 UI renders inside an already-committed 200 response — a soft 404 that crawlers index as a real page.

This is not hypothetical: a blanket `src/app/(public)/loading.tsx` used to turn every unknown public URL (`/colleges/does-not-exist`, `/exams/nope`, `/nonexistent-slug`, `/foo/bar/baz`) into a 200. Deleting it, together with `src/app/(public)/[pageSlug]/loading.tsx`, restored real 404 status codes.

**Rule: a route segment may only have a `loading.tsx` if neither its own page nor any route beneath it can call `notFound()`.**

Consequences:

- There is no `loading.tsx` at the `(public)` group root, and none on `/[pageSlug]`.
- The 16 listing segments that are parents of a 404-capable detail route deliberately have none either: `/colleges`, `/colleges/state`, `/courses`, `/exams`, `/predictors`, `/scholarships`, `/education-loans`, `/counsellors`, `/articles`, `/news`, `/resources`, `/guides`, `/ebooks`, `/webinars`, `/mock-tests`, `/previous-year-papers`.
- Segments that cannot 404 do have one. 21 route-level loading states exist today: `/contact`, `/faqs`, `/college-reviews`, `/ai-assistant`, `/education-loans/calculator`, `/education-loans/eligibility`, `/education-loans/compare`, `/compare-colleges`, `/career-counselling`, `/college-counselling`, `/course-counselling`, `/book-counselling`, `/counselling`, `/search`, and all seven `/dashboard` segments (`/dashboard`, `bookings`, `loans`, `notifications`, `predictions`, `profile`, `saved`).

To add a loading state to a listing segment that has a 404-capable child, use one of these instead:

- Move the index page into a `(index)` route group (`/colleges/(index)/page.tsx` + `/colleges/(index)/loading.tsx`), so the boundary covers only the index page and not the sibling `[slug]` route.
- Or keep the page eager and wrap the slow part in an explicit `<Suspense>` **inside** the page, after the point where `notFound()` could have been called.

The `<Suspense>` boundaries already in `src/app/(public)/layout.tsx` are fine: they wrap `SiteHeader` and `SiteFooter` only, not `{children}`, so nothing streams ahead of the page.

The same reasoning applies to the edge proxy: the pass-through branch in `src/proxy.ts` returns `undefined` rather than `NextResponse.next()`, because a middleware-produced response becomes the base for the route and pins the status to 200.

## SEO metadata routes

`src/app/robots.ts` and `src/app/manifest.ts` are Next.js metadata file conventions. The sitemaps are explicit Route Handlers instead — see below.

`robots.ts` disallows `/admin`, `/api/`, `/dashboard`, the auth pages, `/403`, `/search`, `/uploads/` and the `page=` / `sort=` query permutations, and blocks `AhrefsBot`, `SemrushBot`, `MJ12bot` and `DotBot` outright. Anything that is not production — `NODE_ENV !== 'production'` or a `*.vercel.app` host — is disallowed wholesale so preview deployments never compete with the live site in search.

`manifest.ts` returns the PWA manifest at `/manifest.webmanifest`: standalone display, brand colours, `en-IN`, three shortcuts (colleges, predictor, book counselling) and two SVG icons (`/brand/logo.svg` as `any`, `/icon.svg` as `maskable`).

### Sitemap index and sharding

Three files, all explicit Route Handlers:

| File | Serves | Notes |
| --- | --- | --- |
| `src/app/sitemap.xml/route.ts` | `/sitemap.xml` | The `<sitemapindex>`. `revalidate = 3600` |
| `src/app/sitemaps/[shard]/route.ts` | `/sitemaps/<shard>.xml` | One `<urlset>` per shard. `generateStaticParams()` prerenders all 14, `revalidate = 3600`, `notFound()` for an unknown shard |
| `src/services/sitemap-xml.ts` | — | `shardPath()`, `renderSitemapIndex()`, `renderUrlSet()`, `SITEMAP_HEADERS`, plus XML escaping of `& < > " '` |

The Next.js `sitemap.ts` metadata convention with `generateSitemaps()` was replaced because it emits the child sitemaps but no index document, leaving `/sitemap.xml` unserved even though `robots.txt` advertises it. Hand-written handlers give a real index plus one `<urlset>` per shard, and child URLs are **named** (`/sitemaps/static.xml`, `/sitemaps/colleges.xml`, `/sitemaps/pages.xml`, …) rather than numeric.

Every sitemap response carries `SITEMAP_HEADERS`:

```
Content-Type: application/xml; charset=utf-8
Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400
X-Content-Type-Options: nosniff
```

Sharding by entity keeps every file far inside the 50,000-URL / 50 MB limit (`SHARD_LIMIT` is 45,000) and lets a crawler re-fetch only the section that changed. The 14 shards, in `SITEMAP_SHARDS` order:

| Shard | URL | Contents |
| --- | --- | --- |
| `static` | `/sitemaps/static.xml` | 30 hand-listed public routes with explicit priority and change frequency |
| `colleges` | `/sitemaps/colleges.xml` | `/colleges/[slug]` |
| `college-tabs` | `/sitemaps/college-tabs.xml` | Every `COLLEGE_TAB_SEGMENTS` sub-page, capped at `SHARD_LIMIT / tabs` colleges |
| `courses` | `/sitemaps/courses.xml` | Course detail + 6 tabs + `/courses/category/[slug]` |
| `exams` | `/sitemaps/exams.xml` | Exam detail + 10 sections |
| `predictors` | `/sitemaps/predictors.xml` | `/predictors/[slug]` |
| `articles` | `/sitemaps/articles.xml` | `/articles/[slug]` |
| `news` | `/sitemaps/news.xml` | `/news/[slug]` |
| `resources` | `/sitemaps/resources.xml` | Routed by resource `type` to `/guides`, `/previous-year-papers`, `/mock-tests`, `/ebooks`, `/webinars`; every other type falls back to `/resources/[slug]` |
| `scholarships` | `/sitemaps/scholarships.xml` | `/scholarships/[slug]` |
| `finance` | `/sitemaps/finance.xml` | `/education-loans/[providerSlug]` |
| `counsellors` | `/sitemaps/counsellors.xml` | `/counsellors/[slug]` |
| `locations` | `/sitemaps/locations.xml` | `/colleges/state/[slug]`, `/colleges/city/[slug]` (cities with `collegeCount > 0` only), `/colleges/course/[slug]` (courses at least one college offers, first 2,000) |
| `pages` | `/sitemaps/pages.xml` | Published `StaticPage` slugs |

Rules the implementation enforces:

- Only indexable rows are emitted: `status: 'published'` (or `'active'` for taxonomy/provider models), `isDeleted: { $ne: true }` and `seo.noIndex: { $ne: true }`.
- Thin pages are skipped deliberately — a city with no colleges or a course no college offers never gets a URL.
- Authenticated areas (`/admin`, `/dashboard`) and error pages are excluded by construction, not by filtering.
- `getSitemapShard` is wrapped in `cached()` with a 30-minute TTL and the content cache tags, so publishing a college or a page invalidates the sitemap along with the page itself. Both routes declare `revalidate = 3600`; the shard route's effective revalidate is the shorter 30 minutes it inherits from that cached read, which is what the build output reports.
- **Degradation is explicit**: a database failure logs `sitemap.shard_failed` and returns the static route list (for the `static` shard) or an empty shard. Crawlers treat repeated 5xx responses as a signal to slow down, so an empty sitemap is preferred over an error.

`robots.ts` advertises `Sitemap: <origin>/sitemap.xml`, and that URL now resolves to the index, which links every child. Search Console needs only the index submitted.

## Auth and RBAC flow

```
request
  │
  ├─► src/proxy.ts (edge)
  │      NextAuth(authConfig)  ← src/lib/auth/auth.config.ts (no DB, edge-safe)
  │      /admin, /dashboard require a session
  │      /admin additionally requires a non-student role
  │      signed-in users are bounced off /login and /signup
  │      otherwise returns undefined (no response) so the route keeps its own status
  │
  ├─► page / layout
  │      requireAuthPage() | requireStaffPage() | requirePermissionPage(perm)
  │      → redirect to /login or /403
  │
  └─► Server Action / Route Handler
         requireActor() | requirePermission(perm) | requireAnyPermission([...])
         → throws AuthenticationError / AuthorizationError
         → runAction() maps it to { ok: false, code: 'FORBIDDEN' }
```

- Session strategy is JWT (30-day max age, refreshed daily). `jwt`/`session` callbacks copy `roles` and the resolved `permissions` array onto the token and session.
- Providers: Credentials (email + password, bcrypt cost 12) always; Google only when both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set. OAuth sign-in creates or links a Mongoose `User` with the `student` role.
- Credentials login locks an account for 15 minutes after 5 failed attempts (`failedLoginAttempts`, `lockedUntil`).
- Effective permissions = role permissions ∪ `extraPermissions` − `deniedPermissions` (`resolvePermissions` in `src/lib/auth/rbac.ts`).
- `src/config/permissions.ts` holds 52 granular permissions and 13 roles (`super_admin` … `student`). `page.manage` covers the `StaticPage` CMS and is granted to `content_manager` (and, by construction, `admin` / `super_admin`). Roles are seeded into MongoDB from this file and are editable by `roles.manage` holders; the file remains the source of truth for a fresh install.
- Proxy protection is coarse by design. Every action and service re-checks permissions server-side.
- `src/proxy.ts` is the Next.js 16 file convention that replaced `src/middleware.ts`: same placement, same `config.matcher`, still a default export, and the build no longer logs the deprecation warning. The build output labels it `Proxy (Middleware)`.

## Model registry pattern

`src/db/models/index.ts` re-exports every model file:

```ts
import 'server-only';
export * from './shared/base';
export * from './user.model';
export * from './role.model';
// … geo, course, college, exam, predictor, finance, counselling, lead, content, site, system
```

52 models are registered across those files. `site.model.ts` holds the site-chrome models — navigation, homepage sections, settings, media, redirects, form definitions — and `StaticPage`, which backs the `/[pageSlug]` CMS route. `StaticPage` uses `auditPlugin`, `softDeletePlugin`, `slugHistorySchema`, `seoSchema` and `contentStatusField`, and validates its slug against `RESERVED_PAGE_SLUGS` so an editor cannot claim a slug that belongs to a real route (`colleges`, `exams`, `sitemap`, `api`, …) and shadow it.

Importing `@/db/models` once guarantees every schema is registered before any query calls `populate()`, which otherwise throws `MissingSchemaError`. Scripts (`run-seed.ts`, `run-indexes.ts`) import it explicitly for the same reason; `run-indexes.ts` then iterates `mongoose.models` to create indexes for whatever is registered.

Models are registered through `registerModel(name, schema)` in `src/db/models/shared/base.ts`, which returns the existing `mongoose.models[name]` if present. Without it, Next.js hot reload would re-run model files and throw `OverwriteModelError`.

## Shared schema plugins (`src/db/models/shared/base.ts`)

| Export | Effect |
| --- | --- |
| `auditPlugin(schema)` | Adds `createdBy` / `updatedBy` refs to `User` (`timestamps: true` supplies `createdAt` / `updatedAt`) |
| `softDeletePlugin(schema)` | Adds `isDeleted`, `deletedAt`, `deletedBy`, plus a `pre` hook on `find`, `findOne`, `findOneAndUpdate`, `countDocuments` and `distinct` that appends `isDeleted: { $ne: true }`. Pass `{ includeDeleted: true }` in query options to see archived rows |
| `optimisticConcurrency(schema)` | Sets `optimisticConcurrency` + `versionKey: '__v'`, so a save with a stale `__v` is rejected. Surfaced to the UI as `StaleDataError` → `code: 'STALE'` |
| `baseSchemaOptions` | `timestamps`, virtuals in `toJSON`, `_id` → `id` string, `__v` stripped from client payloads |
| `seoSchema`, `imageSchema`, `faqItemSchema`, `slugHistorySchema` | Reusable sub-documents; slug history feeds the redirect manager so old URLs keep working |
| `statusField`, `contentStatusField`, `slugField` | Shared enum/format field definitions |

Connection-level hardening in `src/db/connect.ts`: `strictQuery: true` and `strict: 'throw'`, so unknown keys are rejected rather than silently dropped (mass-assignment protection).

### Connection caching

The Mongoose instance is cached on `globalThis.__admissionSathiMongoose` outside production, because Next.js clears the module registry on every hot reload and would otherwise open a new connection each time until the Atlas pool is exhausted. Pool size is 20 in production and 5 otherwise; `autoIndex` is enabled only outside production.

## Adapter patterns

Each adapter is an internal interface with one implementation per provider, chosen from validated env config. Callers never branch on provider.

| Concern | File | Interface | Implementations | Selected by |
| --- | --- | --- | --- | --- |
| Notification channels | `src/services/notification.service.ts` | `ChannelAdapter { id, send(OutboundMessage) }` | `consoleAdapter` (email/whatsapp/sms/in_app), `resendAdapter`, `metaWhatsappAdapter` | `EMAIL_PROVIDER`, `WHATSAPP_PROVIDER`, `SMS_PROVIDER` via `adapterFor(channel)` |
| AI provider | `src/services/ai.service.ts` | `ProviderAdapter { id, model, complete(ProviderRequest) }` | `mockAdapter` (extractive, no invented facts), `openaiAdapter`, `anthropicAdapter` | `AI_PROVIDER` via `adapterFor(provider)`; falls back to `mockAdapter` on error or missing key |
| Analytics | `src/lib/analytics/client.ts` | `AnalyticsAdapter { id, isReady, track, pageView }` | `first-party` (posts to `/api/analytics/collect`), `ga`, `gtm`, `meta` | `NEXT_PUBLIC_ANALYTICS_PROVIDERS` (comma-separated, all matching adapters run) |
| Storage | `src/lib/storage/index.ts` | `uploadFile(file, folder) → StoredFile`, `deleteFile(stored)` | `uploadLocal` (writes to `public/uploads`), `uploadCloudinary` | `STORAGE_PROVIDER` |
| Error reporting (server) | `src/lib/observability/report-server.ts` | `ErrorReporter { name, capture(error, CaptureContext) }` | `logReporter`, `hostedReporter` (logs + a "SDK not installed" warning) | `SENTRY_DSN` via `resolveReporter()` |
| Error reporting (client) | `src/lib/observability/report-client.ts` | `reportClientError(error, context)` | Forwards to `window.Sentry` or `window.__admissionSathiOnError` if present | runtime detection, no secrets |

Partially implemented today: `STORAGE_PROVIDER=s3` falls back to local upload, `EMAIL_PROVIDER=smtp`, `WHATSAPP_PROVIDER=gupshup`, all `SMS_PROVIDER` values other than `console`, and `AI_PROVIDER=bedrock` have no adapter yet and degrade to the console/local/mock path.

### Adding a provider

1. Implement the interface in the same file as its siblings, e.g. an SMS adapter:
   ```ts
   const twilioAdapter: ChannelAdapter = {
       id: 'twilio',
       async send(message) {
           if (!env.SMS_API_KEY) return { ok: false, error: 'SMS_API_KEY missing' };
           // …call the provider, return { ok, providerId?, error? }
       },
   };
   ```
2. Add the provider id to the relevant `z.enum([...])` in `src/lib/env.ts` (already present for `twilio` and `msg91`) and to `.env.example`.
3. Register it in the selector (`adapterFor`, `resolveReporter`, `enabledProviders`, or `uploadFile`).
4. Nothing else changes: services, actions and UI keep calling the same function.

## Caching and revalidation

Reads:

- `src/lib/cache.ts` exposes `cached(fn, keyParts, { tags, revalidate })` around `unstable_cache`, plus the `CACHE_TAGS` catalogue (static tags such as `homepage`, `colleges`, `courses`, `settings`, `navigation`, `pages`, `faqs`, and per-slug tags like `college:${slug}` and `page:${slug}`) and `CACHE_TTL` (`short` 60s, `medium` 300s, `long` 1800s, `day` 86400s). Default revalidate is `medium`.
- Use it only for public, non-personalised reads. Per-request memoisation of session data uses React `cache()` instead (`getCurrentActor`, `getHomepageSections`).

`/[pageSlug]` is the reference case for choosing per-request rendering with cached data instead of ISR. The route declares `export const dynamic = 'force-dynamic'` and has no `generateStaticParams()` and no `revalidate`: `SiteHeader`, rendered by the shared public layout, reads the session through `getCurrentActor()` → cookies, and combining that with ISR made any slug that was not prerendered fail with `DYNAMIC_SERVER_USAGE` instead of resolving. Content is still cached — `getPublishedPage()` is wrapped in `cached()` under the `pages` tag with the 30-minute `long` TTL — so the database is not hit per request.

Writes:

- `src/lib/revalidate.ts` wraps `revalidateTag(tag, 'max')` (Next.js 16 requires a cache-life profile) and `revalidatePath`, exposed as `invalidateTag`, `invalidateTags` and `invalidatePaths`.
- `src/actions/admin/crud.actions.ts` calls `revalidatePath('/admin/{resource}')`, invalidates the resource's `revalidateTags`, and on update also revalidates `/admin/{resource}/{id}` and the public path from `resource.publicPath(doc)`.

```
Server Action mutation
   └─ service writes to Mongo
        └─ recordAudit(...)
             └─ invalidateTags(resource.revalidateTags)  ──► next public read re-queries
             └─ revalidatePath('/admin/{resource}')
```

Only writes that go through the app invalidate tags. The CLI seed script (`npm run db:seed`) writes to MongoDB directly, outside Next.js, so a cached entry — a `pages` entry for `/[pageSlug]`, for example — can stay stale until its TTL expires. Publishing the same record through `/admin/pages` invalidates the tag correctly.

## Homepage CMS section-key contract

Three pieces must agree on the same key:

```
src/config/constants.ts        HOMEPAGE_SECTION_KEYS  (the contract, 11 keys)
        │
        ├─ src/config/homepage-defaults.ts   HOMEPAGE_SECTION_DRAFTS / HOMEPAGE_DRAFT_MAP
        │        bootstrap copy + config for each key (seeded into HomepageSection)
        │
        ├─ src/schemas/homepage.schema.ts    HOMEPAGE_CONFIG_SCHEMAS + safeSectionConfig()
        │        per-key Zod validation of the stored `config` blob
        │
        └─ src/services/homepage.service.ts  getHomepageSections(preview?) → SectionMap
                 DB row ?? draft, per field; config validated, falling back to the draft
```

Keys: `hero`, `quick_actions`, `top_courses`, `compare_colleges`, `college_predictor`, `guidance_tools`, `trending`, `ai_assistant`, `whatsapp_community`, `platform_stats`, `sticky_cta`.

Rules that follow from the implementation:

- The map returned by `getHomepageSections()` always contains all 11 keys, whether or not the database has been seeded. `orderedEnabledSections(map)` filters on `isEnabled` and sorts by `displayOrder` to drive render order.
- `preview = true` reads `draftConfig` (falling back to `config`), so the admin builder can preview unpublished edits.
- An invalid or partial stored `config` never breaks the page: `safeSectionConfig(key, raw, draftConfig)` returns the draft config instead.
- Adding a section means adding the key to `HOMEPAGE_SECTION_KEYS`, a draft to `HOMEPAGE_SECTION_DRAFTS`, a Zod schema entry, and a renderer. Renaming a key orphans the existing database row.
- Reads are cached under the `homepage` tag; publishing from `src/actions/admin/homepage.actions.ts` invalidates it.

## College tab contract

`COLLEGE_TABS` in `src/config/constants.ts` is the single source of truth for the college detail sub-navigation. `COLLEGE_TAB_SEGMENTS` is derived from it (the entries with a `segment`, i.e. everything except the overview) and is what the sitemap's `college-tabs` shard iterates. The client component `src/components/colleges/college-tabs.tsx` imports and re-exports it rather than keeping its own copy, so adding a tab means adding one entry plus the route folder — the nav, the sitemap and any existing importer follow.

## Resource type contract

`RESOURCE_TYPE_META` in `src/components/resources/resource-listing.tsx` maps each `ResourceType` to its label, plural, icon, description and two separate URLs:

| Field | Meaning |
| --- | --- |
| `path` | Clean detail prefix. Detail links are always `${path}/${slug}` |
| `listingPath` | Optional. The filtered listing URL for types with no dedicated index route (`video`, `admission_calendar`, `state_counselling_guide` → `/resources?type=…`) |

`resourceListingPath(type)` returns `listingPath ?? path`. Keeping the two apart is deliberate: when a single field carried both roles, detail hrefs for those three types came out malformed, as `/resources?type=guide/some-slug`. The sitemap's `resources` shard follows the same `path` convention and falls back to `/resources/[slug]`.

## Admin resource registry pattern

`src/config/admin-resources.ts` describes each admin CRUD surface as data: `AdminResource` with `key`, `model`, labels, `icon`, `titleField`, `slugField`, `searchFields`, `defaultSort`, `columns[]`, `fields[]` (typed `AdminFieldType`, grouped, with `refModel` for reference pickers), `permissions.{read,create,update,delete}`, optional `publicPath(doc)`, `softDelete` and `revalidateTags`. `ADMIN_RESOURCE_KEYS` and `getAdminResource(key)` are the only lookups callers need.

```
/admin/[resource]            list   → columns, searchFields, defaultSort, permissions.read
/admin/[resource]/new        create → fields → generated Zod schema → createResourceAction
/admin/[resource]/[id]       edit   → fields prefilled → updateResourceAction
```

Flow for a write:

```
Client form (fields from registry)
   → createResourceAction / updateResourceAction / deleteResourceAction /
     restoreResourceAction / bulkStatusAction   (src/actions/admin/crud.actions.ts)
        → getAdminResource(key)                 unknown key ⇒ NotFoundError
        → requirePermission(resource.permissions.*)
        → buildResourceSchema(resource).safeParse(values)   (Zod built from fields[])
        → src/services/admin/crud.service.ts    → Mongoose model named resource.model
        → recordAudit({ entity: resource.model, previousValues, newValues })
        → revalidatePath('/admin/'+key) + invalidateTags(resource.revalidateTags)
```

Consequences:

- Adding a resource is a registry entry plus a Mongoose model — no new route, form, table, validation or audit code.
- Delete is soft when `softDelete: true` (the row is archived and restorable), hard otherwise; the action's success message reflects which happened.
- 28 resources are registered today, from `colleges` and `courses` through `pages`, `leads`, `reviews`, `users`, `redirects`, `contact-submissions` and the email/WhatsApp templates.
- `searchReferenceAction` powers reference pickers and derives its guard from whichever registered resource owns the requested `refModel`, so a user who can only manage exams cannot enumerate leads or users through a picker. Taxonomy models with no CRUD screen of their own are covered by the `REFERENCE_ONLY_PERMISSIONS` map in `src/actions/admin/crud.actions.ts`. A model in neither place is refused with `NotFoundError` rather than falling back to a permissive check.

## Cross-cutting server helpers

| File | Role |
| --- | --- |
| `src/lib/action-helpers.ts` | `runAction()` wraps every action body: maps `ZodError`, auth errors, `NotFoundError`, `ConflictError`, `StaleDataError`, `RateLimitedError` and Mongo duplicate-key (11000) to typed `ActionResult` codes; logs unexpected failures with a request id and returns that id to the user instead of internals |
| `src/lib/rate-limit.ts` | Fixed-window limiter using Upstash REST when configured, otherwise an in-memory map (per-instance only). `RATE_LIMITS` defines named buckets for leads, bookings, contact, reviews, search, predictor runs, AI chat, signup and newsletter. Client IPs are SHA-256 hashed with `AUTH_SECRET` before use |
| `src/lib/logger.ts` | Structured logging + `newRequestId()` |
| `src/services/audit.service.ts` | `recordAudit()` — actor, action, entity, label, previous/new values |
| `src/lib/seo/metadata.ts`, `src/lib/seo/json-ld.tsx` | Canonical URLs, OG/Twitter cards, robots directives, structured data |

## Security headers

`next.config.ts` applies to every route: a Content Security Policy (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`, with allowances for Google Tag Manager/Analytics, Meta, Cloudinary, Unsplash, OpenAI and YouTube/Google frames; `'unsafe-eval'` only outside production), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)` and a two-year HSTS with `includeSubDomains; preload`. `poweredByHeader` is off.
