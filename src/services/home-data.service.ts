import 'server-only';
import type { ArticleDoc, FaqDoc, NewsPostDoc, ReviewDoc } from '@/db/models/content.model';
import type { CollegeDoc } from '@/db/models/college.model';
import type { CounsellorDoc } from '@/db/models/counselling.model';
import type { CourseCategoryDoc } from '@/db/models/course.model';
import type { ExamDateDoc } from '@/db/models/exam.model';
import type { PredictorDoc } from '@/db/models/predictor.model';
import type { ScholarshipDoc } from '@/db/models/finance.model';
import {
    aggregateApprovedReviews,
    listApprovedReviews,
    listArticles,
    listFaqs,
    listTrendingUpdates,
} from '@/db/repositories/content.repository';
import { getCollegesBySlugs, listFeaturedColleges } from '@/db/repositories/college.repository';
import { getCounsellorBySlug, listCounsellors } from '@/db/repositories/counsellor.repository';
import { listCourseCategories, listCourses } from '@/db/repositories/course.repository';
import { listUpcomingExamDates } from '@/db/repositories/exam.repository';
import {
    getScholarshipBySlug,
    listFeaturedScholarshipRows,
} from '@/db/repositories/finance.repository';
import { listCities, listStates } from '@/db/repositories/geo.repository';
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

/* ------------------------------------------------------------------ *
 * Sections added to the homepage builder
 *
 * Same contract as the loaders above: cached, tagged with whatever an editor
 * would change, and every failure degrades to an empty list so one unavailable
 * collection cannot take the homepage down with it. The section simply does not
 * render when its list comes back empty.
 * ------------------------------------------------------------------ */

interface FeaturedCollegesArgs {
    limit: number;
    slugs?: string[];
}

const loadFeaturedColleges = cached(
    async (args: FeaturedCollegesArgs): Promise<CollegeDoc[]> => {
        // An explicit slug list is an editorial choice, so it wins over the
        // `isFeatured` flag and keeps the editor's ordering.
        if (args.slugs?.length) {
            const rows = await getCollegesBySlugs(args.slugs).catch(() => []);
            const order = new Map(args.slugs.map((slug, index) => [slug, index]));
            return rows
                .slice()
                .sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99))
                .slice(0, args.limit);
        }
        return listFeaturedColleges(args.limit).catch(() => []);
    },
    ['home-featured-colleges'],
    { tags: [CACHE_TAGS.colleges], revalidate: CACHE_TTL.long },
);

export async function getHomeFeaturedColleges(args: FeaturedCollegesArgs): Promise<CollegeDoc[]> {
    return withDates(await loadFeaturedColleges(args), ['createdAt', 'updatedAt']);
}

interface UpcomingDatesArgs {
    limit: number;
    keyDatesOnly: boolean;
}

const loadUpcomingDates = cached(
    async (args: UpcomingDatesArgs): Promise<ExamDateDoc[]> => {
        // Over-fetch, then filter, because "key dates only" is a display choice and
        // the repository query is already sorted by date.
        const rows = await listUpcomingExamDates(args.limit * 3).catch(() => []);
        const filtered = args.keyDatesOnly ? rows.filter((row) => row.isKeyDate) : rows;
        // Falling back to the unfiltered list beats an empty section when nobody has
        // flagged any key dates yet.
        return (filtered.length > 0 ? filtered : rows).slice(0, args.limit);
    },
    ['home-upcoming-dates'],
    { tags: [CACHE_TAGS.exams], revalidate: CACHE_TTL.medium },
);

export async function getHomeUpcomingDates(args: UpcomingDatesArgs): Promise<ExamDateDoc[]> {
    return withDates(await loadUpcomingDates(args), ['startDate', 'endDate']);
}

interface ScholarshipArgs {
    limit: number;
    slugs?: string[];
}

const loadHomeScholarships = cached(
    async (args: ScholarshipArgs): Promise<ScholarshipDoc[]> => {
        if (args.slugs?.length) {
            const rows = await Promise.all(args.slugs.map((slug) => getScholarshipBySlug(slug).catch(() => null)));
            return rows.filter((row): row is ScholarshipDoc => Boolean(row)).slice(0, args.limit);
        }
        return listFeaturedScholarshipRows(args.limit).catch(() => []);
    },
    ['home-scholarships'],
    { tags: [CACHE_TAGS.scholarships], revalidate: CACHE_TTL.long },
);

export async function getHomeScholarships(args: ScholarshipArgs): Promise<ScholarshipDoc[]> {
    return withDates(await loadHomeScholarships(args), ['applicationStart', 'applicationDeadline']);
}

interface ReviewArgs {
    limit: number;
    minRating: number;
}

export interface HomeReviewsData {
    reviews: ReviewDoc[];
    aggregate: { average: number; count: number };
}

const loadHomeReviews = cached(
    async (args: ReviewArgs): Promise<HomeReviewsData> => {
        const [result, aggregate] = await Promise.all([
            listApprovedReviews({
                minRating: args.minRating,
                sort: 'helpful',
                pageSize: args.limit,
            }).catch(() => null),
            aggregateApprovedReviews().catch(() => null),
        ]);

        return {
            reviews: result?.items ?? [],
            aggregate: {
                average: aggregate?.average ?? 0,
                count: aggregate?.total ?? 0,
            },
        };
    },
    ['home-reviews'],
    { tags: [CACHE_TAGS.reviews], revalidate: CACHE_TTL.medium },
);

export async function getHomeReviews(args: ReviewArgs): Promise<HomeReviewsData> {
    const data = await loadHomeReviews(args);
    return { ...data, reviews: withDates(data.reviews, ['createdAt']) };
}

interface ArticleArgs {
    limit: number;
    category?: string;
    featuredOnly: boolean;
}

const loadHomeArticles = cached(
    async (args: ArticleArgs): Promise<ArticleDoc[]> => {
        const result = await listArticles({
            category: args.category,
            featured: args.featuredOnly || undefined,
            pageSize: args.limit,
        }).catch(() => null);

        // A featured-only filter that matches nothing would leave a heading with no
        // cards under it, so fall back to the newest articles.
        if (result && result.items.length > 0) return result.items;
        if (!args.featuredOnly && !args.category) return [];

        const fallback = await listArticles({ pageSize: args.limit }).catch(() => null);
        return fallback?.items ?? [];
    },
    ['home-articles'],
    { tags: [CACHE_TAGS.articles], revalidate: CACHE_TTL.medium },
);

export async function getHomeArticles(args: ArticleArgs): Promise<ArticleDoc[]> {
    return withDates(await loadHomeArticles(args), ['publishedAt']);
}

interface CounsellorArgs {
    limit: number;
    slugs?: string[];
}

const loadHomeCounsellors = cached(
    async (args: CounsellorArgs): Promise<CounsellorDoc[]> => {
        if (args.slugs?.length) {
            const rows = await Promise.all(args.slugs.map((slug) => getCounsellorBySlug(slug).catch(() => null)));
            return rows.filter((row): row is CounsellorDoc => Boolean(row)).slice(0, args.limit);
        }
        // Featured first, then top up from the general list so the row is never
        // half-empty just because nobody has been flagged.
        const featured = await listCounsellors({ limit: args.limit, featuredOnly: true }).catch(() => []);
        if (featured.length >= args.limit) return featured;

        const rest = await listCounsellors({ limit: args.limit * 2 }).catch(() => []);
        const seen = new Set(featured.map((row) => String(row._id)));
        return [...featured, ...rest.filter((row) => !seen.has(String(row._id)))].slice(0, args.limit);
    },
    ['home-counsellors'],
    { tags: [CACHE_TAGS.counsellors], revalidate: CACHE_TTL.long },
);

export async function getHomeCounsellors(args: CounsellorArgs): Promise<CounsellorDoc[]> {
    return withDates(await loadHomeCounsellors(args), ['createdAt', 'updatedAt']);
}

interface FaqArgs {
    limit: number;
    scope: string;
}

/**
 * Homepage FAQs.
 *
 * Tries the configured scope first and falls back to `global`, so an editor can
 * curate a homepage-specific set without having to before the section works.
 */
export const getHomeFaqs = cached(
    async (args: FaqArgs): Promise<FaqDoc[]> => {
        const scoped = await listFaqs(args.scope, undefined, args.limit).catch(() => []);
        if (scoped.length > 0) return scoped;
        if (args.scope === 'global') return [];
        return listFaqs('global', undefined, args.limit).catch(() => []);
    },
    ['home-faqs'],
    { tags: [CACHE_TAGS.faqs], revalidate: CACHE_TTL.long },
);

export interface DirectoryGeoLinks {
    states: { name: string; slug: string; collegeCount: number }[];
    cities: { name: string; slug: string; collegeCount: number }[];
}

/** Live geography for the directory block, so the link list tracks the catalogue. */
export const getHomeDirectoryGeo = cached(
    async (args: { stateLimit: number; cityLimit: number }): Promise<DirectoryGeoLinks> => {
        const [states, cities] = await Promise.all([
            args.stateLimit > 0
                ? listStates({ featuredOnly: true, limit: args.stateLimit }).catch(() => [])
                : Promise.resolve([]),
            args.cityLimit > 0
                ? listCities({ featuredOnly: true, limit: args.cityLimit }).catch(() => [])
                : Promise.resolve([]),
        ]);

        return {
            states: states.map((s) => ({ name: s.name, slug: s.slug, collegeCount: s.collegeCount })),
            // A city with nothing published would link to an empty listing.
            cities: cities
                .filter((c) => c.collegeCount > 0)
                .map((c) => ({ name: c.name, slug: c.slug, collegeCount: c.collegeCount })),
        };
    },
    ['home-directory-geo'],
    { tags: [CACHE_TAGS.geo], revalidate: CACHE_TTL.long },
);
