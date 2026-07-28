import 'server-only';
import type { NewsPostDoc } from '@/db/models/content.model';
import type { CourseCategoryDoc } from '@/db/models/course.model';
import type { PredictorDoc } from '@/db/models/predictor.model';
import { listTrendingUpdates } from '@/db/repositories/content.repository';
import { listCourseCategories, listCourses } from '@/db/repositories/course.repository';
import { listPredictors } from '@/db/repositories/predictor.repository';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';

/**
 * Cached loaders for the homepage panels.
 *
 * The homepage was issuing six uncached queries per view (categories, a 40-row
 * course page with its count, states, predictors, trending updates) for content
 * that only changes when an editor publishes something. Each loader is tagged, so
 * the existing `revalidateTag` calls in the admin actions still make an edit show
 * up immediately.
 *
 * The data cache serialises with `JSON.stringify`, which turns `Date` into a
 * string. Rather than let a component receive a string where its type says
 * `Date`, every loader that carries a date revives it on the way out — see
 * `withDates`.
 */

/** Restores `Date` instances lost to JSON serialisation in the data cache. */
function withDates<T>(rows: T[], keys: (keyof T)[]): T[] {
    return rows.map((row) => {
        const next = { ...row };
        for (const key of keys) {
            const value = next[key];
            if (typeof value === 'string') {
                next[key] = new Date(value) as T[keyof T];
            }
        }
        return next;
    });
}

interface CategoryArgs {
    featuredOnly: boolean;
    slugs?: string[];
    limit: number;
}

const loadCategories = cached(
    async (args: CategoryArgs): Promise<CourseCategoryDoc[]> =>
        listCourseCategories(args).catch(() => []),
    ['home-course-categories'],
    { tags: [CACHE_TAGS.courseCategories], revalidate: CACHE_TTL.long },
);

export async function getHomeCategories(args: CategoryArgs): Promise<CourseCategoryDoc[]> {
    return withDates(await loadCategories(args), ['createdAt', 'updatedAt']);
}

/** Course dropdown options for the hero lead form. */
export const getHomeCourseOptions = cached(
    async (): Promise<{ label: string; value: string }[]> => {
        const result = await listCourses({ pageSize: 40, sort: 'popular' }).catch(() => null);
        return (result?.items ?? []).map((course) => ({ label: course.name, value: course.slug }));
    },
    ['home-course-options'],
    { tags: [CACHE_TAGS.courses], revalidate: CACHE_TTL.long },
);

interface PredictorArgs {
    homepageOnly: boolean;
    slugs?: string[];
    limit: number;
}

/** The predictor projection is all primitives, so nothing needs reviving. */
export const getHomePredictors = cached(
    async (args: PredictorArgs): Promise<PredictorDoc[]> => listPredictors(args).catch(() => []),
    ['home-predictors'],
    { tags: [CACHE_TAGS.predictors], revalidate: CACHE_TTL.long },
);

interface TrendingArgs {
    limit: number;
    categories?: string[];
}

const loadTrending = cached(
    async (args: TrendingArgs): Promise<NewsPostDoc[]> => listTrendingUpdates(args).catch(() => []),
    ['home-trending-updates'],
    { tags: [CACHE_TAGS.trending, CACHE_TAGS.news], revalidate: CACHE_TTL.medium },
);

export async function getHomeTrendingUpdates(args: TrendingArgs): Promise<NewsPostDoc[]> {
    return withDates(await loadTrending(args), ['publishDate']);
}
