import { NextResponse, type NextRequest } from 'next/server';
import { globalSearch, logSearchQuery } from '@/services/search.service';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { SEARCH_ENTITY_TYPES, type SearchEntityType } from '@/config/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public autocomplete endpoint.
 * A Route Handler (not a Server Action) because it is called on every keystroke
 * and must be cacheable / abortable from the client.
 */
export async function GET(request: NextRequest) {
    const term = (request.nextUrl.searchParams.get('q') ?? '').trim();
    const typeParam = request.nextUrl.searchParams.get('types');
    const anonymousId = request.nextUrl.searchParams.get('aid') ?? undefined;
    const log = request.nextUrl.searchParams.get('log') === '1';

    if (term.length < 2) {
        return NextResponse.json({ term, groups: [], total: 0, tookMs: 0 });
    }

    const limited = await rateLimit(RATE_LIMITS.search);
    if (!limited.success) {
        return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
        );
    }

    const types = typeParam
        ? (typeParam.split(',').filter((t): t is SearchEntityType =>
            (SEARCH_ENTITY_TYPES as readonly string[]).includes(t),
        ) as SearchEntityType[])
        : undefined;

    const result = await globalSearch(term, { limitPerGroup: 5, types });

    if (log) {
        void logSearchQuery({ term, resultCount: result.total, anonymousId, scope: 'autocomplete' });
    }

    return NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, max-age=20, stale-while-revalidate=60' },
    });
}
