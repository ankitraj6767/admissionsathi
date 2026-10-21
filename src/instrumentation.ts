/**
 * Server startup hook. Next.js calls `register()` once per server instance,
 * before the first request is served.
 *
 * Why this exists: a fresh Node process paid roughly 3.5 seconds before it could
 * answer anything, and that cost landed on whichever page a visitor happened to
 * open first. Measured against Atlas:
 *
 *   mongoose.connect resolved      1457 ms   (SRV lookup + TLS + SCRAM auth)
 *   first admin ping                119 ms
 *   first model query              1958 ms   (handshake for a second pool socket)
 *   second model query               91 ms
 *
 * Nothing in the application was slow — the connection was simply being
 * established lazily, during a request. Warming it here moves that work to
 * startup, where no one is waiting: locally that is between `next start` printing
 * "Ready" and the first navigation, and on a serverless platform it is during
 * instance initialisation, before the request is routed in.
 *
 * Deliberately forgiving: a warmup failure must never stop the server from
 * booting. If Atlas is unreachable the first request behaves exactly as it did
 * before this file existed.
 */
export async function register(): Promise<void> {
    // The proxy/edge runtime cannot open a Mongo socket, and has no need to.
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    // A Vercel cold start runs on a visitor's request. Eagerly connecting here
    // made even data-cache hits wait 2–7 seconds and opened unnecessary pools in
    // analytics/static functions. Only a real database read should open a pool.
    if (process.env.VERCEL === '1') {
        // Populate paths still need their schemas registered on every instance.
        await import('@/db/models');
        return;
    }

    // Imported lazily so the module graph of the edge runtime stays untouched.
    const { logger } = await import('@/lib/logger');
    const started = Date.now();

    try {
        const { connectToDatabase } = await import('@/db/connect');
        // Registers every model on the connection, so no request pays for it.
        await import('@/db/models');

        const connection = await connectToDatabase();
        const db = connection.connection.db;
        if (!db) return;

        // Warm one socket without forcing four more open in every cold instance.
        // Let a failed ping reach the warning below instead of logging success.
        await db.admin().command({ ping: 1, maxTimeMS: 5_000 });

        logger.info('startup.db_warmed', { ms: Date.now() - started });
    } catch (error) {
        logger.warn('startup.db_warmup_failed', {
            ms: Date.now() - started,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
