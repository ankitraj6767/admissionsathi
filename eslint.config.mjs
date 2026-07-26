// @ts-check
/**
 * Flat ESLint config.
 * eslint-config-next v16 ships flat config arrays from its subpath exports,
 * so no FlatCompat shim is required.
 */
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
    {
        ignores: [
            '.next/**',
            'node_modules/**',
            'coverage/**',
            'playwright-report/**',
            'test-results/**',
            '.playwright/**',
            'next-env.d.ts',
        ],
    },
    ...nextCoreWebVitals,
    ...nextTypescript,
    {
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            // eslint-plugin-react-hooks v7 ships the React Compiler rules as errors.
            // The existing codebase trips 22 of them, so they are surfaced as warnings
            // for now — promote back to 'error' once the hooks are cleaned up.
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/purity': 'warn',
            'react-hooks/refs': 'warn',
            'react-hooks/immutability': 'warn',
            '@typescript-eslint/ban-ts-comment': [
                'error',
                {
                    'ts-expect-error': false,
                    'ts-ignore': true,
                    'ts-nocheck': true,
                    'ts-check': false,
                },
            ],
        },
    },
    {
        // Tests are allowed to be looser than product code.
        files: ['tests/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
];

export default config;
