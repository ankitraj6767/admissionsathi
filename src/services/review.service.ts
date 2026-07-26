import 'server-only';
import {
    aggregateApprovedReviews,
    listApprovedReviews,
    listReviewedColleges,
    type ApprovedReviewFilters,
} from '@/db/repositories/content.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import { RATING_FIELDS } from '@/schemas/review.schema';
import type { FilterGroup } from '@/components/shared/filter-panel';
import type { ReviewDoc } from '@/db/models/content.model';
import type { Paginated, SortOption } from '@/types/common';

export const REVIEW_SORTS: SortOption[] = [
    { label: 'Most recent', value: 'recent' },
    { label: 'Highest rated', value: 'rating-high' },
    { label: 'Most helpful', value: 'helpful' },
];

/** Sub-ratings shown on a review card (overall is rendered separately). */
export const REVIEW_SUB_RATINGS = RATING_FIELDS.filter((field) => field.key !== 'overall');

export interface ReviewsHubSearchParams {
    college?: string;
    rating?: string;
    sort?: string;
    page?: string;
}

/**
 * Normalises untrusted `searchParams` into repository filters.
 * Kept in the service so the page never builds a query itself and cannot leak an
 * unbounded read or an unexpected sort key into Mongo.
 */
export function resolveReviewFilters(params: ReviewsHubSearchParams): ApprovedReviewFilters {
    const rating = Number(params.rating);
    const sort = REVIEW_SORTS.some((option) => option.value === params.sort) ? params.sort : 'recent';

    return {
        collegeSlug: params.college?.trim().slice(0, 160) || undefined,
        minRating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
        sort,
        page: Math.max(1, Number(params.page) || 1),
        pageSize: 10,
    };
}

/** Paginated approved reviews across all colleges (never cached — page-specific). */
export async function searchApprovedReviews(
    filters: ApprovedReviewFilters,
): Promise<Paginated<ReviewDoc>> {
    return toPlain(await listApprovedReviews(filters));
}

export interface ReviewSummary {
    total: number;
    average: number;
    distribution: { rating: number; count: number; percentage: number }[];
}

/**
 * Aggregate band shown above the reviews list.
 * Computed here (not in the component) so the percentages come from one query
 * over every approved review rather than the current page of results.
 */
export const getApprovedReviewSummary = cached(
    async (): Promise<ReviewSummary> => {
        const stats = await aggregateApprovedReviews();
        return {
            total: stats.total,
            average: stats.average,
            distribution: stats.distribution.map((bucket) => ({
                ...bucket,
                percentage: stats.total > 0 ? Math.round((bucket.count / stats.total) * 100) : 0,
            })),
        };
    },
    ['review-summary'],
    { tags: [CACHE_TAGS.reviews], revalidate: CACHE_TTL.medium },
);

/** Filter groups for the reviews hub (college + minimum rating). */
export const buildReviewFilterGroups = cached(
    async (): Promise<FilterGroup[]> => {
        const colleges = await listReviewedColleges(40);
        return [
            {
                key: 'college',
                label: 'College',
                type: 'select',
                options: colleges.map((college) => ({
                    label: college.name,
                    value: college.slug,
                    count: college.count,
                })),
            },
            {
                key: 'rating',
                label: 'Minimum rating',
                type: 'radio',
                options: [
                    { label: '4★ and above', value: '4' },
                    { label: '3★ and above', value: '3' },
                    { label: '2★ and above', value: '2' },
                ],
            },
        ];
    },
    ['review-filter-groups'],
    { tags: [CACHE_TAGS.reviews], revalidate: CACHE_TTL.long },
);

/** Resolves a college slug to its display name for headings and metadata. */
export const getReviewedCollegeName = cached(
    async (slug: string): Promise<string | null> => {
        const colleges = await listReviewedColleges(100);
        return colleges.find((college) => college.slug === slug)?.name ?? null;
    },
    ['reviewed-college-name'],
    { tags: [CACHE_TAGS.reviews], revalidate: CACHE_TTL.long },
);
