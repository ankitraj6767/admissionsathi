import 'server-only';
import {
    aggregateApprovedReviews,
    aggregateCollegeRating,
    createReview,
    findRecentReviewByEmail,
    findReviewById,
    incrementReviewHelpful,
    listApprovedReviews,
    listReviewedColleges,
    updateReviewModeration,
    type ApprovedReviewFilters,
} from '@/db/repositories/content.repository';
import { findCollegeIdentity, setCollegeRating } from '@/db/repositories/college.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import { RATING_FIELDS, type ReviewFormInput } from '@/schemas/review.schema';
import type { ModerationStatus } from '@/config/constants';
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

/* ------------------------------- write flows ------------------------------ */

/** A student may only review the same college once inside this window. */
const DUPLICATE_WINDOW_MS = 30 * 86_400_000;

export type SubmitReviewOutcome =
    | { status: 'created'; id: string; collegeName: string; collegeSlug: string }
    | { status: 'college_not_found' }
    | { status: 'duplicate' };

/**
 * Stores a public review in the moderation queue.
 * Owns the college lookup, the denormalised college name/slug stamp and the
 * duplicate guard so the Server Action stays validation + audit only.
 */
export async function submitReview(
    input: ReviewFormInput & { userId?: string; ipHash?: string },
): Promise<SubmitReviewOutcome> {
    const college = await findCollegeIdentity(input.collegeId);
    if (!college) return { status: 'college_not_found' };

    const duplicate = await findRecentReviewByEmail(
        String(college._id),
        input.email,
        new Date(Date.now() - DUPLICATE_WINDOW_MS),
    );
    if (duplicate) return { status: 'duplicate' };

    const id = await createReview({
        college: college._id,
        collegeName: college.name,
        collegeSlug: college.slug,
        user: input.userId,
        authorName: input.isAnonymous ? 'Anonymous student' : input.authorName,
        isAnonymous: input.isAnonymous,
        email: input.email,
        courseName: input.courseName || undefined,
        passingYear: input.passingYear,
        title: input.title,
        reviewText: input.reviewText,
        pros: input.pros || undefined,
        cons: input.cons || undefined,
        ratings: input.ratings,
        verificationStatus: input.userId ? 'email_verified' : 'unverified',
        moderationStatus: 'pending',
        ipHash: input.ipHash,
        createdBy: input.userId,
    });

    return { status: 'created', id, collegeName: college.name, collegeSlug: college.slug };
}

export interface ModerateReviewInput {
    id: string;
    moderationStatus: ModerationStatus;
    moderationNote?: string;
    isFeatured?: boolean;
    moderatorId: string;
}

export interface ModeratedReview {
    id: string;
    title: string;
    collegeSlug: string;
    previousStatus: string;
}

/**
 * Applies a moderation decision and refreshes the college rating breakdown,
 * because approving or hiding a review changes the published averages.
 */
export async function moderateReview(
    input: ModerateReviewInput,
): Promise<ModeratedReview | null> {
    const review = await findReviewById(input.id);
    if (!review) return null;

    await updateReviewModeration(input.id, {
        moderationStatus: input.moderationStatus,
        moderationNote: input.moderationNote,
        moderatedBy: input.moderatorId,
        moderatedAt: new Date(),
        ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
    });

    await recomputeCollegeRating(String(review.college));

    return {
        id: String(review._id),
        title: review.title,
        collegeSlug: review.collegeSlug,
        previousStatus: review.moderationStatus,
    };
}

/**
 * Recalculates the denormalised rating breakdown from approved reviews.
 * Missing criteria collapse to 0 so a college whose last approved review was
 * hidden is reset instead of keeping a stale average.
 */
export async function recomputeCollegeRating(collegeId: string): Promise<void> {
    const stats = await aggregateCollegeRating(collegeId);

    await setCollegeRating(collegeId, {
        overall: Number((stats?.overall ?? 0).toFixed(2)),
        placement: Number((stats?.placement ?? 0).toFixed(2)),
        faculty: Number((stats?.faculty ?? 0).toFixed(2)),
        infrastructure: Number((stats?.infrastructure ?? 0).toFixed(2)),
        campusLife: Number((stats?.campusLife ?? 0).toFixed(2)),
        valueForMoney: Number((stats?.valueForMoney ?? 0).toFixed(2)),
        count: stats?.count ?? 0,
    });
}

/** Helpful votes only count on approved reviews. */
export async function markReviewHelpful(id: string): Promise<void> {
    await incrementReviewHelpful(id);
}
