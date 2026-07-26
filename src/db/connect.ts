import 'server-only';
import mongoose, { type Mongoose } from 'mongoose';
import { env, isProduction } from '@/lib/env';

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

    if (!cache.promise) {
        cache.promise = mongoose
            .connect(env.MONGODB_URI, {
                dbName: env.MONGODB_DB_NAME,
                maxPoolSize: isProduction ? 20 : 5,
                minPoolSize: 0,
                serverSelectionTimeoutMS: 10_000,
                socketTimeoutMS: 45_000,
                family: 4,
                autoIndex: !isProduction, // in production indexes are created by the migration script
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
