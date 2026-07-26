import 'server-only';
import { connectToDatabase } from '@/db/connect';
import { Redirect } from '@/db/models/site.model';
import { logger } from '@/lib/logger';

export interface ResolvedRedirect {
    destination: string;
    statusCode: 301 | 302 | 307 | 308;
    permanent: boolean;
}

/** Normalises to a lowercase, leading-slash, no-trailing-slash path. */
export function normalisePath(pathname: string): string {
    const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const trimmed = withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
    return trimmed.toLowerCase();
}

/**
 * Resolves an admin-managed redirect for a path.
 *
 * Exact (indexed, unique) matches are tried first because they cover almost
 * every real rule. Regex rules are evaluated afterwards against a bounded set
 * so a bad pattern cannot turn this into an unbounded scan.
 */
export async function resolveRedirect(pathname: string): Promise<ResolvedRedirect | null> {
    const source = normalisePath(pathname);
    if (!source || source === '/') return null;

    await connectToDatabase();

    const exact = await Redirect.findOne({ source, status: 'active', isRegex: false })
        .select({ destination: 1, statusCode: 1 })
        .lean()
        .exec();

    if (exact) {
        return {
            destination: exact.destination,
            statusCode: exact.statusCode,
            permanent: exact.statusCode === 301 || exact.statusCode === 308,
        };
    }

    const regexRules = await Redirect.find({ status: 'active', isRegex: true })
        .select({ source: 1, destination: 1, statusCode: 1 })
        .limit(200)
        .lean()
        .exec();

    for (const rule of regexRules) {
        try {
            const pattern = new RegExp(rule.source, 'i');
            if (!pattern.test(source)) continue;

            return {
                destination: source.replace(pattern, rule.destination),
                statusCode: rule.statusCode,
                permanent: rule.statusCode === 301 || rule.statusCode === 308,
            };
        } catch {
            logger.warn('redirect.invalid_regex', { source: rule.source });
        }
    }

    return null;
}

/**
 * Fire-and-forget hit counter. Never awaited by the request path so a slow
 * write cannot delay the redirect response.
 */
export function recordRedirectHit(pathname: string): void {
    const source = normalisePath(pathname);
    void Redirect.updateOne(
        { source, status: 'active' },
        { $inc: { hitCount: 1 }, $set: { lastHitAt: new Date() } },
    )
        .exec()
        .catch(() => {
            /* metrics only */
        });
}
