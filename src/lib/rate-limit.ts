import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { env } from '@/lib/env';

/**
 * Fixed-window rate limiter.
 * Uses Upstash Redis when configured, otherwise an in-memory map.
 * The in-memory fallback is per-instance only — acceptable for development and
 * single-instance deployments; set UPSTASH_* in production.
 */
type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();

function memoryHit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const bucket = memory.get(key);

    if (!bucket || bucket.resetAt < now) {
        memory.set(key, { count: 1, resetAt: now + windowMs });
        return { success: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    bucket.count += 1;
    const success = bucket.count <= limit;
    return { success, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

async function redisHit(key: string, limit: number, windowMs: number) {
    const url = env.UPSTASH_REDIS_REST_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return memoryHit(key, limit, windowMs);

    const windowKey = `${key}:${Math.floor(Date.now() / windowMs)}`;

    try {
        const res = await fetch(`${url}/pipeline`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify([
                ['INCR', windowKey],
                ['PEXPIRE', windowKey, String(windowMs)],
            ]),
            cache: 'no-store',
        });
        if (!res.ok) return memoryHit(key, limit, windowMs);
        const data = (await res.json()) as { result: number }[];
        const count = Number(data?.[0]?.result ?? 1);
        return {
            success: count <= limit,
            remaining: Math.max(0, limit - count),
            resetAt: (Math.floor(Date.now() / windowMs) + 1) * windowMs,
        };
    } catch {
        return memoryHit(key, limit, windowMs);
    }
}

export interface RateLimitOptions {
    /** Logical bucket, e.g. `lead:create` */
    key: string;
    limit: number;
    windowSeconds: number;
    /** Optional extra discriminator (user id, email, phone). */
    identifier?: string;
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetAt: number;
    retryAfterSeconds: number;
}

/** Hashes the client IP so raw addresses are never persisted or logged. */
export async function clientFingerprint(): Promise<{ ipHash: string; userAgent: string }> {
    const h = await headers();
    const ip =
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        h.get('x-real-ip') ??
        h.get('cf-connecting-ip') ??
        '0.0.0.0';
    const userAgent = h.get('user-agent') ?? 'unknown';
    const ipHash = createHash('sha256').update(`${ip}:${env.AUTH_SECRET}`).digest('hex').slice(0, 32);
    return { ipHash, userAgent };
}

export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    const { ipHash } = await clientFingerprint();
    const bucketKey = `rl:${options.key}:${options.identifier ?? ipHash}`;
    const windowMs = options.windowSeconds * 1000;

    const result = env.UPSTASH_REDIS_REST_URL
        ? await redisHit(bucketKey, options.limit, windowMs)
        : memoryHit(bucketKey, options.limit, windowMs);

    return {
        ...result,
        retryAfterSeconds: Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
    };
}

export const RATE_LIMITS = {
    leadCreate: { key: 'lead:create', limit: 5, windowSeconds: 600 },
    bookingCreate: { key: 'booking:create', limit: 5, windowSeconds: 600 },
    contactForm: { key: 'contact:create', limit: 3, windowSeconds: 900 },
    reviewCreate: { key: 'review:create', limit: 3, windowSeconds: 3600 },
    search: { key: 'search:query', limit: 60, windowSeconds: 60 },
    predictorRun: { key: 'predictor:run', limit: 20, windowSeconds: 600 },
    aiChat: { key: 'ai:chat', limit: 15, windowSeconds: 600 },
    authSignup: { key: 'auth:signup', limit: 5, windowSeconds: 3600 },
    newsletter: { key: 'newsletter:subscribe', limit: 3, windowSeconds: 3600 },
} as const;
