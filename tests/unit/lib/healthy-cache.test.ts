import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Model } from 'mongoose';

const { entries } = vi.hoisted(() => ({ entries: new Map<string, unknown>() }));
vi.mock('next/cache', () => ({
    unstable_cache: (load: (...args: unknown[]) => Promise<unknown>, keys: string[]) =>
        async (...args: unknown[]) => {
            const key = JSON.stringify([keys, args]);
            if (entries.has(key)) return entries.get(key);
            // The real Next cache also persists only when its callback resolves.
            const result = await load(...args);
            entries.set(key, result);
            return result;
        },
}));
vi.mock('@/db/connect', () => ({ connectToDatabase: vi.fn(async () => undefined) }));
vi.mock('@/lib/env', () => ({ envPlaceholderIssues: () => [] }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));

import { cached } from '@/lib/cache';
import { markReadFailure, UncacheableRead } from '@/lib/db-read-context';
import { findLean, findOneLean } from '@/db/repositories/base.repository';

function queryModel(exec: ReturnType<typeof vi.fn>) {
    const query = {
        sort: () => query, limit: () => query, maxTimeMS: () => query,
        lean: () => query, exec,
    };
    return {
        modelName: 'Probe', find: () => query, findOne: () => query,
    } as unknown as Model<{ slug: string }>;
}

beforeEach(() => entries.clear());

describe('cache health across MongoDB outages', () => {
    it('does not cache a swallowed query timeout, even after mapping it to defaults', async () => {
        const exec = vi.fn().mockRejectedValueOnce(new Error('pool checkout timed out'))
            .mockResolvedValue([{ slug: 'recovered' }]);
        const model = queryModel(exec);
        const load = cached(async () => ({ rows: await findLean(model), title: 'Defaults' }), ['list']);

        expect(await load()).toEqual({ rows: [], title: 'Defaults' });
        expect(entries.size).toBe(0);
        expect((await load()).rows).toEqual([{ slug: 'recovered' }]);
        await load();
        expect(exec).toHaveBeenCalledTimes(2);
    });

    it('keeps legitimate empty collections and missing rows cacheable', async () => {
        const exec = vi.fn().mockResolvedValue([]);
        const load = cached(async () => findLean(queryModel(exec)), ['empty']);
        expect(await load()).toEqual([]);
        expect(await load()).toEqual([]);
        expect(exec).toHaveBeenCalledTimes(1);

        const missing = cached(async () => null, ['missing']);
        expect(await missing()).toBeNull();
        expect(entries.size).toBe(2);
    });

    it('does not turn a failed detail lookup into a cached 404', async () => {
        const exec = vi.fn().mockRejectedValueOnce(new Error('network down'))
            .mockResolvedValue({ slug: 'exists' });
        const load = cached(async () => findOneLean(queryModel(exec), { slug: 'exists' }), ['detail']);
        await expect(load()).rejects.toBeInstanceOf(UncacheableRead);
        expect(entries.size).toBe(0);
        expect(await load()).toEqual({ slug: 'exists' });
    });

    it('rejects partially failed parallel results without dropping healthy sibling caches', async () => {
        const broken = cached(async () => {
            await Promise.resolve();
            markReadFailure();
            return [];
        }, ['broken']);
        const healthy = cached(async () => ['healthy'], ['healthy']);
        const parent = cached(async () => Promise.all([broken(), healthy()]), ['parent']);
        expect(await parent()).toEqual([[], ['healthy']]);
        expect(entries.size).toBe(1);
        expect([...entries.values()]).toEqual([['healthy']]);
    });

    it('coalesces simultaneous fills for the same key, keeping distinct filters separate', async () => {
        const query = vi.fn(async (slug: string) => {
            await Promise.resolve();
            return [slug];
        });
        const load = cached(query, ['concurrent']);
        expect(await Promise.all([load('a'), load('a'), load('b')])).toEqual([['a'], ['a'], ['b']]);
        expect(query).toHaveBeenCalledTimes(2);
    });

    it('propagates programming errors instead of disguising them as empty data', async () => {
        const load = cached(async () => { throw new TypeError('bad mapping'); }, ['error']);
        await expect(load()).rejects.toThrow('bad mapping');
        expect(entries.size).toBe(0);
    });

    it('changes cache identity when the selected database changes', async () => {
        const original = process.env.MONGODB_DB_NAME;
        try {
            const query = vi.fn(async () => ['data']);
            process.env.MONGODB_DB_NAME = 'database-one';
            await cached(query, ['database-scope'])();
            process.env.MONGODB_DB_NAME = 'database-two';
            await cached(query, ['database-scope'])();
            expect(query).toHaveBeenCalledTimes(2);
        } finally {
            if (original === undefined) delete process.env.MONGODB_DB_NAME;
            else process.env.MONGODB_DB_NAME = original;
        }
    });
});
