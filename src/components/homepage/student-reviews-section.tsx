import Link from 'next/link';
import { Quote } from 'lucide-react';
import { Badge, Card, RatingStars, SectionHeader } from '@/components/ui/primitives';
import { formatDate, initials, truncate } from '@/lib/utils';
import type { ReviewDoc } from '@/db/models/content.model';
import type { StudentReviewsConfig } from '@/schemas/homepage.schema';

/**
 * Verified student reviews.
 *
 * Social proof from the `Review` collection rather than invented testimonials —
 * every card links to the college it is about so the claim is checkable, and the
 * aggregate line states the real count instead of a rounded marketing figure.
 * Anonymous reviews are respected: the author name is never rendered for them.
 */
export function StudentReviewsSection({
    heading,
    description,
    ctaLabel,
    ctaUrl,
    reviews,
    aggregate,
    config,
}: {
    heading: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    reviews: ReviewDoc[];
    aggregate: { average: number; count: number };
    config: StudentReviewsConfig;
}) {
    if (reviews.length === 0) return null;

    return (
        <Card as="section" aria-labelledby="student-reviews-heading">
            <SectionHeader
                title={heading}
                description={description}
                ctaLabel={ctaLabel}
                ctaUrl={ctaUrl}
                compact
            />

            {config.showAggregate && aggregate.count > 0 ? (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-line bg-muted/50 px-3 py-2">
                    <RatingStars value={aggregate.average} />
                    <span className="text-[12px] text-ink-soft">
                        from <span className="font-bold text-ink">{aggregate.count.toLocaleString('en-IN')}</span> moderated
                        reviews
                    </span>
                </div>
            ) : null}

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reviews.map((review) => {
                    const author = review.isAnonymous ? 'Verified student' : (review.authorName ?? 'Student');

                    return (
                        <li key={String(review._id)}>
                            <article className="flex h-full flex-col rounded-[14px] border border-line bg-white p-3.5">
                                <Quote className="h-4 w-4 text-navy-200" aria-hidden />

                                <h3 className="mt-1.5 line-clamp-1 text-[13px] font-extrabold text-ink">
                                    {review.title}
                                </h3>
                                <p className="mt-1 line-clamp-4 text-[12px] leading-relaxed text-ink-soft">
                                    {truncate(review.reviewText, 220)}
                                </p>

                                <div className="mt-2.5 flex items-center gap-1.5">
                                    <RatingStars value={review.ratings?.overall ?? 0} size="sm" showValue={false} />
                                    <span className="text-[11px] font-bold text-ink">
                                        {(review.ratings?.overall ?? 0).toFixed(1)}
                                    </span>
                                    {/* `unverified` gets no badge: claiming verification we
                                        have not done would be the one dishonest thing on
                                        an otherwise checkable card. */}
                                    {review.verificationStatus === 'document_verified' ? (
                                        <Badge tone="green">Document verified</Badge>
                                    ) : review.verificationStatus === 'email_verified' ? (
                                        <Badge tone="teal">Email verified</Badge>
                                    ) : null}
                                </div>

                                <div className="mt-auto flex items-center gap-2 border-t border-line pt-2.5">
                                    <span
                                        aria-hidden
                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-50 text-[10.5px] font-extrabold text-navy-700"
                                    >
                                        {initials(author)}
                                    </span>
                                    {/* `min-w-0` plus `flex-1` is what lets the two truncating
                                        lines below actually truncate instead of setting the
                                        card's minimum width. */}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[11.5px] font-bold text-ink">{author}</span>
                                        <span className="block truncate text-[10.5px] text-ink-soft">
                                            {review.collegeSlug ? (
                                                <Link href={`/colleges/${review.collegeSlug}`} className="hover:text-navy-700">
                                                    {review.collegeName}
                                                </Link>
                                            ) : (
                                                review.collegeName
                                            )}
                                            {review.passingYear ? ` • Class of ${review.passingYear}` : ''}
                                        </span>
                                    </span>
                                    <span className="ml-auto shrink-0 text-[10px] text-ink-soft">
                                        {formatDate(review.createdAt, { month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </article>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
