# Deployment

Target platform is Vercel (the app is a standard Next.js 16 App Router project with no custom server). MongoDB Atlas hosts the data. Media goes to Cloudinary, because a serverless filesystem cannot persist `public/uploads`.

## 1. Vercel project

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Vercel → **Add New → Project** → import the repository.
3. Framework preset: **Next.js** (also pinned in `vercel.json`). Build command `npm run build`, install command `npm ci`, output handled by the adapter — leave the defaults.
4. Node.js version: set the project to **20.x or 22.x** to match `engines.node >= 20.9.0`.
5. Add the environment variables (below), then deploy.
6. Add your custom domain under **Settings → Domains** and let Vercel issue the certificate.

`vercel.json` at the repo root declares the framework and the cron entry:

```json
{
  "framework": "nextjs",
  "crons": [{ "path": "/api/cron/notifications", "schedule": "0 2 * * *" }]
}
```

**The schedule is daily on purpose.** Vercel's Hobby plan permits cron granularity of at most once per day; a finer expression such as `*/15 * * * *` or `0 * * * *` makes the **deployment itself fail** with:

```
Error: Hobby accounts are limited to daily cron jobs.
This cron expression would run more than once per day.
```

`0 2 * * *` is 02:00 UTC (07:30 IST) and is valid on every plan. On Pro or above, tighten it to `*/15 * * * *` for near-real-time notification delivery, or drain the queue manually (see §6). Note that a daily cron means a queued email or WhatsApp message can wait up to 24 hours.

## 2. Environment variables in Vercel

**Settings → Environment Variables.** Add each variable to the environments that need it (Production, Preview, Development). Full reference: [environment.md](environment.md).

Production minimum:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Production Atlas cluster string, production DB user |
| `MONGODB_DB_NAME` | `admission-sathi` |
| `AUTH_SECRET` | Fresh `openssl rand -base64 32` (do not reuse the development value) |
| `AUTH_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` — set it explicitly; see the note below |
| `STORAGE_PROVIDER` | `cloudinary` plus the three `CLOUDINARY_*` values. `local` throws on Vercel by design (ephemeral filesystem), and `s3` has no adapter |
| `CRON_SECRET` | Fresh random string. Without it `/api/cron/notifications` returns 401 to every caller and no queued notification is ever delivered |

Add as needed: `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, `STORAGE_PROVIDER=cloudinary` plus the three Cloudinary values, `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM`, `WHATSAPP_PROVIDER=meta` + token + phone number id, `AI_PROVIDER` + model + key, `UPSTASH_REDIS_REST_URL` / `_TOKEN`, `NEXT_PUBLIC_ANALYTICS_PROVIDERS` and the analytics IDs.

Notes:

- `NODE_ENV` is set by the platform; do not override it.
- **Canonical origin.** `resolveSiteUrl()` in `src/config/site.ts` prefers `NEXT_PUBLIC_SITE_URL`, then falls back to Vercel's `VERCEL_PROJECT_PRODUCTION_URL` and finally `VERCEL_URL`, and only then to `http://localhost:3000`. The fallback exists so a deploy that forgot the variable still publishes reachable URLs rather than filling every canonical tag, OG card, JSON-LD block and sitemap entry with `localhost`. Set it explicitly anyway: the fallback resolves to the `*.vercel.app` domain, not your custom domain, so canonicals would point at the wrong host.
- **Crawlability is keyed to `VERCEL_ENV`, not the hostname.** `src/app/robots.ts` serves the real allow-list only when `VERCEL_ENV=production`; preview and development deployments return a blanket `Disallow: /`. Vercel sets this automatically, so a production site on a `*.vercel.app` domain is crawlable while previews never compete with it in search.
- Preview deployments should point at a separate database. They share nothing with production unless you configure them to.
- Never prefix a secret with `NEXT_PUBLIC_` — that value ships to every browser.
- If a build must run without live credentials, set `SKIP_ENV_VALIDATION=true` for that build only. Runtime always needs the real values.
- Changing an environment variable requires a redeploy to take effect.

## 2a. First-deploy order

The build queries MongoDB (the `/sitemaps/[shard]` route prerenders 14 shards), so the order matters:

1. Add the environment variables **before** the first deploy. Without `MONGODB_URI` and `AUTH_SECRET` the build fails fast with a list of the missing values — that is deliberate, not a bug.
2. Allow Vercel to reach Atlas (see §3). If the database is unreachable at build time the build still succeeds — `getSitemapShard` catches the failure and emits an empty shard — but your sitemaps ship empty.
3. Deploy.
4. Run `npm run db:indexes` against the production database (§4). Production connects with `autoIndex: false`, so nothing creates indexes for you.
5. Sign in and publish real content. Do **not** run `npm run db:seed` against production.

## 3. MongoDB Atlas production hardening

**Network access**
- Vercel's build and serverless functions use dynamic egress IPs on Hobby/Pro, so a narrow allowlist will simply refuse every connection. Either allow `0.0.0.0/0` (acceptable only while the data is demonstration content), or enable a static outbound IP / secure compute and allowlist that, or use Atlas Private Endpoint on a dedicated tier. A build that hangs then ships empty sitemaps is the usual symptom of forgetting this.
- Remove `0.0.0.0/0` before holding real user data. Prefer a dedicated egress path: on Vercel that means enabling a static outbound IP / secure compute and allowlisting it, or using Atlas Private Endpoint / VPC peering on a dedicated tier.
- If you must allowlist broadly while on the free tier, treat the data as non-sensitive and plan migration to a dedicated tier before launch.

**Database users (least privilege)**
| User | Role | Used by |
| --- | --- | --- |
| `as_app_prod` | `readWrite` on `admission-sathi` only | The application (`MONGODB_URI`) |
| `as_migrate` | `readWrite` + `dbAdmin` on `admission-sathi` | `npm run db:indexes` |
| `as_readonly` | `read` on `admission-sathi` | Analytics/BI, on-call inspection |

- One user per purpose, distinct strong passwords, no `atlasAdmin` for the app.
- Never reuse the development user in production.
- Enforce TLS (Atlas default) and keep `retryWrites=true&w=majority`.
- Enable Atlas database auditing and, on dedicated tiers, encryption at rest with your own key if required.

**Other**
- Turn on **Require MFA** for the Atlas organisation.
- Keep the cluster on a supported major version; take a snapshot before upgrading.

## 4. Indexes in production

The app connects with `autoIndex: false` in production, so indexes must be created explicitly.

```bash
# from a machine allowlisted in Atlas, with production credentials in .env.local
MONGODB_URI="mongodb+srv://as_migrate:…@cluster.mongodb.net/admission-sathi" \
MONGODB_DB_NAME=admission-sathi \
AUTH_SECRET="any-16-plus-char-placeholder" \
npm run db:indexes
```

- Run it after the first deploy and after any change to a schema index.
- Safe to re-run: only missing indexes are created. The script exits non-zero if any model fails.
- Index builds on a live collection consume IOPS; run during a quiet window on large collections.
- Do **not** run `npm run db:seed` against production. It inserts demonstration data.

## 5. Media storage

Cloudinary (recommended):

```
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=…
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
```

- Assets are uploaded under the `admission-sathi/<folder>` prefix.
- `res.cloudinary.com` is already allowed in the CSP `img-src` and in `images.remotePatterns`.
- Consider restricting the Cloudinary API key to upload/destroy and enabling auto-backup on the account.

S3: env variables are validated but the adapter is not implemented. `uploadFile` now **throws** for `STORAGE_PROVIDER=s3` rather than quietly writing to a local path an operator believes is a bucket. Do not set it until the adapter lands.

Local: development only. `uploadLocal` refuses to run when `process.env.VERCEL` is set or `NODE_ENV=production`, because the serverless filesystem is read-only apart from `/tmp` and anything written there disappears with the invocation — a "successful" upload would leave a media record pointing at a URL that 404s forever. The error names the variables to set instead.

## 6. Cron jobs

`vercel.json` schedules `/api/cron/notifications` every 15 minutes. The handler (`src/app/api/cron/notifications/route.ts`) accepts GET and POST and calls `processNotificationQueue(limit)` from `src/services/notification.service.ts`, which picks up to 25 due notifications by default, sends them through the configured channel adapter, marks them `sent`, and reschedules failures with exponential backoff (giving up as `failed` after 4 attempts). `maxDuration` is 60 seconds.

- **`CRON_SECRET` is not optional in production.** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; the route compares it in constant time and returns 401 when the header is missing, wrong, or when `CRON_SECRET` itself is unset. Without the variable the worker never runs and the queue grows silently.
- `?limit=` overrides the batch size and is capped at 100. Useful for draining a backlog by hand:
  ```bash
  curl -s -H "Authorization: Bearer $CRON_SECRET" \
    "https://your-domain.com/api/cron/notifications?limit=100"
  ```
- A successful call returns `{ ok: true, requestId, ... }` with the queue result. A failure returns 500 so it shows up as a failed cron run rather than a silent success.
- Cron jobs run against Production deployments only.
- Adjust the cadence in `vercel.json`; a redeploy is required for schedule changes.
- Check **Vercel → Project → Cron Jobs** for the last run status, and the function logs for `notification.*` events.

## Production checklist

- [ ] Environment validation passes at runtime (no `SKIP_ENV_VALIDATION` in Production; a cold start logs no env warnings)
- [ ] `npm run db:indexes` has been run against the production database and reported zero failures
- [ ] Seed/demonstration data removed or replaced — no record still carrying the `DEMO_DATA_NOTICE` wording, no `(demo)` users, no sample leads
- [ ] Real content published: colleges, courses, exams, predictors (with disclaimers), loan providers, scholarships and articles reviewed and set to `published`
- [ ] Homepage sections reviewed and published in `/admin/homepage`; placeholder stats (`1000+`, `95%`, `20K+`) replaced with verifiable figures
- [ ] RBAC reviewed in `/admin/roles`: role→permission matrix confirmed, staff accounts hold the least role they need, no unintended `super_admin`
- [ ] Secrets rotated for production: `AUTH_SECRET`, `CRON_SECRET`, OAuth client secret, Cloudinary secret, provider API keys, Atlas passwords — none shared with development
- [ ] Demo logins (`admin@`, `student@`, and the eight `*@admissionsathi.org` staff accounts) deleted or given new strong passwords
- [ ] CSP verified on the deployed site (`curl -sI https://your-domain.com | grep -i content-security-policy`); no console CSP violations on the homepage, admin, predictor and AI panels; HSTS, `X-Frame-Options`, `nosniff` and `Referrer-Policy` present
- [ ] `/robots.txt` correct on the production host: it must show the `Allow: /` rule set, not the blanket `Disallow: /` that non-production and `*.vercel.app` hosts get
- [ ] `/manifest.webmanifest` serves and the icons resolve
- [ ] Sitemaps reachable: `/sitemap.xml` returns a `<sitemapindex>` and a spot-check of two children (for example `/sitemaps/static.xml` and `/sitemaps/pages.xml`) returns a valid `<urlset>`. The `Sitemap:` URL in `/robots.txt` must resolve. Submitting the index to Search Console is enough — it links all 14 shards
- [ ] Unknown URLs return HTTP **404**, not 200 with the 404 UI: spot-check `/colleges/does-not-exist`, `/nonexistent-slug` and `/foo/bar/baz` with `curl -sI`, and confirm `/` and `/about` still return 200. A soft 404 means a `loading.tsx` was added above a route that calls `notFound()` — see [architecture.md](architecture.md#route-loading-states-and-404-correctness)
- [ ] CMS pages published: the nine `StaticPage` slugs (`about`, `careers`, `partner-with-us`, `editorial-policy`, `app`, `privacy-policy`, `terms-of-use`, `refund-policy`, `disclaimer`) exist with real content, since the footer links to them and the seeded copy is demonstration text. `/[pageSlug]` is `force-dynamic`, so a page published later resolves without a redeploy — publish through `/admin/pages` so the `pages` cache tag is invalidated; a record written straight to MongoDB stays behind the 30-minute cache TTL
- [ ] PDF exports work on the deployed host: `/api/compare/pdf?slugs=<slug>` and `/api/education-loans/summary?amount=500000&rate=10&tenure=60` both return `application/pdf`
- [ ] Analytics IDs set (`NEXT_PUBLIC_ANALYTICS_PROVIDERS` plus GA4/GTM/Meta IDs) and events visible in `/admin/analytics`
- [ ] Error tracking wired: `SENTRY_DSN` set and the SDK actually installed, replacing the placeholder reporter in `src/lib/observability/report-server.ts`
- [ ] Backups enabled on Atlas and a restore has been rehearsed (see below)
- [ ] Rate limiting is distributed: `UPSTASH_REDIS_REST_URL` / `_TOKEN` set, otherwise limits are per-instance only
- [ ] Storage provider is `cloudinary` (or a real S3 adapter), not `local`
- [ ] Notification cron verified: `/api/cron/notifications` returns 200 with the correct Bearer secret and 401 without it, and `CRON_SECRET` is set in Production
- [ ] Cron schedule is valid for your plan — daily (`0 2 * * *`) on Hobby, anything finer only on Pro or above
- [ ] `NEXT_PUBLIC_SITE_URL` set to the custom domain, and a spot-check of `/sitemap.xml` plus the homepage canonical shows that host rather than a `*.vercel.app` fallback
- [ ] Media upload succeeds from `/admin/media` on the deployed host, proving `STORAGE_PROVIDER=cloudinary` is in effect (a `local` misconfiguration now throws a named error instead of failing silently)
- [ ] Google OAuth callback URL registered for the production domain
- [ ] `npm run typecheck` (0 errors), `npm run lint` (0 errors) and `npm test` (182 passing) clean on the deployment branch
- [ ] `npm run build` succeeds with no warnings. The build is clean today (the Next.js 16 `middleware` → `proxy` deprecation is gone now that the file is `src/proxy.ts`), so treat any warning as a regression
- [ ] End-to-end specs run at least once against a seeded staging database (`npm run test:e2e`); they have only ever been compile-verified so far

## Backups

**Atlas**
- Free/shared tiers (M0/M2/M5) have no continuous backup. Take manual `mongodump` snapshots, or move to M10+ before holding real user data.
- M10 and above: enable **Cloud Backup** with continuous point-in-time recovery. Suggested retention: hourly snapshots for 2 days, daily for 14 days, weekly for 4 weeks, monthly for 12 months. Adjust to your data-retention policy.

**Manual dumps**
```bash
# full dump
mongodump --uri="$MONGODB_URI" --gzip --archive=as-$(date +%F).gz

# restore into a scratch database
mongorestore --uri="$MONGODB_URI_SCRATCH" --gzip --archive=as-2025-01-01.gz \
  --nsFrom='admission-sathi.*' --nsTo='as-restore-test.*'
```
Cadence when running without continuous backup: daily automated dump, retained 30 days, stored off-platform (encrypted object storage) with restricted access. Dumps contain user PII and password hashes — encrypt at rest and limit who can download them.

**Restore drill (quarterly)**
1. Restore the latest snapshot/dump into a scratch database.
2. Point a preview deployment at it with a separate `MONGODB_URI`.
3. Run `npm run db:indexes` against the scratch database.
4. Verify: admin login, a college detail page, a predictor run, a lead submission, homepage sections rendering.
5. Record how long the restore took and note it as your recovery time objective.
6. Delete the scratch database and rotate any credentials used during the drill.

Also back up out-of-band: Cloudinary media (enable account backup or replicate the folder), and the environment variable set (store in a password manager or secrets vault, not in the repo).

## Monitoring

**Vercel**
- **Observability / Logs**: function logs carry the structured entries from `src/lib/logger.ts`. Useful queries: `action.unhandled_error` (unexpected action failures, each with a `requestId` also shown to the user), `error.captured`, `notification.queue_failed`, `ai.provider_failed`, `auth.locked_account_attempt`, `homepage.sections_load_failed`, `media.upload_failed`.
- **Web Analytics / Speed Insights**: enable for traffic and Core Web Vitals. This is separate from the in-app first-party analytics.
- **Cron Jobs** tab: confirm `/api/cron/notifications` runs and succeeds.
- Set up log drains if you need retention beyond the platform default.

**In-app**
- `/admin/analytics` reads the first-party `AnalyticsEvent` and `SearchQuery` collections: dashboard overview, event trends, top pages, top search terms and zero-result terms (a good content-gap signal).
- `/admin/audit-logs` shows who changed what, with before/after values.
- `/admin/integrations` shows which providers are configured from env.

**Atlas alerts**
- Connections above ~80% of the tier limit (pool is 20 per instance in production).
- Disk usage above 75%, disk queue depth, replication lag.
- Query targeting ratio (scanned/returned) — catches a missing index after a schema change.
- Failed authentication attempts; database user or IP allowlist changes.
- Route alerts to email plus a Slack/PagerDuty integration.

**Uptime checks**
- External monitor (Better Stack, Pingdom, UptimeRobot or similar) on `https/GET /` every 1–5 minutes from at least two regions, alerting after two consecutive failures.
- Add a second check on a database-backed page (for example a college listing) so a healthy shell with a broken database still alerts.
- Optional: a lightweight authenticated check on the cron endpoint to confirm the worker path is alive.

**Error tracking today**
`src/lib/observability/report-server.ts` implements an `ErrorReporter` interface with two implementations: `logReporter` (structured log) and `hostedReporter`, which logs the same entry plus `error.tracker_not_installed` when `SENTRY_DSN` is set. `captureError()` always returns a request id, and never throws. `src/lib/observability/report-client.ts` forwards to `window.Sentry` or `window.__admissionSathiOnError` if either exists, and console-logs in development.

To plug in Sentry:
1. `npm i @sentry/nextjs` and run its wizard (adds `sentry.server.config.ts`, `sentry.client.config.ts`, `instrumentation.ts`).
2. Replace `resolveReporter()` in `report-server.ts` with an adapter that calls `Sentry.captureException(error, { tags: { scope }, user: { id }, extra })`.
3. Client side, either let the SDK attach `window.Sentry` (already picked up by `reportClientError`) or import it directly there.
4. Add the ingest host to the CSP `connect-src` in `next.config.ts`, and set `NEXT_PUBLIC_SENTRY_DSN` if you use the browser SDK.
5. Confirm `src/app/global-error.tsx` and the route-level `error.tsx` boundaries report through it.
