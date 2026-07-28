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
};

declare global {
    // eslint-disable-next-line no-var
    var __admissionSathiMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.__admissionSathiMongoose ?? {
    conn: null,
    promise: null,
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

    // Placeholder credentials are tolerated while compiling, never for real queries.
    assertRuntimeEnv();

    if (!cache.promise) {
        cache.promise = mongoose
            .connect(env.MONGODB_URI, {
                dbName: env.MONGODB_DB_NAME,
                maxPoolSize: isProduction ? 20 : 5,
                /*
                 * Keep a couple of sockets warm. With `minPoolSize: 0` the pool is
                 * reaped while idle, so the first query after a pause pays a full
                 * TCP + TLS + auth handshake — measured at ~900ms against Atlas,
                 * which lands squarely on a user's first navigation.
                 */
                minPoolSize: 2,
                serverSelectionTimeoutMS: 10_000,
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
                return m;
            })
            .catch((error: unknown) => {
                cache.promise = null;
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
    }
}

export { mongoose };
