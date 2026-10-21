import { afterEach, describe, expect, it, vi } from 'vitest';

const { connectToDatabase } = vi.hoisted(() => ({ connectToDatabase: vi.fn() }));
vi.mock('@/db/connect', () => ({ connectToDatabase }));
vi.mock('@/db/models', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));

afterEach(() => vi.unstubAllEnvs());

describe('serverless startup', () => {
    it('does not connect MongoDB before a cached Vercel request can be served', async () => {
        vi.stubEnv('NEXT_RUNTIME', 'nodejs');
        vi.stubEnv('VERCEL', '1');
        const { register } = await import('@/instrumentation');
        await register();
        expect(connectToDatabase).not.toHaveBeenCalled();
    });

    it('does not load a database in the edge runtime', async () => {
        vi.stubEnv('NEXT_RUNTIME', 'edge');
        const { register } = await import('@/instrumentation');
        await register();
        expect(connectToDatabase).not.toHaveBeenCalled();
    });

    it('retains one-socket warmup on a persistent local Node server', async () => {
        vi.stubEnv('NEXT_RUNTIME', 'nodejs');
        vi.stubEnv('VERCEL', '');
        const command = vi.fn().mockResolvedValue({ ok: 1 });
        connectToDatabase.mockResolvedValue({ connection: { db: { admin: () => ({ command }) } } });
        const { register } = await import('@/instrumentation');
        await register();
        expect(connectToDatabase).toHaveBeenCalledTimes(1);
        expect(command).toHaveBeenCalledTimes(1);
    });
});
