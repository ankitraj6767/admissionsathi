import type { Metadata } from 'next';
import Link from 'next/link';
import { PenLine } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { FilterPanel } from '@/components/shared/filter-panel';
import { SortSelect } from '@/components/shared/sort-select';
import { ReviewCard } from '@/components/reviews/review-card';
import { ReviewSummaryBand } from '@/components/reviews/review-summary-band';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';
import {
    REVIEW_SORTS,
    buildReviewFilterGroups,
    getApprovedReviewSummary,
    getReviewedCollegeName,
    resolveReviewFilters,
    searchApprovedReviews,
    type ReviewsHubSearchParams,
} from '@/services/review.service';

export const revalidate = 600;

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<ReviewsHubSearchParams>;
}): Promise<Metadata> {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const collegeName = params.college ? await getReviewedCollegeName(params.college) : null;

    return buildMetadata({
        title: collegeName
            ? `${collegeName} Student Reviews — Admission Sathi`
            : page > 1
                ? `College Reviews — Page ${page}`
                : 'College Reviews by Students — Ratings, Pros & Cons',
        description:
            'Verified student reviews of Indian colleges: placements, faculty, infrastructure, campus life and value for money, with pros and cons in the students’ own words.',
        path: '/college-reviews',
    });
}

export default async function CollegeReviewsHubPage({
    searchParams,
}: {
    searchParams: Promise<ReviewsHubSearchParams>;
}) {
    const params = await searchParams;
    const filters = resolveReviewFilters(params);

    const [reviews, summary, filterGroups] = await Promise.all([
        searchApprovedReviews(filters),
        getApprovedReviewSummary(),
        buildReviewFilterGroups(),
    ]);

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'College Reviews', href: '/college-reviews' },
                    ]),
                    buildItemListJsonLd(
                        reviews.items.map((review) => ({
                            name: `${review.collegeName} — ${review.title}`,
                            url: `/colleges/${review.collegeSlug}/reviews`,
                        })),
                        'College reviews',
                    ),
                ]}
            />

            <PageHeader
                eyebrow="Student voices"
                title="College reviews by students"
                description="Moderated, first-hand reviews from students and alumni. Every review is published only after our team checks it."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'College Reviews' }]}
                actions={
                    <Button asChild variant="primary" size="sm">
                        <Link href="/colleges">
                            <PenLine className="h-4 w-4" aria-hidden />
                            Review your college
                        </Link>
                    </Button>
                }
            />

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div>
                        <FilterPanel groups={filterGroups} basePath="/college-reviews" title="Filter reviews" />
                    </div>

                    <div className="min-w-0 space-y-4">
                        <ReviewSummaryBand summary={summary} />

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[12.5px] text-ink-soft">
                                <span className="font-bold text-ink">{reviews.total.toLocaleString('en-IN')}</span>{' '}
                                review{reviews.total === 1 ? '' : 's'} match your filters
                            </p>
                            <SortSelect options={REVIEW_SORTS} basePath="/college-reviews" defaultValue="recent" />
                        </div>

                        {reviews.items.length === 0 ? (
                            <EmptyState
                                icon="Star"
                                title="No reviews match these filters"
                                description="Try a different college or lower the minimum rating. New reviews appear here as soon as they clear moderation."
                                action={
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/college-reviews">Clear filters</Link>
                                    </Button>
                                }
                            />
                        ) : (
                            <ul className="space-y-3">
                                {reviews.items.map((review) => (
                                    <li key={String(review._id)}>
                                        <ReviewCard review={review} />
                                    </li>
                                ))}
                            </ul>
                        )}

                        <Pagination
                            basePath="/college-reviews"
                            params={params as Record<string, string | undefined>}
                            page={reviews.page}
                            totalPages={reviews.totalPages}
                            total={reviews.total}
                            pageSize={reviews.pageSize}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
