import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));
const serverOnlyStub = fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url));

export default defineConfig({
    resolve: {
        alias: [
            // `server-only` throws outside the react-server condition; tests run in plain node.
            { find: /^server-only$/, replacement: serverOnlyStub },
            { find: /^@\/(.*)$/, replacement: `${srcPath}/$1` },
        ],
    },
    test: {
        globals: true,
        // Node by default. Component tests opt in with a
        // `// @vitest-environment jsdom` docblock (see tests/unit/components/**).
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        exclude: ['node_modules/**', '.next/**', 'tests/e2e/**', 'coverage/**'],
        clearMocks: true,
        restoreMocks: true,
        coverage: {
            reportsDirectory: './coverage',
            include: ['src/lib/**', 'src/schemas/**', 'src/services/**'],
        },
    },
});
