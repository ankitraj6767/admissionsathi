# MongoDB recovery and navigation

## Findings (21 October 2026)

Production logs contained repeated `db.read_failed` warnings with `Timed out while
checking out a connection from connection pool`, and an Atlas server-selection
failure. The generic Atlas error mentions network access rules, but does not prove
that the allowlist caused the outage.

The repository also had three recovery defects:

- Repository helpers converted failed reads to empty lists, nulls, or zeroes.
  Cached service loaders then persisted those fallbacks for up to 1,800 seconds.
  A transient database failure could therefore outlive the actual outage.
- A successfully resolved connection promise stayed cached. Once its connection
  disconnected, the next caller could receive that old disconnected connection
  instead of making a new connection attempt.
- The browser router retained dynamic pages for five minutes and full prefetches
  for ten minutes, which could keep an outage screen visible after server recovery.

The local environment selected `admissionsathi`, an empty database. The owner
confirmed `admissionssathi` as the intended database; it contains the site's
68 colleges, 42 courses, 15 exams, settings, menus, and homepage configuration.
The local environment and configuration examples now select that database.

## Changes

`db-read-context.ts` tracks handled database failures within each cache fill using
AsyncLocalStorage. The cache callback rejects degraded results, so Next can retain
an existing good value instead of replacing it with outage defaults. Cold list
requests can still render their graceful fallback, which is returned outside the
persistent cache. Failed detail lookups reach the retryable error boundary instead
of producing a false 404. Successful empty queries remain cacheable.

Cache keys include the loader source and a hash of the database configuration.
Changing databases cannot reuse the previous database's content, and the new
namespace discards previously cached outage values. Concurrent fills for identical
arguments share their work. Failed nested reads also prevent their parent result
from being cached.

The connection cache is shared in production as well as development, retains only
an in-flight promise, and retries after a one-second failure cooldown. Production
pools keep one warm socket instead of five and allow ten sockets per instance.
Idle sockets can expire after a minute. Startup warms one socket and reports ping
failures accurately on a persistent local server. Vercel defers connection creation
until an actual database read: production startup logs showed eager warmup taking
2–7 seconds, including on routes that could otherwise use cached data. Model
collection/index creation remains explicit outside tests.

Public college, course, exam, article, and news listings have a 60-second tagged
cache. Additional public detail loaders are cached too. Filter arguments remain
part of each cache key, and editor mutations retain their tag invalidation paths.
Dynamic browser entries now refresh on navigation, and full prefetches have a
30-second freshness window instead of ten minutes.
Personal accounts, predictions, availability calculations, and booking writes
remain outside these public caches.

Independent homepage reads start together. College/course listing searches no
longer wait for unrelated facet queries. High-volume navigation, footer, category,
and card link groups fetch complete destinations on hover, keyboard focus, or
touch, rather than speculatively requesting every visible destination at once.

## Verification

- 503 unit tests, including serverless startup, connection lifecycle, database selection, cache failure
  isolation, concurrent fills, and successful empty collections.
- 385 integration tests against isolated real MongoDB instances, including an
  unexpected disconnect followed by a successful read of an existing document.
- 72 selected desktop/mobile browser checks covering listings, detail tabs,
  search, navigation drawers, authentication guards, and form validation.
- Production build and TypeScript checks passed.

The full-application recovery check starts an isolated MongoDB and production
Next server, renders a fixture college, stops MongoDB, verifies that a cached
listing stays visible, requests a previously uncached URL during the outage,
restarts MongoDB, and verifies immediate recovery at the same URL without waiting
for the cache TTL. It also checks that the detail page avoids a false 404 and
recovers successfully.

Run it with `npm run test:recovery`. MongoMemoryServer downloads a MongoDB binary
if needed. Set `MONGOMS_SYSTEM_BINARY=/path/to/mongod` to use a local binary instead.
The application under test receives an isolated database URI; no production
records are modified. Server logs are written under the ignored `.playwright/`
directory.

Local samples showed a warm colleges HTTP response improving from approximately
139 ms to 25 ms. A menu navigation with its destination prefetched completed in
approximately 87 ms, compared with an earlier observed 1,589 ms transition. These
are individual local measurements, not production guarantees; cold starts, uncached
requests, browser work, and network latency still take time. A universal 10 ms
page-load guarantee is not realistic.

## Production configuration

Confirm `MONGODB_DB_NAME=admissionssathi` in the Vercel production environment and
redeploy the new code. The connected Vercel API returned 403 for both reading the
environment settings and updating this variable, so the production value could
not be verified or changed through that connection. URI database names are now
honoured when `MONGODB_DB_NAME` is absent; an explicit setting still takes priority.

After deployment, inspect `db.read_failed` and `startup.db_warmup_failed` logs.
Persistent Atlas connectivity failures still require checking the cluster's
availability, connection limits, and network access configuration.
