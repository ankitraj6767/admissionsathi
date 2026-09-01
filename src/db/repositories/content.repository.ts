import 'server-only';
import { Types, type FilterQuery } from 'mongoose';
import {
    Article,
    FAQ,
    NewsPost,
    Resource,
    Review,
    type ArticleDoc,
    type FaqDoc,
    type NewsPostDoc,
    type ResourceDoc,
    type ReviewDoc,
} from '@/db/models/content.model';
import { connectToDatabase } from '@/db/connect';
import { escapeRegex } from '@/lib/utils';
import {
    countDocs,
    findLean,
    findOneLean,
    listSlugRows,
    paginate,
    type SlugRow,
} from './base.repository';
import type { Paginated } from '@/types/common';

const PUBLISHED = { status: 'published' as const };

/** Published, indexable and not soft-deleted — what the sitemap may advertise. */
const SITEMAP_FILTER = {
    status: 'published',
    isDeleted: { $ne: true },
    'seo.noIndex': { $ne: true },
} as const;

export const ARTICLE_CARD_PROJECTION = {
    title: 1,
    slug: 1,
    excerpt: 1,
    category: 1,
    tags: 1,
    featuredImage: 1,
    authorName: 1,
    readingTimeMinutes: 1,
    publishedAt: 1,
    isFeatured: 1,
} as const;

/* -------------------------------- articles ------------------------------- */

export async function listArticles(filters: {
    q?: string;
    category?: string;
    tag?: string;
    featured?: boolean;
    page?: number;
    pageSize?: number;
    sort?: string;
}): Promise<Paginated<ArticleDoc>> {
    const filter: FilterQuery<ArticleDoc> = { ...PUBLISHED };
    if (filters.q) {
        const rx = new RegExp(escapeRegex(filters.q), 'i');
        filter.$or = [{ title: rx }, { excerpt: rx }, { tags: rx }];
    }
    if (filters.category) filter.category = filters.category;
    if (filters.tag) filter.tags = filters.tag;
    if (filters.featured) filter.isFeatured = true;

    return paginate<ArticleDoc>(Article, {
        filter,
        page: filters.page,
        pageSize: filters.pageSize,
        sort: filters.sort === 'popular' ? { viewCount: -1 } : { publishedAt: -1 },
        projection: ARTICLE_CARD_PROJECTION,
    });
}

export async function getArticleBySlug(slug: string): Promise<ArticleDoc | null> {
    return findOneLean<ArticleDoc>(Article, { slug, status: 'published' });
}

export async function listRelatedArticles(
    article: Pick<ArticleDoc, '_id' | 'category' | 'tags'>,
    limit = 4,
): Promise<ArticleDoc[]> {
    return findLean<ArticleDoc>(
        Article,
        {
            ...PUBLISHED,
            _id: { $ne: article._id },
            $or: [{ category: article.category }, { tags: { $in: article.tags ?? [] } }],
        },
        { sort: { publishedAt: -1 }, limit, projection: ARTICLE_CARD_PROJECTION },
    );
}

export async function listArticlesForEntity(
    field: 'relatedColleges' | 'relatedCourses' | 'relatedExams',
    entityId: string,
    limit = 4,
): Promise<ArticleDoc[]> {
    return findLean<ArticleDoc>(
        Article,
        { ...PUBLISHED, [field]: entityId },
        { sort: { publishedAt: -1 }, limit, projection: ARTICLE_CARD_PROJECTION },
    );
}

export async function articleAutocomplete(term: string, limit = 4): Promise<ArticleDoc[]> {
    const rx = new RegExp(escapeRegex(term), 'i');
    return findLean<ArticleDoc>(
        Article,
        { ...PUBLISHED, $or: [{ title: rx }, { tags: rx }] },
        { sort: { publishedAt: -1 }, limit, projection: { title: 1, slug: 1, category: 1 } },
    );
}

export async function countPublishedArticles(): Promise<number> {
    return countDocs(Article, PUBLISHED);
}

/** Best-effort page-view counter. */
export async function incrementArticleViewCount(id: string): Promise<void> {
    await connectToDatabase();
    await Article.updateOne({ _id: id }, { $inc: { viewCount: 1 } }).exec();
}

/** Indexable article slugs for the sitemap, most recently updated first. */
export async function listArticleSitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<ArticleDoc>(Article, SITEMAP_FILTER as FilterQuery<ArticleDoc>, { limit });
}

/**
 * Article passages the AI assistant may quote.
 * Keyword matching only — the assistant is never allowed to answer from anything
 * that is not published platform content.
 */
export async function searchArticlePassages(
    keywords: string[],
    limit = 3,
): Promise<Pick<ArticleDoc, 'title' | 'slug' | 'excerpt' | 'contentHtml'>[]> {
    if (keywords.length === 0) return [];
    const rx = new RegExp(keywords.map(escapeRegex).join('|'), 'i');
    return findLean<ArticleDoc>(
        Article,
        {
            status: 'published',
            isDeleted: false,
            $or: [{ title: rx }, { excerpt: rx }, { tags: rx }],
        },
        {
            sort: { publishedAt: -1 },
            limit,
            projection: { title: 1, slug: 1, excerpt: 1, contentHtml: 1 },
        },
    );
}

/* ---------------------------------- news --------------------------------- */

export async function listTrendingUpdates(options: {
    limit?: number;
    categories?: string[];
}): Promise<NewsPostDoc[]> {
    const now = new Date();
    const filter: FilterQuery<NewsPostDoc> = {
        ...PUBLISHED,
        showInTrending: true,
        publishDate: { $lte: now },
        $or: [{ expiryDate: { $gte: now } }, { expiryDate: null }, { expiryDate: { $exists: false } }],
    };
    if (options.categories?.length) filter.category = { $in: options.categories };

    return findLean<NewsPostDoc>(NewsPost, filter, {
        sort: { priority: -1, publishDate: -1 },
        limit: options.limit ?? 6,
        projection: {
            title: 1,
            slug: 1,
            summary: 1,
            category: 1,
            badge: 1,
            publishDate: 1,
            externalUrl: 1,
            internalUrl: 1,
            targetExamName: 1,
            targetStateName: 1,
        },
    });
}

export async function listNews(filters: {
    q?: string;
    category?: string;
    page?: number;
    pageSize?: number;
}): Promise<Paginated<NewsPostDoc>> {
    const filter: FilterQuery<NewsPostDoc> = { ...PUBLISHED };
    if (filters.q) {
        const rx = new RegExp(escapeRegex(filters.q), 'i');
        filter.$or = [{ title: rx }, { summary: rx }];
    }
    if (filters.category) filter.category = filters.category;

    return paginate<NewsPostDoc>(NewsPost, {
        filter,
        page: filters.page,
        pageSize: filters.pageSize,
        sort: { publishDate: -1 },
    });
}

export async function getNewsBySlug(slug: string): Promise<NewsPostDoc | null> {
    return findOneLean<NewsPostDoc>(NewsPost, { slug, status: 'published' });
}

/** Published news snippets matching the assistant's retrieval keywords. */
export async function searchNewsPassages(
    keywords: string[],
    limit = 3,
): Promise<Pick<NewsPostDoc, 'title' | 'slug' | 'summary' | 'contentHtml' | 'category' | 'publishDate'>[]> {
    if (keywords.length === 0) return [];
    const rx = new RegExp(keywords.map(escapeRegex).join('|'), 'i');
    return findLean<NewsPostDoc>(
        NewsPost,
        {
            status: 'published',
            isDeleted: false,
            $or: [{ title: rx }, { summary: rx }, { contentHtml: rx }],
        },
        {
            sort: { publishDate: -1 },
            limit,
            projection: { title: 1, slug: 1, summary: 1, contentHtml: 1, category: 1, publishDate: 1 },
        },
    );
}

/** Indexable news slugs for the sitemap, most recently updated first. */
export async function listNewsSitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<NewsPostDoc>(NewsPost, SITEMAP_FILTER as FilterQuery<NewsPostDoc>, { limit });
}

/* -------------------------------- resources ------------------------------ */

export async function listResources(filters: {
    q?: string;
    type?: string;
    examId?: string;
    year?: number;
    page?: number;
    pageSize?: number;
}): Promise<Paginated<ResourceDoc>> {
    const filter: FilterQuery<ResourceDoc> = { ...PUBLISHED };
    if (filters.q) {
        const rx = new RegExp(escapeRegex(filters.q), 'i');
        filter.$or = [{ title: rx }, { description: rx }];
    }
    if (filters.type) filter.type = filters.type;
    if (filters.examId) filter.relatedExam = filters.examId;
    if (filters.year) filter.year = filters.year;

    return paginate<ResourceDoc>(Resource, {
        filter,
        page: filters.page,
        pageSize: filters.pageSize,
        sort: { isFeatured: -1, publishedAt: -1 },
    });
}

export async function getResourceBySlug(slug: string): Promise<ResourceDoc | null> {
    return findOneLean<ResourceDoc>(Resource, { slug, status: 'published' });
}

/** Published guides, papers and preparation resources matching AI retrieval keywords. */
export async function searchResourcePassages(
    keywords: string[],
    limit = 3,
): Promise<
    Pick<
        ResourceDoc,
        | 'title'
        | 'slug'
        | 'type'
        | 'description'
        | 'contentHtml'
        | 'relatedExamName'
        | 'year'
        | 'subject'
        | 'isFree'
        | 'price'
    >[]
> {
    if (keywords.length === 0) return [];
    const rx = new RegExp(keywords.map(escapeRegex).join('|'), 'i');
    return findLean<ResourceDoc>(
        Resource,
        {
            status: 'published',
            isDeleted: false,
            $or: [{ title: rx }, { description: rx }, { contentHtml: rx }, { relatedExamName: rx }, { subject: rx }],
        },
        {
            sort: { isFeatured: -1, publishedAt: -1 },
            limit,
            projection: {
                title: 1,
                slug: 1,
                type: 1,
                description: 1,
                contentHtml: 1,
                relatedExamName: 1,
                year: 1,
                subject: 1,
                isFree: 1,
                price: 1,
            },
        },
    );
}

export async function listResourcesForExam(
    examId: string,
    type: string,
    limit = 12,
): Promise<ResourceDoc[]> {
    return findLean<ResourceDoc>(
        Resource,
        { ...PUBLISHED, relatedExam: examId, type },
        { sort: { year: -1 }, limit },
    );
}

/**
 * Resource slugs for the sitemap. The `type` comes along because each resource
 * type is published under its own listing prefix.
 */
export async function listResourceSitemapSlugs(
    limit: number,
): Promise<(SlugRow & { type?: string })[]> {
    await connectToDatabase();
    const rows = (await Resource.find(SITEMAP_FILTER as FilterQuery<ResourceDoc>)
        .select({ slug: 1, updatedAt: 1, type: 1 })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean()
        .exec()) as (SlugRow & { type?: string })[];
    return rows.filter((row) => Boolean(row?.slug));
}

/* ---------------------------------- FAQs --------------------------------- */

export async function listFaqs(scope: string, entityId?: string, limit = 20): Promise<FaqDoc[]> {
    const filter: FilterQuery<FaqDoc> = { scope, status: 'active' };
    if (entityId) filter.entityId = entityId;
    return findLean<FaqDoc>(FAQ, filter, { sort: { displayOrder: 1 }, limit });
}

/**
 * FAQ entries matching any of the given keywords, in natural collection order.
 * Used to ground AI answers in vetted answers we already publish.
 */
export async function searchFaqPassages(
    keywords: string[],
    limit = 3,
): Promise<Pick<FaqDoc, 'question' | 'answerHtml'>[]> {
    if (keywords.length === 0) return [];
    await connectToDatabase();
    const rx = new RegExp(keywords.map(escapeRegex).join('|'), 'i');
    return FAQ.find({ status: 'active', $or: [{ question: rx }, { answerHtml: rx }] })
        .select({ question: 1, answerHtml: 1, scope: 1 })
        .limit(limit)
        .lean<Pick<FaqDoc, 'question' | 'answerHtml'>[]>()
        .exec();
}

/* --------------------------------- reviews ------------------------------- */

export async function listCollegeReviews(
    collegeId: string,
    args: { page?: number; pageSize?: number; sort?: string } = {},
): Promise<Paginated<ReviewDoc>> {
    return paginate<ReviewDoc>(Review, {
        filter: { college: collegeId, moderationStatus: 'approved' },
        page: args.page,
        pageSize: args.pageSize ?? 10,
        sort:
            args.sort === 'rating-high'
                ? { 'ratings.overall': -1 }
                : args.sort === 'helpful'
                    ? { helpfulCount: -1 }
                    : { createdAt: -1 },
        projection: { email: 0, ipHash: 0 },
    });
}

export async function listRecentApprovedReviews(limit = 6): Promise<ReviewDoc[]> {
    return findLean<ReviewDoc>(
        Review,
        { moderationStatus: 'approved' },
        { sort: { createdAt: -1 }, limit, projection: { email: 0, ipHash: 0 } },
    );
}

/** Fields the cross-college reviews hub renders. Excludes PII (email, ipHash). */
export const REVIEW_CARD_PROJECTION = {
    collegeName: 1,
    collegeSlug: 1,
    authorName: 1,
    isAnonymous: 1,
    courseName: 1,
    passingYear: 1,
    title: 1,
    reviewText: 1,
    pros: 1,
    cons: 1,
    ratings: 1,
    helpfulCount: 1,
    verificationStatus: 1,
    isFeatured: 1,
    createdAt: 1,
} as const;

export interface ApprovedReviewFilters {
    collegeSlug?: string;
    minRating?: number;
    sort?: string;
    page?: number;
    pageSize?: number;
}

/**
 * Approved reviews across every college, for `/college-reviews`.
 * `hidden` is a distinct moderation status, so matching `approved` already
 * excludes hidden and rejected rows; soft-deleted rows are filtered by the plugin.
 */
export async function listApprovedReviews(
    filters: ApprovedReviewFilters = {},
): Promise<Paginated<ReviewDoc>> {
    const filter: FilterQuery<ReviewDoc> = { moderationStatus: 'approved' };
    if (filters.collegeSlug) filter.collegeSlug = filters.collegeSlug;
    if (filters.minRating) filter['ratings.overall'] = { $gte: filters.minRating };

    return paginate<ReviewDoc>(Review, {
        filter,
        page: filters.page,
        pageSize: filters.pageSize ?? 10,
        sort:
            filters.sort === 'rating-high'
                ? { 'ratings.overall': -1, createdAt: -1 }
                : filters.sort === 'helpful'
                    ? { helpfulCount: -1, createdAt: -1 }
                    : { createdAt: -1 },
        projection: REVIEW_CARD_PROJECTION,
    });
}

export interface ApprovedReviewAggregate {
    total: number;
    average: number;
    distribution: { rating: number; count: number }[];
}

/** Totals, mean rating and 1–5 star distribution over all approved reviews. */
export async function aggregateApprovedReviews(): Promise<ApprovedReviewAggregate> {
    await connectToDatabase();

    const rows = await Review.aggregate<{ _id: number; count: number; sum: number }>([
        { $match: { moderationStatus: 'approved', isDeleted: { $ne: true } } },
        {
            $group: {
                _id: { $round: ['$ratings.overall', 0] },
                count: { $sum: 1 },
                sum: { $sum: '$ratings.overall' },
            },
        },
    ]).exec();

    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const ratingSum = rows.reduce((sum, row) => sum + row.sum, 0);

    return {
        total,
        average: total > 0 ? Number((ratingSum / total).toFixed(2)) : 0,
        distribution: [5, 4, 3, 2, 1].map((rating) => ({
            rating,
            count: rows.find((row) => row._id === rating)?.count ?? 0,
        })),
    };
}

/* --------------------------- review moderation --------------------------- */

/** A review with everything the moderation flow needs (no PII projection games). */
export async function findReviewById(id: string): Promise<ReviewDoc | null> {
    return findOneLean<ReviewDoc>(Review, { _id: id } as FilterQuery<ReviewDoc>);
}

/**
 * Duplicate guard for public submissions: the same email may only review a
 * college once inside the cooling-off window.
 */
export async function findRecentReviewByEmail(
    collegeId: string,
    email: string,
    since: Date,
): Promise<ReviewDoc | null> {
    return findOneLean<ReviewDoc>(
        Review,
        { college: collegeId, email, createdAt: { $gte: since } } as FilterQuery<ReviewDoc>,
        { projection: { _id: 1 } },
    );
}

export async function createReview(values: Record<string, unknown>): Promise<string> {
    await connectToDatabase();
    const created = await Review.create(values);
    return String(created._id);
}

/**
 * Applies moderation fields. Keys passed as `undefined` are unset rather than
 * ignored, so clearing a moderation note actually clears it.
 */
export async function updateReviewModeration(
    id: string,
    values: Record<string, unknown>,
): Promise<void> {
    await connectToDatabase();

    const set: Record<string, unknown> = {};
    const unset: Record<string, ''> = {};
    for (const [key, value] of Object.entries(values)) {
        if (value === undefined) unset[key] = '';
        else set[key] = value;
    }

    await Review.updateOne({ _id: id }, {
        ...(Object.keys(set).length > 0 ? { $set: set } : {}),
        ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    }).exec();
}

/** Only approved reviews can collect helpful votes. */
export async function incrementReviewHelpful(id: string): Promise<void> {
    await connectToDatabase();
    await Review.updateOne(
        { _id: id, moderationStatus: 'approved' },
        { $inc: { helpfulCount: 1 } },
    ).exec();
}

export interface CollegeRatingStats {
    overall: number;
    placement: number;
    faculty: number;
    infrastructure: number;
    campusLife: number;
    valueForMoney: number;
    count: number;
}

/**
 * Per-criterion averages over a college's approved reviews.
 * Returns `null` when the college has no approved reviews, so the caller can
 * decide what to write instead of guessing from a zeroed row.
 */
export async function aggregateCollegeRating(
    collegeId: string,
): Promise<CollegeRatingStats | null> {
    await connectToDatabase();

    const rows = await Review.aggregate<{ _id: null } & CollegeRatingStats>([
        { $match: { college: new Types.ObjectId(collegeId), moderationStatus: 'approved' } },
        {
            $group: {
                _id: null,
                overall: { $avg: '$ratings.overall' },
                placement: { $avg: '$ratings.placement' },
                faculty: { $avg: '$ratings.faculty' },
                infrastructure: { $avg: '$ratings.infrastructure' },
                campusLife: { $avg: '$ratings.campusLife' },
                valueForMoney: { $avg: '$ratings.valueForMoney' },
                count: { $sum: 1 },
            },
        },
    ]).exec();

    return rows[0] ?? null;
}

/** Colleges that actually have approved reviews — used for the hub filter. */
export async function listReviewedColleges(
    limit = 40,
): Promise<{ slug: string; name: string; count: number }[]> {
    await connectToDatabase();

    const rows = await Review.aggregate<{ _id: string; name: string; count: number }>([
        { $match: { moderationStatus: 'approved', isDeleted: { $ne: true } } },
        { $group: { _id: '$collegeSlug', name: { $first: '$collegeName' }, count: { $sum: 1 } } },
        { $sort: { count: -1, name: 1 } },
        { $limit: Math.min(limit, 100) },
    ]).exec();

    return rows.map((row) => ({ slug: row._id, name: row.name, count: row.count }));
}

/* ------------------------- admin counts & recency ------------------------ */

export async function countArticles(filter: FilterQuery<ArticleDoc> = {}): Promise<number> {
    return countDocs<ArticleDoc>(Article, filter);
}

export async function countNews(filter: FilterQuery<NewsPostDoc> = {}): Promise<number> {
    return countDocs<NewsPostDoc>(NewsPost, filter);
}

export async function countResources(filter: FilterQuery<ResourceDoc> = {}): Promise<number> {
    return countDocs<ResourceDoc>(Resource, filter);
}

export async function countReviews(filter: FilterQuery<ReviewDoc> = {}): Promise<number> {
    return countDocs<ReviewDoc>(Review, filter);
}

/** Articles awaiting editorial action — powers the admin sidebar badge. */
export async function countDraftArticles(): Promise<number> {
    return countDocs<ArticleDoc>(Article, { status: { $in: ['draft', 'in_review'] } });
}

export async function countPendingReviews(): Promise<number> {
    return countDocs<ReviewDoc>(Review, { moderationStatus: 'pending' });
}

export async function listRecentlyUpdatedArticles(limit = 5): Promise<ArticleDoc[]> {
    return findLean<ArticleDoc>(
        Article,
        {},
        {
            sort: { updatedAt: -1 },
            limit,
            projection: { title: 1, slug: 1, status: 1, updatedAt: 1 },
        },
    );
}
