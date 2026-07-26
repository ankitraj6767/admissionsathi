import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The limiter derives its bucket from the request headers, so `next/headers`
 * is stubbed with a minimal Headers-like object. No Redis is configured in the
 * test env, which keeps the in-memory fixed-window path under test.
 */
const requestHeaders = new Map<string, string>([
    ['x-forwarded-for', '203.0.113.10'],
    ['user-agent', 'vitest'],
]);

vi.mock('next/headers', () => ({
    headers: async () => ({ get: (name: string) => requestHeaders.get(name.toLowerCase()) ?? null }),
}));

const { RATE_LIMITS, clientFingerprint, rateLimit } = await import('@/lib/rate-limit');

let bucketSeq = 0;
const uniqueKey = () => `test:bucket:${Date.now()}:${(bucketSeq += 1)}`;

describe('clientFingerprint', () => {
    it('hashes the forwarded IP instead of returning it raw', async () => {
        const { ipHash, userAgent } = await clientFingerprint();
        expect(ipHash).toMatch(/^[a-f0-9]{32}$/);
        expect(ipHash).not.toContain('203.0.113.10');
        expect(userAgent).toBe('vitest');
    });

    it('is stable for the same IP and differs for another IP', async () => {
        const first = await clientFingerprint();
        const second = await clientFingerprint();
        expect(second.ipHash).toBe(first.ipHash);

        requestHeaders.set('x-forwarded-for', '198.51.100.7');
        const other = await clientFingerprint();
        requestHeaders.set('x-forwarded-for', '203.0.113.10');
        expect(other.ipHash).not.toBe(first.ipHash);
    });

    it('takes only the first hop of x-forwarded-for and falls back when absent', async () => {
        requestHeaders.set('x-forwarded-for', '203.0.113.10, 70.41.3.18');
        const chained = await clientFingerprint();
        requestHeaders.set('x-forwarded-for', '203.0.113.10');
        const direct = await clientFingerprint();
        expect(chained.ipHash).toBe(direct.ipHash);

        requestHeaders.delete('x-forwarded-for');
        requestHeaders.delete('user-agent');
        const anonymous = await clientFingerprint();
        expect(anonymous.ipHash).toMatch(/^[a-f0-9]{32}$/);
        expect(anonymous.userAgent).toBe('unknown');

        requestHeaders.set('x-forwarded-for', '203.0.113.10');
        requestHeaders.set('user-agent', 'vitest');
    });
});

describe('rateLimit', () => {
    it('allows requests up to the limit and decrements remaining', async () => {
        const key = uniqueKey();
        const first = await rateLimit({ key, limit: 3, windowSeconds: 60 });
        expect(first.success).toBe(true);
        expect(first.remaining).toBe(2);

        const second = await rateLimit({ key, limit: 3, windowSeconds: 60 });
        expect(second.success).toBe(true);
        expect(second.remaining).toBe(1);

        const third = await rateLimit({ key, limit: 3, windowSeconds: 60 });
        expect(third.success).toBe(true);
        expect(third.remaining).toBe(0);
    });

    it('denies the request that exceeds the limit and never reports negative remaining', async () => {
        const key = uniqueKey();
        await rateLimit({ key, limit: 2, windowSeconds: 60 });
        await rateLimit({ key, limit: 2, windowSeconds: 60 });

        const denied = await rateLimit({ key, limit: 2, windowSeconds: 60 });
        expect(denied.success).toBe(false);
        expect(denied.remaining).toBe(0);
        expect(denied.retryAfterSeconds).toBeGreaterThan(0);

        const stillDenied = await rateLimit({ key, limit: 2, windowSeconds: 60 });
        expect(stillDenied.success).toBe(false);
        expect(stillDenied.remaining).toBe(0);
    });

    it('keeps separate buckets per key and per identifier', async () => {
        const keyA = uniqueKey();
        const keyB = uniqueKey();

        await rateLimit({ key: keyA, limit: 1, windowSeconds: 60 });
        expect((await rateLimit({ key: keyA, limit: 1, windowSeconds: 60 })).success).toBe(false);
        expect((await rateLimit({ key: keyB, limit: 1, windowSeconds: 60 })).success).toBe(true);

        const shared = uniqueKey();
        expect(
            (await rateLimit({ key: shared, limit: 1, windowSeconds: 60, identifier: 'user-1' })).success,
        ).toBe(true);
        expect(
            (await rateLimit({ key: shared, limit: 1, windowSeconds: 60, identifier: 'user-2' })).success,
        ).toBe(true);
        expect(
            (await rateLimit({ key: shared, limit: 1, windowSeconds: 60, identifier: 'user-1' })).success,
        ).toBe(false);
    });

    it('buckets requests from different clients separately', async () => {
        const key = uniqueKey();
        expect((await rateLimit({ key, limit: 1, windowSeconds: 60 })).success).toBe(true);
        expect((await rateLimit({ key, limit: 1, windowSeconds: 60 })).success).toBe(false);

        requestHeaders.set('x-forwarded-for', '198.51.100.99');
        expect((await rateLimit({ key, limit: 1, windowSeconds: 60 })).success).toBe(true);
        requestHeaders.set('x-forwarded-for', '203.0.113.10');
    });

    it('exposes a resetAt roughly one window ahead', async () => {
        const key = uniqueKey();
        const before = Date.now();
        const result = await rateLimit({ key, limit: 5, windowSeconds: 30 });
        expect(result.resetAt).toBeGreaterThanOrEqual(before + 30_000 - 50);
        expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 30_000 + 50);
        expect(result.retryAfterSeconds).toBeLessThanOrEqual(30);
    });

    describe('window expiry', () => {
        beforeEach(() => {
            vi.useFakeTimers({ now: new Date('2025-01-01T00:00:00.000Z') });
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('resets the counter once the window has elapsed', async () => {
            const key = uniqueKey();
            expect((await rateLimit({ key, limit: 2, windowSeconds: 60 })).success).toBe(true);
            expect((await rateLimit({ key, limit: 2, windowSeconds: 60 })).success).toBe(true);
            expect((await rateLimit({ key, limit: 2, windowSeconds: 60 })).success).toBe(false);

            // still inside the window
            vi.advanceTimersByTime(59_000);
            expect((await rateLimit({ key, limit: 2, windowSeconds: 60 })).success).toBe(false);

            // window has rolled over
            vi.advanceTimersByTime(2_000);
            const fresh = await rateLimit({ key, limit: 2, windowSeconds: 60 });
            expect(fresh.success).toBe(true);
            expect(fresh.remaining).toBe(1);
        });
    });
});

describe('RATE_LIMITS presets', () => {
    it('declares a positive limit and window for every preset', () => {
        for (const preset of Object.values(RATE_LIMITS)) {
            expect(preset.key).toMatch(/^[a-z]+:[a-z]+$/);
            expect(preset.limit).toBeGreaterThan(0);
            expect(preset.windowSeconds).toBeGreaterThan(0);
        }
    });

    it('can be spread straight into rateLimit', async () => {
        const result = await rateLimit({ ...RATE_LIMITS.search, identifier: `search-${Date.now()}` });
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(RATE_LIMITS.search.limit - 1);
    });
});
