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

    AI_PROVIDER: z.enum(['mock', 'openai', 'anthropic', 'bedrock']).default('mock'),
    AI_MODEL: z.string().default('gpt-4o-mini'),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),

    REDIS_URL: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    CRON_SECRET: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function loadEnv(): ServerEnv {
    const parsed = serverSchema.safeParse(process.env);

    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
            .join('\n');

        // During `next build` we allow placeholders so CI can compile without live secrets.
        if (process.env.SKIP_ENV_VALIDATION === 'true') {
            // eslint-disable-next-line no-console
            console.warn(`[env] Validation skipped. Missing/invalid values:\n${issues}`);
            return serverSchema.parse({
                ...process.env,
                MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/admission-sathi',
                AUTH_SECRET: process.env.AUTH_SECRET ?? 'build-time-placeholder-secret-value',
            });
        }

        throw new Error(
            `Invalid environment configuration.\n${issues}\n\nCopy .env.example to .env.local and fill in the values.`,
        );
    }

    return parsed.data;
}

export const env: ServerEnv = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
