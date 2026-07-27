import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));
const serverOnlyStub = fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url));

/**
 * Integration suite: real Mongoose models against an in-memory MongoDB.
 *
 * Kept in its own config so `npm test` (unit) stays fast, and so these tests can
 * run single-threaded — every file owns a database server, and running them in
 * parallel would start several mongod processes at once.
 */
export default defineConfig({
    resolve: {
        alias: [
            { find: /^server-only$/, replacement: serverOnlyStub },
            { find: /^@\/(.*)$/, replacement: `${srcPath}/$1` },
        ],
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/integration/**/*.test.ts'],
        setupFiles: ['./tests/integration/setup.ts'],
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 120_000,
        clearMocks: true,
        restoreMocks: true,
    },
});
