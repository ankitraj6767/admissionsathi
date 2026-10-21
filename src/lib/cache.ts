import 'server-only';
import { unstable_cache } from 'next/cache';
import { createHash } from 'node:crypto';
import { markReadFailure, UncacheableRead, withHealthyReads } from './db-read-context';

/**
 * Cache tags used with `revalidateTag()` after mutations.
 * Keep them coarse enough to be easy to invalidate, specific enough to avoid
 * flushing the whole site on a small edit.
 */
export const CACHE_TAGS = {
    navigation: 'navigation',
    homepage: 'homepage',
    settings: 'settings',
    courses: 'courses',
    course: (slug: string) => `course:${slug}`,
    courseCategories: 'course-categories',
    colleges: 'colleges',
    college: (slug: string) => `college:${slug}`,
    exams: 'exams',
    exam: (slug: string) => `exam:${slug}`,
    predictors: 'predictors',
    predictor: (slug: string) => `predictor:${slug}`,
    articles: 'articles',
    article: (slug: string) => `article:${slug}`,
    news: 'news',
    trending: 'trending',
    scholarships: 'scholarships',
    loanProviders: 'loan-providers',
    counsellors: 'counsellors',
    resources: 'resources',
    geo: 'geo',
    reviews: 'reviews',
    pages: 'pages',
    page: (slug: string) => `page:${slug}`,
    faqs: 'faqs',
    /**
     * Admin counters (sidebar badges, dashboard tiles, listing status chips).
     * Deliberately coarse and paired with a short TTL: these are ambient numbers
     * shown next to the real data, not values an editor acts on to the second.
     */
    adminCounts: 'admin-counts',
} as const;

export const CACHE_TTL = {
    short: 60,
    medium: 300,
    long: 1800,
    day: 86_400,
} as const;

/** A full ISO-8601 UTC timestamp, which is how `JSON.stringify` writes a `Date`. */
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;

/**
 * Restores `Date` instances that the data cache flattened into strings.
 *
 * `unstable_cache` persists values as `JSON.stringify(result)`, so a cached
 * document reads back with every `Date` as a string while its TypeScript type
 * still says `Date` — the kind of mismatch that surfaces as
 * `value.getTime is not a function` in a component far from the cache call.
 *
 * Prefer caching a plain derived shape where you can. This exists for the
 * payloads where that is not practical: a college or course detail is a document
 * plus four related result sets, and mapping all of it by hand would be both
 * verbose and easy to let drift from the models.
 *
 * Only strings that are exactly a full ISO UTC timestamp are converted, so a
 * date-like fragment inside prose or a slug is left alone.
 */
export function reviveDates<T>(value: T): T {
    if (typeof value === 'string') {
        return (ISO_TIMESTAMP.test(value) ? new Date(value) : value) as T;
    }
    if (Array.isArray(value)) {
        return value.map((item) => reviveDates(item)) as T;
    }
    // Plain objects only: anything cached has already been through JSON, so there
    // are no class instances left to walk into.
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            out[key] = reviveDates(item);
        }
        return out as T;
    }
    return value;
}

/**
 * Wraps a server-side data loader with the Next.js data cache.
 * Only use for public, non-personalised reads.
 */
export function cached<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    keyParts: string[],
    options: { tags: string[]; revalidate?: number } = { tags: [] },
) {
    // Include the original loader's source: the wrapper below has identical source
    // for every loader. Version the namespace to discard old cached outage values.
    const sourceKey = createHash('sha256').update(fn.toString()).digest('hex');
    const databaseKey = createHash('sha256')
        .update(process.env.MONGODB_URI ?? '')
        .update('\0')
        .update(process.env.MONGODB_DB_NAME ?? '')
        .digest('hex');
    const pending = new Map<string, Promise<TResult>>();
    const load = unstable_cache(async (...args: TArgs): Promise<TResult> => {
        const key = JSON.stringify(args);
        const existing = pending.get(key);
        if (existing) return existing;

        const promise = withHealthyReads(() => fn(...args));
        pending.set(key, promise);
        try {
            return await promise;
        } finally {
            pending.delete(key);
        }
    }, ['healthy-reads-v1', databaseKey, ...keyParts, sourceKey], {
        tags: options.tags,
        revalidate: options.revalidate ?? CACHE_TTL.medium,
    });

    return async (...args: TArgs): Promise<TResult> => {
        try {
            return await load(...args);
        } catch (error) {
            if (!(error instanceof UncacheableRead)) throw error;
            markReadFailure();
            // A failed lookup is not evidence that a detail page does not exist.
            // Let the retryable error boundary handle it instead of returning 404.
            if (error.fallback === null) throw error;
            // Next retains an existing good value when revalidation rejects. On a
            // cold miss, keep the page usable without persisting its empty fallback.
            return error.fallback as TResult;
        }
    };
}
