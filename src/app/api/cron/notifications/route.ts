import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { logger, newRequestId } from '@/lib/logger';
import { processNotificationQueue } from '@/services/notification.service';

/**
 * Background worker for the notification queue.
 *
 * Form submissions only *enqueue* notifications so a slow email/WhatsApp
 * provider can never block a user request. This handler drains the queue and is
 * invoked by Vercel Cron (see `vercel.json`).
 *
 * Authentication: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 * When `CRON_SECRET` is unset the route refuses to run rather than exposing an
 * unauthenticated worker endpoint — set the secret to enable it.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
    const secret = env.CRON_SECRET;
    if (!secret) return false;

    const header = request.headers.get('authorization') ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (provided.length !== secret.length) return false;

    // Constant-time compare so the endpoint does not leak the secret by timing.
    return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}

async function handle(request: NextRequest) {
    const requestId = newRequestId();

    if (!isAuthorized(request)) {
        logger.warn('cron.notifications_unauthorized', { requestId });
        return NextResponse.json(
            { ok: false, error: 'Unauthorized' },
            { status: 401, headers: { 'Cache-Control': 'no-store' } },
        );
    }

    const limitParam = Number(new URL(request.url).searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 25;

    try {
        const result = await processNotificationQueue(limit);
        logger.info('cron.notifications_processed', { requestId, ...result });
        return NextResponse.json(
            { ok: true, requestId, ...result },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        logger.error('cron.notifications_failed', {
            requestId,
            error: error instanceof Error ? error.message : String(error),
        });
        // 500 makes the platform surface the failure in the cron dashboard.
        return NextResponse.json(
            { ok: false, requestId, error: 'Queue processing failed.' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } },
        );
    }
}

export async function GET(request: NextRequest) {
    return handle(request);
}

export async function POST(request: NextRequest) {
    return handle(request);
}
