import 'server-only';
import mongoose, { type Mongoose } from 'mongoose';
import { assertRuntimeEnv, env, isProduction, isTest } from '@/lib/env';

/**
 * Cached Mongoose connection.
 *
 * Next.js clears the module registry on every hot reload in development, which would
 * otherwise create a new connection (and eventually exhaust the Atlas connection pool).
 * The cache is stored on `globalThis` so it survives reloads.
 */
type MongooseCache = {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
    lastFailureAt: number;
};

declare global {
    // eslint-disable-next-line no-var
    var __admissionSathiMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.__admissionSathiMongoose ?? {
    conn: null,
    promise: null,
    lastFailureAt: 0,
};

if (!isProduction) {
    globalThis.__admissionSathiMongoose = cache;
}

mongoose.set('strictQuery', true);
// Reject unknown keys instead of silently dropping them -> protects against mass assignment.
mongoose.set('strict', 'throw');

if (!isProduction) {
    mongoose.set('debug', process.env.MONGOOSE_DEBUG === 'true');
}

export async function connectToDatabase(): Promise<Mongoose> {
    if (cache.conn && cache.conn.connection.readyState === 1) {
        return cache.conn;
    }

    // Several repository reads often start together (for example, a listing
    // page loads facets and results in parallel). After Atlas rejects one
    // connection attempt, fail those siblings immediately during a short
    // cooldown instead of opening a new 10-second handshake for each one.
    if (cache.lastFailureAt && Date.now() - cache.lastFailureAt < 10_000) {
        throw new Error('MongoDB is temporarily unavailable; retrying shortly.');
    }

    // Placeholder credentials are tolerated while compiling, never for real queries.
    assertRuntimeEnv();

    if (!cache.promise) {
        cache.promise = mongoose
            .connect(env.MONGODB_URI, {
                dbName: env.MONGODB_DB_NAME,
                maxPoolSize: isProduction ? 20 : 5,
                /*
                 * Keep sockets warm. With `minPoolSize: 0` the pool is reaped while
                 * idle, so the first query after a pause pays a full TCP + TLS +
                 * SCRAM handshake — measured at 1.5-2s against Atlas, which lands
                 * squarely on a user's next navigation. `src/instrumentation.ts`
                 * forces these connections open at startup so no request does.
                 */
                minPoolSize: isProduction ? 5 : 3,
                connectTimeoutMS: 6_000,
                serverSelectionTimeoutMS: 6_000,
                // Never let a saturated/unreachable pool hold a page request
                // indefinitely. The repository read layer degrades gracefully
                // after this bound and logs the original failure.
                waitQueueTimeoutMS: 5_000,
                socketTimeoutMS: 45_000,
                family: 4,
                /*
                 * Index building is off against a real cluster, on for tests.
                 *
                 * Mongoose's `autoIndex` issues `createIndexes` for every one of
                 * the ~50 registered models the first time each is used. Against a
                 * shared Atlas tier those builds saturate the cluster and ordinary
                 * queries queue behind them: measured 1.5s per query with autoIndex
                 * on versus 70ms with it off, on the same connection and the same
                 * data. That was the single largest cause of slow page loads in
                 * development, so indexes are owned by `npm run db:indexes`, which
                 * is explicit, runs once and is already required for production.
                 *
                 * Tests are the exception and must keep it on: they run against a
                 * throwaway in-memory server where index builds are local and free,
                 * and several of them assert behaviour that only a unique index can
                 * produce (duplicate slug conflicts, notification dedupe keys).
                 *
                 * `MONGOOSE_AUTO_INDEX=true` opts back in — useful right after
                 * adding an index to a model, before running the migration script.
                 */
                autoIndex: isTest || process.env.MONGOOSE_AUTO_INDEX === 'true',
            })
            .then((m) => {
                // Ensure all model files are registered once the connection is live.
                cache.lastFailureAt = 0;
                return m;
            })
            .catch((error: unknown) => {
                cache.promise = null;
                cache.lastFailureAt = Date.now();
                throw error;
            });
    }

    cache.conn = await cache.promise;
    return cache.conn;
}

/** Used by scripts (seed / index migrations) to close cleanly. */
export async function disconnectFromDatabase(): Promise<void> {
    if (cache.conn) {
        await cache.conn.disconnect();
        cache.conn = null;
        cache.promise = null;
        cache.lastFailureAt = 0;
    }
}

export { mongoose };
