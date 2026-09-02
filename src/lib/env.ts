import 'server-only';
import { z } from 'zod';

/**
 * Server-side environment validation.
 * Imported only from server modules — `server-only` guarantees a build error if a
 * Client Component ever pulls this file (and therefore secrets) into the browser bundle.
 */
const serverSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    MONGODB_DB_NAME: z.string().default('admission-sathi'),

    AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
    AUTH_URL: z.string().url().optional(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),

    STORAGE_PROVIDER: z.enum(['local', 'cloudinary', 's3']).default('local'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),

    EMAIL_PROVIDER: z.enum(['console', 'resend', 'smtp']).default('console'),
    EMAIL_FROM: z.string().default('Admission Sathi <no-reply@admissionsathi.org>'),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    WHATSAPP_PROVIDER: z.enum(['console', 'meta', 'gupshup']).default('console'),
    WHATSAPP_API_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),

    SMS_PROVIDER: z.enum(['console', 'twilio', 'msg91']).default('console'),
    SMS_API_KEY: z.string().optional(),
    SMS_SENDER_ID: z.string().optional(),

    AI_PROVIDER: z.enum(['mock', 'nvidia', 'openai', 'anthropic', 'bedrock']).default('mock'),
    AI_MODEL: z.string().default('gpt-4o-mini'),
    NVIDIA_API_KEY: z.string().optional(),
    NVIDIA_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
    // Keep a slow or unavailable hosted model from making the chat feel broken.
    NVIDIA_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(60_000).default(20_000),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),

    REDIS_URL: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    CRON_SECRET: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

/** Build-time placeholders. Never usable at runtime — see `assertRuntimeEnv`. */
const BUILD_PLACEHOLDER_URI = 'mongodb://127.0.0.1:27017/admission-sathi';
const BUILD_PLACEHOLDER_SECRET = 'build-time-placeholder-secret-value';

/**
 * `.env` files and dashboard-managed secrets routinely contain empty strings for
 * keys that were declared but never filled (`FOO=""`). Zod treats `''` as a real
 * value, which defeats every `.default()` and produces confusing enum errors, so
 * blank values are normalised to "absent" before parsing.
 */
function compactEnv(source: NodeJS.ProcessEnv): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(source)) {
        if (typeof value === 'string' && value.trim() !== '') out[key] = value;
    }
    return out;
}

/**
 * `next build` compiles and pre-renders modules that transitively import this file.
 * Failing the whole build because a deploy-time secret is not present locally is
 * unhelpful, so the build phase degrades to placeholders and the process exits
 * loudly on the first real request instead (`assertRuntimeEnv`).
 */
function isBuildPhase(): boolean {
    return (
        process.env.SKIP_ENV_VALIDATION === 'true' ||
        process.env.NEXT_PHASE === 'phase-production-build'
    );
}

let placeholderIssues: string[] = [];

function loadEnv(): ServerEnv {
    const raw = compactEnv(process.env);
    const parsed = serverSchema.safeParse(raw);

    if (parsed.success) return parsed.data;

    const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`);

    if (isBuildPhase()) {
        placeholderIssues = issues;
        // eslint-disable-next-line no-console
        console.warn(
            `[env] Compiling with placeholder values. Set these before deploying:\n${issues.join('\n')}`,
        );
        return serverSchema.parse({
            ...raw,
            MONGODB_URI: raw.MONGODB_URI ?? BUILD_PLACEHOLDER_URI,
            AUTH_SECRET: raw.AUTH_SECRET ?? BUILD_PLACEHOLDER_SECRET,
        });
    }

    throw new Error(
        `Invalid environment configuration.\n${issues.join('\n')}\n\nCopy .env.example to .env.local and fill in the values.`,
    );
}

export const env: ServerEnv = loadEnv();

/**
 * Guard for code paths that genuinely need real credentials (database connect,
 * auth callbacks). Placeholders survive the build but must never serve traffic.
 */
export function assertRuntimeEnv(): void {
    if (placeholderIssues.length === 0) return;
    throw new Error(
        `Environment is not configured for runtime use.\n${placeholderIssues.join('\n')}`,
    );
}

export function envPlaceholderIssues(): readonly string[] {
    return placeholderIssues;
}

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
