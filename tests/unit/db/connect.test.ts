import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mongoose, assertRuntimeEnv } = vi.hoisted(() => ({
    mongoose: {
        connection: { readyState: 0 },
        set: vi.fn(), connect: vi.fn(), disconnect: vi.fn(),
    },
    assertRuntimeEnv: vi.fn(),
}));
vi.mock('mongoose', () => ({ default: mongoose }));
vi.mock('@/lib/env', () => ({
    env: { MONGODB_URI: 'mongodb://localhost/test', MONGODB_DB_NAME: 'test' },
    isProduction: true, isTest: false, assertRuntimeEnv,
}));

beforeEach(() => {
    vi.resetModules();
    delete globalThis.__admissionSathiMongoose;
    mongoose.connection.readyState = 0;
    mongoose.connect.mockReset().mockImplementation(async () => {
        await Promise.resolve();
        mongoose.connection.readyState = 1;
        return mongoose;
    });
    mongoose.disconnect.mockReset().mockImplementation(async () => {
        mongoose.connection.readyState = 0;
    });
});

describe('shared MongoDB connection lifecycle', () => {
    it('shares concurrent connection attempts and releases the completed promise', async () => {
        const { connectToDatabase } = await import('@/db/connect');
        const results = await Promise.all(Array.from({ length: 20 }, connectToDatabase));
        results.forEach(result => expect(result).toBe(mongoose));
        expect(mongoose.connect).toHaveBeenCalledTimes(1);
        expect(globalThis.__admissionSathiMongoose?.promise).toBeNull();
    });

    it('reconnects after an unexpected disconnect instead of reusing a fulfilled promise', async () => {
        const { connectToDatabase } = await import('@/db/connect');
        await connectToDatabase();
        mongoose.connection.readyState = 0;
        await connectToDatabase();
        expect(mongoose.connect).toHaveBeenCalledTimes(2);
        expect(mongoose.connection.readyState).toBe(1);
    });

    it('retries a failed handshake after a short cooldown', async () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
        const { connectToDatabase } = await import('@/db/connect');
        mongoose.connect.mockRejectedValueOnce(new Error('unavailable'));
        await expect(connectToDatabase()).rejects.toThrow('unavailable');
        await expect(connectToDatabase()).rejects.toThrow('retrying shortly');
        expect(mongoose.connect).toHaveBeenCalledTimes(1);
        now.mockReturnValue(11_001);
        await connectToDatabase();
        expect(mongoose.connect).toHaveBeenCalledTimes(2);
    });

    it('shares the connection across production module reloads', async () => {
        await (await import('@/db/connect')).connectToDatabase();
        vi.resetModules();
        await (await import('@/db/connect')).connectToDatabase();
        expect(mongoose.connect).toHaveBeenCalledTimes(1);
    });

    it('can connect again after an explicit script disconnect', async () => {
        const { connectToDatabase, disconnectFromDatabase } = await import('@/db/connect');
        await connectToDatabase();
        await disconnectFromDatabase();
        expect(globalThis.__admissionSathiMongoose?.conn).toBeNull();
        await connectToDatabase();
        expect(mongoose.connect).toHaveBeenCalledTimes(2);
    });
});
