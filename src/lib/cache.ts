import 'server-only';
import { unstable_cache } from 'next/cache';

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
} as const;

export const CACHE_TTL = {
    short: 60,
    medium: 300,
    long: 1800,
    day: 86_400,
} as const;

/**
 * Wraps a server-side data loader with the Next.js data cache.
 * Only use for public, non-personalised reads.
 */
export function cached<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    keyParts: string[],
    options: { tags: string[]; revalidate?: number } = { tags: [] },
) {
    return unstable_cache(fn, keyParts, {
        tags: options.tags,
        revalidate: options.revalidate ?? CACHE_TTL.medium,
    });
}
