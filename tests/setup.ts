/**
 * Global test setup.
 *
 * Environment variables are assigned FIRST so that any module importing
 * `@/lib/env` (which validates `process.env` at import time via zod) sees a
 * complete, valid configuration. Values are dummies — no test touches a real
 * database, mail provider or third-party API.
 */
const testEnv: Record<string, string> = {
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/admissionsathi-test',
    MONGODB_DB_NAME: 'admissionsathi-test',
    // env.ts requires >= 16 chars; this is 48.
    AUTH_SECRET: 'test-auth-secret-value-0123456789-abcdefghijkl',
    AUTH_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    STORAGE_PROVIDER: 'local',
    EMAIL_PROVIDER: 'console',
    EMAIL_FROM: 'Admission Sathi <no-reply@admissionsathi.test>',
    WHATSAPP_PROVIDER: 'console',
    SMS_PROVIDER: 'console',
    AI_PROVIDER: 'mock',
    AI_MODEL: 'gpt-4o-mini',
};

for (const [key, value] of Object.entries(testEnv)) {
    if (!process.env[key]) process.env[key] = value;
}

// Never let a stale Upstash/Redis config make the rate limiter hit the network.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.REDIS_URL;

await import('@testing-library/jest-dom/vitest');

export { };
