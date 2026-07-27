import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll } from 'vitest';

/**
 * Integration-test harness.
 *
 * Runs the real Mongoose models against an ephemeral in-memory MongoDB, so
 * repositories, services and Server Actions are exercised with real schema
 * validation, real indexes and real query semantics — not mocks.
 *
 * The server starts in this module's *body*, not in `beforeAll`: `src/lib/env.ts`
 * validates the environment when it is first imported, and a test file's static
 * imports are evaluated before any hook runs. Setting the variables here is the
 * only point that is guaranteed to be early enough.
 */
const server = await MongoMemoryServer.create({
    instance: { dbName: 'admission-sathi-test' },
});

process.env.MONGODB_URI = server.getUri();
process.env.MONGODB_DB_NAME = 'admission-sathi-test';
process.env.AUTH_SECRET ??= 'integration-test-secret-value';
process.env.NEXT_PUBLIC_SITE_URL ??= 'http://localhost:3000';

beforeAll(async () => {
    const { connectToDatabase } = await import('@/db/connect');
    await connectToDatabase();
}, 120_000);

/** Each test starts from an empty database so ordering can never matter. */
afterEach(async () => {
    const { mongoose } = await import('@/db/connect');
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
    const { disconnectFromDatabase } = await import('@/db/connect');
    await disconnectFromDatabase();
    await server.stop();
}, 60_000);
