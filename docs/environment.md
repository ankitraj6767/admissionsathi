# Environment variables

Server variables are validated in [`src/lib/env.ts`](../src/lib/env.ts) with Zod on first import. Validation failure throws with a per-variable list of problems. Setting `SKIP_ENV_VALIDATION=true` downgrades failures to a warning and substitutes placeholder values for `MONGODB_URI` and `AUTH_SECRET` — intended for CI builds only, never for runtime.

`src/lib/env.ts` starts with `import 'server-only'`, so the whole server variable set is unreachable from browser bundles.

## Rules

- **`MONGODB_URI` and every secret must never be prefixed with `NEXT_PUBLIC_`.** Anything with that prefix is inlined into the JavaScript sent to every visitor and is therefore public forever. This applies to `MONGODB_URI`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`, `CLOUDINARY_API_SECRET`, `S3_SECRET_ACCESS_KEY`, `RESEND_API_KEY`, `SMTP_PASSWORD`, `WHATSAPP_API_TOKEN`, `SMS_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET` and `SENTRY_DSN`.
- `NEXT_PUBLIC_*` variables are read directly from `process.env` in client code and are **not** part of the Zod schema. Keep them to non-sensitive identifiers (site URL, analytics measurement IDs).
- Provider enums are validated. An unlisted value fails validation rather than silently disabling a feature.
- Defaults are chosen so that a bare `.env.local` with `MONGODB_URI` + `AUTH_SECRET` runs a fully functional local app that sends nothing to the outside world.

Legend: **Required** = validation fails without it. Scope **server** = validated in `env.ts`, never sent to the browser. Scope **public** = `NEXT_PUBLIC_*`, embedded in the client bundle. Scope **script** = read directly from `process.env` by seed scripts.

## Core

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | No (default `development`) | server | One of `development`, `test`, `production`. Drives pool size, `autoIndex`, CSP strictness, stack-trace verbosity | `development` |
| `MONGODB_URI` | **Yes** | server | MongoDB connection string. Must be non-empty | `mongodb+srv://user:pass@cluster.mongodb.net/admission-sathi?retryWrites=true&w=majority` |
| `MONGODB_DB_NAME` | No (default `admission-sathi`) | server | Passed as Mongoose `dbName`; overrides any database in the URI path | `admission-sathi` |
| `MONGOOSE_DEBUG` | No | server | `true` logs every Mongoose query. Ignored in production. Read directly in `src/db/connect.ts`, not part of the schema | `false` |
| `MONGOOSE_AUTO_INDEX` | No (default off) | server | `true` lets Mongoose create indexes on model use. Off by default because index builds against a shared Atlas tier slow every concurrent query (measured 1.5s vs 70ms). Always on under `NODE_ENV=test`. Use `npm run db:indexes` instead | `false` |
| `SKIP_ENV_VALIDATION` | No | server | `true` turns env validation errors into warnings during a build | `false` |
| `NEXT_PUBLIC_SITE_URL` | No (default `http://localhost:3000`) | public | Canonical origin used for absolute URLs, OG tags and `siteConfig.url` | `https://admissionsathi.org` |

## Auth

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `AUTH_SECRET` | **Yes** | server | JWT/session signing secret; also salts the rate-limiter IP hash. Minimum 16 characters — use `openssl rand -base64 32` | `Zt7…base64…` |
| `AUTH_URL` | No | server | Deployment origin; must be a valid URL when set. Needed when the host cannot be inferred | `https://admissionsathi.org` |
| `AUTH_GOOGLE_ID` | No | server | Google OAuth client ID. The Google provider registers only when both ID and secret are set | `1234-abc.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | No | server | Google OAuth client secret | `GOCSPX-…` |

Callback URL to register with Google: `<origin>/api/auth/callback/google`.

## Storage

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `STORAGE_PROVIDER` | No (default `local`) | server | `local` \| `cloudinary` \| `s3`. `local` writes to `public/uploads`. `s3` currently has no adapter and falls back to local | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` | Only for `cloudinary` | server | Cloudinary account cloud name | `admission-sathi` |
| `CLOUDINARY_API_KEY` | Only for `cloudinary` | server | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Only for `cloudinary` | server | Cloudinary API secret | `abcdEFGH…` |
| `S3_REGION` | No | server | Reserved for the future S3 adapter | `ap-south-1` |
| `S3_BUCKET` | No | server | Reserved for the future S3 adapter | `admission-sathi-media` |
| `S3_ACCESS_KEY_ID` | No | server | Reserved for the future S3 adapter | `AKIA…` |
| `S3_SECRET_ACCESS_KEY` | No | server | Reserved for the future S3 adapter | `wJalr…` |
| `S3_ENDPOINT` | No | server | Custom S3-compatible endpoint (R2, MinIO) | `https://s3.ap-south-1.amazonaws.com` |

Cloudinary credentials are missing at upload time ⇒ `uploadFile` throws `Cloudinary credentials are not configured.`

## Email

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `EMAIL_PROVIDER` | No (default `console`) | server | `console` \| `resend` \| `smtp`. `console` logs instead of sending. `smtp` has no adapter yet and behaves like `console` | `resend` |
| `EMAIL_FROM` | No (default `Admission Sathi <no-reply@admissionsathi.org>`) | server | From header on outbound email | `Admission Sathi <no-reply@admissionsathi.org>` |
| `RESEND_API_KEY` | Only for `resend` | server | Resend API key; missing key makes the send fail with `RESEND_API_KEY missing` | `re_…` |
| `SMTP_HOST` | No | server | Reserved for the future SMTP adapter | `smtp.example.com` |
| `SMTP_PORT` | No | server | Coerced to a number when present | `587` |
| `SMTP_USER` | No | server | Reserved for the future SMTP adapter | `apikey` |
| `SMTP_PASSWORD` | No | server | Reserved for the future SMTP adapter | `••••••` |

## WhatsApp

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `WHATSAPP_PROVIDER` | No (default `console`) | server | `console` \| `meta` \| `gupshup`. Only `meta` (Graph API v21.0) is implemented; `gupshup` degrades to `console` | `meta` |
| `WHATSAPP_API_TOKEN` | Only for `meta` | server | Graph API access token | `EAAG…` |
| `WHATSAPP_PHONE_NUMBER_ID` | Only for `meta` | server | WhatsApp Business phone number ID used in the send URL | `102938475601234` |

## SMS

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `SMS_PROVIDER` | No (default `console`) | server | `console` \| `twilio` \| `msg91`. No live adapter is implemented yet — all values currently log to the console | `console` |
| `SMS_API_KEY` | No | server | Provider API key, for the future adapter | `••••••` |
| `SMS_SENDER_ID` | No | server | DLT-approved sender/header id | `ADMSTH` |

## Turning on real delivery

Until a provider is configured, every channel uses the console adapter: messages are
written to the log and nothing reaches a recipient. The queue still reports them as
`sent`, because the adapter succeeded — so "sent" in `/admin/notifications` means
"handed to the adapter", not "delivered".

Choosing a provider the codebase does not implement (`smtp`, `gupshup`, `twilio`,
`msg91`) silently keeps the console adapter. `adapterFor()` logs
`notification.provider_not_implemented` once per channel when that happens, which is
the only signal you will get.

### Email via Resend

1. Sign up at [resend.com](https://resend.com) and create a team.
2. **Domains → Add Domain**, enter the domain you will send from
   (`admissionsathi.org`). Resend shows a DKIM `TXT` record, an SPF `TXT` record and
   a return-path `MX`/`CNAME`.
3. Add those records at your DNS host, then press **Verify**. Propagation is usually
   minutes; some hosts need a trailing dot on the record value. See
   [Resend's add-a-domain guide](https://resend.com/docs/add-a-domain).
4. **API Keys → Create API Key**, scope it to *Sending access*, copy the `re_…`
   value — it is shown once.
5. Set:
   ```
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_...
   EMAIL_FROM=Admission Sathi <no-reply@admissionsathi.org>
   ```
   `EMAIL_FROM` must be on the verified domain or Resend rejects the send.

Before the domain verifies you can still test: Resend allows sending from
`onboarding@resend.dev`, but only to the address that owns the Resend account.

### WhatsApp via the Meta Cloud API

This is the involved one, and **business-initiated messages must use a template Meta
has approved** — free-form text is only allowed inside the 24-hour window that opens
when the user messages you first. Every message this platform sends is
business-initiated.

1. Create a Meta app at [developers.facebook.com](https://developers.facebook.com) →
   **My Apps → Create App → Business**.
2. Add the **WhatsApp** product. Meta creates a test number and a WhatsApp Business
   Account (WABA) for you.
3. Complete **Business Verification** in Meta Business Suite (needs business
   documents). Until then you are limited to a handful of test recipients you add
   manually.
4. Register your own sending number under **WhatsApp → API Setup → Add phone
   number**. It must not be active on the consumer WhatsApp app.
5. Copy the **Phone number ID** from API Setup — that is
   `WHATSAPP_PHONE_NUMBER_ID`, not the phone number itself.
6. The token shown on that screen expires in 24 hours. For production create a
   permanent one: **Business Settings → Users → System Users → Add**, give it the
   WABA asset with *Full control*, then **Generate token** with the
   `whatsapp_business_messaging` and `whatsapp_business_management` scopes.
7. Register each message template under **WhatsApp Manager → Message templates**.
   Meta templates use positional placeholders (`{{1}}`, `{{2}}`) and take up to a day
   to approve.
8. In `/admin/whatsapp-templates`, set **Provider template name** on the matching
   row to the name you registered, and make sure `availableVariables` is in the same
   order as Meta's `{{1}}`…`{{n}}`. That ordering is what `buildMetaPayload()` maps.
9. Set:
   ```
   WHATSAPP_PROVIDER=meta
   WHATSAPP_API_TOKEN=EAAG...
   WHATSAPP_PHONE_NUMBER_ID=102938475601234
   ```

Without a **Provider template name** the adapter falls back to a plain-text send,
which Meta will reject outside an open service window.

### SMS

No adapter exists. `SMS_PROVIDER` accepts `twilio` and `msg91` but both behave like
`console`. Indian SMS also needs DLT registration of the sender id and each template
before anything can be delivered, so this needs implementation plus a compliance
step.

## AI

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `AI_PROVIDER` | No (default `mock`) | server | `mock` \| `openai` \| `anthropic` \| `bedrock`. `mock` is an extractive retrieval answerer that never invents facts. `bedrock` has no adapter and falls back to `mock` | `openai` |
| `AI_MODEL` | No (default `gpt-4o-mini`) | server | Model id passed to the selected provider | `gpt-4o-mini` |
| `OPENAI_API_KEY` | Only for `openai` | server | Missing key silently falls back to the `mock` adapter | `sk-…` |
| `ANTHROPIC_API_KEY` | Only for `anthropic` | server | Missing key silently falls back to the `mock` adapter | `sk-ant-…` |

## Analytics and error tracking

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_ANALYTICS_PROVIDERS` | No (default `first-party`) | public | Comma-separated adapter list: `first-party`, `ga`, `gtm`, `meta`. Unknown ids are ignored | `first-party,ga` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No | public | GA4 measurement id; the GA script loads only when set | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_GTM_ID` | No | public | Google Tag Manager container id | `GTM-XXXXXXX` |
| `NEXT_PUBLIC_META_PIXEL_ID` | No | public | Meta Pixel id | `123456789012345` |
| `SENTRY_DSN` | No | server | When set, the server error reporter logs an extra "SDK not installed" marker. No SDK is bundled yet — see `src/lib/observability/report-server.ts` | `https://…@o0.ingest.sentry.io/0` |

The first-party collector always runs and posts to `/api/analytics/collect`; it needs no configuration.

## Caching and rate limiting

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | No | server | Enables the distributed rate limiter. Without it, limits are per-instance in-memory only | `https://eu1-xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | No | server | Upstash REST token | `AX…` |
| `REDIS_URL` | No | server | Accepted by validation but not used by any code today | `redis://default:pass@host:6379` |

## Cron

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `CRON_SECRET` | **Required in production** (validation passes without it) | server | Shared secret for authenticating scheduled invocations of the notification worker | `<32-byte random string>` |

`src/app/api/cron/notifications/route.ts` compares the `Authorization: Bearer …` header against `CRON_SECRET` in constant time. **When the variable is unset the route returns 401 to everyone, including Vercel Cron**, rather than exposing an unauthenticated worker. Queued email, WhatsApp, SMS and in-app notifications are therefore never delivered until the secret is set. Zod validation still treats it as optional, so a missing value fails at request time, not at boot — check the cron dashboard, not the startup log.

## Seed accounts (development only)

Read directly by `src/db/seeds/seed-core.ts`; not part of the Zod schema.

| Variable | Required | Scope | Purpose | Example |
| --- | --- | --- | --- | --- |
| `SEED_SUPER_ADMIN_EMAIL` | No (default `admin@admissionsathi.org`) | script | Super-admin login created by `npm run db:seed` | `admin@admissionsathi.org` |
| `SEED_SUPER_ADMIN_PASSWORD` | No (default `Admin@12345`) | script | Super-admin password | `Admin@12345` |
| `SEED_STUDENT_EMAIL` | No (default `student@admissionsathi.org`) | script | Demo student login | `student@admissionsathi.org` |
| `SEED_STUDENT_PASSWORD` | No (default `Student@12345`) | script | Demo student password | `Student@12345` |

The eight demo staff accounts (`content@`, `colleges@`, `exams@`, `predictors@`, `leads@`, `finance@`, `support@`, `analyst@admissionsathi.org`) use the hard-coded password `Staff@12345` and cannot be configured through environment variables.

## `.env.example` differences

`.env.example` is the operator-facing template, so it is a superset of the Zod schema. Variables it lists that are **not** in `src/lib/env.ts`:

| Variable | Status |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public, used by `src/config/site.ts` and `src/lib/utils.ts` |
| `NEXT_PUBLIC_ANALYTICS_PROVIDERS`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Public, used by the analytics adapters |
| `SEED_*` | Read by the seed script only |
| `NEXT_PUBLIC_SITE_NAME` | Not referenced anywhere in `src/` — the site name is a constant in `src/config/site.ts` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Not referenced anywhere in `src/` |
| `NEXT_PUBLIC_SENTRY_DSN` | Not referenced anywhere in `src/`; the client reporter detects `window.Sentry` instead |
| `AUTH_TRUST_HOST` | Not read by the app; `trustHost: true` is hard-coded in `src/lib/auth/auth.config.ts`. Auth.js may still consume it directly |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Not referenced anywhere in `src/` |

Variables used by the code but absent from `.env.example`: `MONGOOSE_DEBUG` (`src/db/connect.ts`) and `SKIP_ENV_VALIDATION` (`src/lib/env.ts`).
