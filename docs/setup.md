# Local setup

## 1. Toolchain

| Requirement | Version | Notes |
| --- | --- | --- |
| Node.js | `>=20.9.0` | Declared in `package.json` `engines`; Node 22 LTS also works |
| npm | bundled with Node | `package-lock.json` is committed — prefer `npm ci` for reproducible installs |
| Git | any recent | — |

```bash
node -v
npm ci        # or: npm install
```

## 2. MongoDB

The app needs a MongoDB 6+ database. Either a local `mongod` (`mongodb://127.0.0.1:27017/admission-sathi`) or Atlas.

### Atlas free tier (M0)

1. Create an account at `https://cloud.mongodb.com` and create a project.
2. **Build a Database** → **M0 Free** → pick a region close to you → create the cluster.
3. **Database Access** → **Add New Database User**. Use password authentication and give the user `readWrite` on the `admission-sathi` database (Atlas UI: *Built-in Role → Read and write to any database* is acceptable for development; scope it down for production, see [deployment.md](deployment.md)).
4. **Network Access** → **Add IP Address** → *Add Current IP Address*. `0.0.0.0/0` works for a quick start but should never be used for production data.
5. **Database** → **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/admission-sathi?retryWrites=true&w=majority
   ```
   URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `:` → `%3A`).
6. Put it in `.env.local` as `MONGODB_URI`. `MONGODB_DB_NAME` (default `admission-sathi`) is passed as `dbName` and wins over any database in the URI path.

## 3. Environment file

```bash
cp .env.example .env.local
```

Minimum to boot:

```dotenv
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/admission-sathi?retryWrites=true&w=majority"
AUTH_SECRET="<32-byte random string>"
```

Generate `AUTH_SECRET` (must be at least 16 characters; 32 bytes base64 is the recommendation):

```bash
openssl rand -base64 32
```

`src/lib/env.ts` validates server variables with Zod on first import and throws a list of problems if validation fails. Everything else has a safe default: storage falls back to `local`, and email / WhatsApp / SMS / AI all default to `console` or `mock` so nothing is sent or billed in development. Full reference: [environment.md](environment.md).

Scripts (`db:seed`, `db:indexes`) do not go through Next.js, so they load `.env.local` then `.env` via `src/db/load-script-env.ts`.

## 4. Google OAuth (optional)

Google sign-in only registers when both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are present; otherwise the login page offers email + password only.

1. `https://console.cloud.google.com` → create or select a project.
2. **APIs & Services → OAuth consent screen**: choose *External*, add your email as a test user.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**.
4. Authorised JavaScript origin:
   ```
   http://localhost:3000
   ```
5. Authorised redirect URI (exact):
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   For deployed environments: `https://your-domain.com/api/auth/callback/google`.
6. Copy the client ID and secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

Note that `allowDangerousEmailAccountLinking: true` is set on the Google provider, so a Google sign-in links to an existing user with the same email address.

## 5. Cloudinary (optional)

With `STORAGE_PROVIDER=local`, uploads are written to `public/uploads/...` and served from the app — fine for development, not for serverless production (the filesystem is ephemeral).

1. Sign up at `https://cloudinary.com` and open the dashboard.
2. Copy **Cloud name**, **API Key** and **API Secret**.
3. Set:
   ```dotenv
   STORAGE_PROVIDER=cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
4. Uploads land in the `admission-sathi/<folder>` prefix with `resource_type: 'auto'`. `res.cloudinary.com` is already allowed in both the CSP `img-src` and `next.config.ts` `images.remotePatterns`.

Limits enforced in `src/lib/storage/index.ts`: images ≤ 5 MB (`jpeg`, `png`, `webp`, `avif`, `svg`), documents ≤ 15 MB (`pdf`, `doc`, `docx`, `xls`, `xlsx`, `csv`). Anything else is rejected before it reaches a provider.

`STORAGE_PROVIDER=s3` is accepted by env validation but has no adapter yet — it silently uses the local writer. Leave the `S3_*` variables empty until the adapter exists.

## 6. Indexes

```bash
npm run db:indexes
```

Iterates every registered model and calls `createIndexes()`. Safe to re-run; only missing indexes are created.

**This step is required in development too, not just production.** `autoIndex` is off in every environment except tests (`src/db/connect.ts`): letting Mongoose build ~340 indexes across ~50 models on first use saturates a shared Atlas tier, and ordinary queries queue behind the builds — 1.5s per query with it on versus 70ms with it off, same connection, same data. Run this once after a fresh database and again after changing any model's indexes. `MONGOOSE_AUTO_INDEX=true` restores the old behaviour while you iterate.

## 7. Seed data

```bash
npm run db:seed          # upsert, safe to re-run
npm run db:seed:fresh    # clears collections first, then seeds
```

Seeds roles and permissions, users, settings, homepage sections, editor-managed static pages, navigation, communication templates, geography, course categories, exams, courses, colleges, predictors, finance, counsellors, content and sample leads, then recomputes counters. Each module prints what it inserted, so the counts in the terminal are authoritative.

`seedContent()` (`src/db/seeds/seed-modules.ts`) inserts 62 resource records: for each of the first 8 exams, 3 previous-year papers + 1 mock test + 1 syllabus guide (40), plus 10 state counselling guides, 5 e-books, 5 webinars and 2 admission calendars.

`seedStaticPages()` (`src/db/seeds/seed-core.ts`, data in `src/db/seeds/data/page.data.ts`) creates the nine pages served by `/[pageSlug]`: `about`, `careers`, `partner-with-us`, `editorial-policy`, `app`, `privacy-policy`, `terms-of-use`, `refund-policy`, `disclaimer`. Without this, those URLs have no content — the route reads them from MongoDB, nothing is hardcoded.

College media (logo, hero banner, 12–14 tile gallery with two campus films, brochure, map, website) is composed per college in `src/db/seeds/data/college-media.data.ts`. Photos come from Unsplash and videos from Pexels — both hosts are already allowed by `next.config.ts` (`remotePatterns`, CSP `img-src` / `media-src`), so nothing needs configuring, but the gallery does need network access to render. The logos and prospectus PDFs it links to are local files generated by `npm run assets:colleges`, which both seed scripts run automatically.

Everything inserted is demonstration data (see `DEMO_DATA_NOTICE` in `src/config/constants.ts`). The script prints the login details when it finishes.

## 8. Run and sign in

```bash
npm run dev
```

1. Open `http://localhost:3000`.
2. Go to `/login`.
3. Sign in as `admin@admissionsathi.org` / `Admin@12345` (or your `SEED_SUPER_ADMIN_*` values).
4. The edge proxy (`src/proxy.ts`) redirects staff to `/admin`; students go to `/dashboard`.
5. Useful starting points: `/admin/homepage` (homepage builder), `/admin/colleges` (generic CRUD), `/admin/roles` (permission matrix), `/admin/settings`.

Other seeded logins, including per-role staff accounts, are listed in the [README](../README.md#demo-credentials).

## 9. Before you commit

```bash
npm run typecheck   # 0 errors expected
npm run lint        # 0 errors, 55 warnings expected
npm test            # 182 unit tests expected
```

All three run as-is (`eslint.config.mjs`, `vitest.config.ts` and `tests/` are in the repo). The lint warnings are deliberate — see [testing.md](testing.md) for the breakdown. Treat a new *error*, or a change in the warning count, as something to fix rather than accept.

End-to-end specs are optional locally and need a running app plus a seeded database:

```bash
npm run db:seed:fresh           # against a throwaway test database
npm run test:e2e                # builds and starts the app itself
npm run test:e2e:ui             # interactive
```

## Troubleshooting

### Environment

| Symptom | Cause and fix |
| --- | --- |
| `Invalid environment configuration.` with a bullet list | Zod validation in `src/lib/env.ts` failed. The listed variables are missing or malformed in `.env.local` |
| `AUTH_SECRET must be at least 16 characters` | Regenerate with `openssl rand -base64 32` |
| Build fails on a CI box without secrets | Set `SKIP_ENV_VALIDATION=true` for the build. Placeholder `MONGODB_URI` / `AUTH_SECRET` values are substituted and a warning is printed. Never use this at runtime |
| Seed or index script sees no variables | Ensure the values are in `.env.local` or `.env`; scripts do not read Vercel/CI-only variables |

### MongoDB / Mongoose

| Symptom | Cause and fix |
| --- | --- |
| `MongooseServerSelectionError: Could not connect to any servers` | Atlas IP allowlist does not include your address, or the cluster is paused. `serverSelectionTimeoutMS` is 10s |
| `Authentication failed` | Wrong database user, or unencoded special characters in the password |
| `MissingSchemaError: Schema hasn't been registered for model "X"` | A query used `populate()` without the registry. Import `@/db/models` (not the single model file) |
| `OverwriteModelError` | A model was created with `mongoose.model()` directly. Use `registerModel()` from `src/db/models/shared/base.ts` |
| `Strict mode: path "…" is not in schema` | `mongoose.set('strict', 'throw')` is deliberate. Add the field to the schema instead of loosening the setting |
| Update rejected as stale / `code: 'STALE'` | Optimistic concurrency: someone else saved the record. Reload the edit form and retry |
| Connection count climbs during development | Expected on hot reload only if the global cache is bypassed; the cache lives on `globalThis.__admissionSathiMongoose` outside production |
| Query returns nothing for archived rows | `softDeletePlugin` hides `isDeleted: true`. Pass `{ includeDeleted: true }` in query options |
| Want to see the queries | `MONGOOSE_DEBUG=true` in `.env.local` (development only) |
| A unique constraint or text search does not behave in development | Indexes are no longer created automatically (see §6). Run `npm run db:indexes`, or set `MONGOOSE_AUTO_INDEX=true` while iterating on a model's indexes |
| Every query takes ~1.5s | Almost certainly `MONGOOSE_AUTO_INDEX=true` against a shared Atlas cluster: the index builds queue ahead of your queries. Unset it and run `npm run db:indexes` once |

### Auth.js

| Symptom | Cause and fix |
| --- | --- |
| `redirect_uri_mismatch` from Google | The redirect URI must be exactly `<origin>/api/auth/callback/google` |
| Google button missing | `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` must both be set; the provider is skipped otherwise |
| Login silently fails with correct password | Account is not `active`, or locked for 15 minutes after 5 failed attempts (`lockedUntil` on the user document) |
| `DataCloneError: [object Array] could not be cloned` in the auth log, surfaced as a failed sign-in | Something handed the JWT encoder a value it cannot `structuredClone()`. Mongoose 8 returns document arrays as a `Proxy`, which looks like a plain array but cannot be cloned. Copy it out (`Array.from(...)`) before it reaches the token — `toSessionUser()` in `src/lib/auth/index.ts` and the `jwt` callback in `src/lib/auth/auth.config.ts` both do this. Covered by `tests/unit/lib/auth-jwt.test.ts` |
| Sign-in reports a server problem with a `ref:` id instead of "Invalid email or password" | Deliberate. Only Auth.js `CredentialsSignin` means bad credentials; any other `AuthError` is a server fault and is logged as `auth.login_failed` with the `authErrorType` and cause. Search the logs for that request id |
| `UntrustedHost` | Set `AUTH_URL` to the deployment origin. `trustHost: true` is already set in `src/lib/auth/auth.config.ts` |
| Signed in but `/admin` bounces to `/403` | The account has only the `student` role. `src/proxy.ts` requires a non-student role for `/admin` |
| Permission changes not taking effect | Permissions are baked into the JWT at sign-in. Sign out and back in after editing roles |

### Build and runtime

| Symptom | Cause and fix |
| --- | --- |
| `You're importing a component that needs "server-only"` | A Client Component imported a server module (env, service, model, cache). Pass data down as props or call a Server Action instead |
| `Module not found: Can't resolve 'fs'` / mongoose bundling errors | Keep server code out of client files; `mongoose`, `bcryptjs` and `cloudinary` are already in `serverExternalPackages` |
| Third-party script or iframe blocked in the console | The CSP in `next.config.ts` is allowlist-based. Add the host to the correct directive |
| Remote image throws `Invalid src prop` | Add the hostname to `images.remotePatterns` in `next.config.ts` |
| `npm run lint` reports 55 warnings | Expected. React Compiler advisory rules, unused disable directives and unused vars are set to `warn` in `eslint.config.mjs` |
| Build logs a warning of any kind | Treat it as a regression. The build is warning-free today; the Next.js 16 `middleware` → `proxy` deprecation is gone because the file is now `src/proxy.ts` |
| An unknown URL renders the 404 page but the response status is 200 | A `loading.tsx` was added to a segment whose page — or some route beneath it — can call `notFound()`. The Suspense boundary flushes the shell and commits the 200 before the page runs. Delete it, or move the index page into an `(index)` route group so the boundary no longer covers `[slug]`. See [architecture.md](architecture.md#route-loading-states-and-404-correctness) |
| A test fails with `This module cannot be imported from a Client Component` | The `server-only` alias in `vitest.config.ts` covers Vitest. Playwright specs must not import server modules at all |
| Vitest test using `render()` throws `document is not defined` | Add `// @vitest-environment jsdom` as the first line of the file; the suite default is `node` |
| E2E specs pass but assert almost nothing | The database is empty, so the dataset-dependent specs take their empty-state branch. Run `npm run db:seed:fresh` against a test database first |
| `/about` and the other CMS pages do not resolve | `StaticPage` is empty. Run `npm run db:seed` — those nine pages are database rows, not files. With an empty collection the route falls through to the redirect manager and then to a real 404. No rebuild is needed to pick up a new page: `/[pageSlug]` is `force-dynamic` |
| A page published moments ago still 404s or shows old content | The `pages` cache tag has not been invalidated. `npm run db:seed` writes straight to MongoDB, outside Next.js, so the cached entry survives until its 30-minute TTL expires; restart `next dev` or wait it out. Publishing through `/admin/pages` invalidates the tag immediately |
