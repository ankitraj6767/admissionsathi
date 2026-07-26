import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { recordAnalyticsEvent } from '@/services/analytics.service';
import { getCurrentActor } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const payloadSchema = z.object({
    name: z.string().min(1).max(80),
    path: z.string().max(400).optional(),
    entityType: z.string().max(40).optional(),
    entityId: z.string().max(40).optional(),
    entitySlug: z.string().max(160).optional(),
    referrer: z.string().max(400).optional(),
    anonymousId: z.string().max(80).optional(),
    sessionId: z.string().max(80).optional(),
    device: z.enum(['mobile', 'tablet', 'desktop']).optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
});

/** First-party analytics collector. Fire-and-forget: always answers 204. */
export async function POST(request: NextRequest) {
    try {
        const json = await request.json();
        const parsed = payloadSchema.safeParse(json);
        if (!parsed.success) return new NextResponse(null, { status: 204 });

        const actor = await getCurrentActor().catch(() => null);
        await recordAnalyticsEvent({ ...parsed.data, userId: actor?.id });
    } catch {
        /* never surface analytics failures to the client */
    }
    return new NextResponse(null, { status: 204 });
}
