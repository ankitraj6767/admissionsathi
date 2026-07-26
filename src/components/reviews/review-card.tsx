import Link from 'next/link';
import { BadgeCheck, GraduationCap, ThumbsUp } from 'lucide-react';
import { Badge, RatingStars } from '@/components/ui/primitives';
import { REVIEW_SUB_RATINGS } from '@/services/review.service';
import { formatDate, truncate } from '@/lib/utils';
import type { ReviewDoc } from '@/db/models/content.model';

/** Length at which the review body is trimmed on the hub (full text lives on the college page). */
const EXCERPT_LENGTH = 420;

/**
 * One approved review, rendered for the cross-college hub.
 * Takes an already-projected plain object (no `email`/`ipHash`), so this component
 * cannot leak reviewer PII even if a caller passes a wider document.
 */
export function ReviewCard({ review }: { review: ReviewDoc }) {
    const excerpt = truncate(review.reviewText, EXCERPT_LENGTH);
    const verified = review.verificationStatus !== 'unverified';

    return (
        <article className="rounded-panel border border-line bg-white p-4 shadow-card transition-shadow hover:shadow-raised">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">College</p>
                    <h3 className="mt-0.5 text-[14px] font-extrabold leading-snug text-navy-800">
                        <Link href={`/colleges/${review.collegeSlug}`} className="hover:text-orange">
                            {review.collegeName}
                        </Link>
                    </h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {review.isFeatured ? <Badge tone="orange">Featured</Badge> : null}
                    <RatingStars value={review.ratings.overall} showValue />
                </div>
            </div>

            <p className="mt-2.5 text-[13.5px] font-extrabold text-ink">{review.title}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{excerpt}</p>

            {review.pros || review.cons ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {review.pros ? (
                        <div className="rounded-[9px] border border-green/25 bg-green-50 px-2.5 py-2">
                            <p className="text-[10.5px] font-bold uppercase tracking-wide text-green">Pros</p>
                            <p className="mt-0.5 text-[12px] leading-relaxed text-ink">{truncate(review.pros, 200)}</p>
                        </div>
                    ) : null}
                    {review.cons ? (
                        <div className="rounded-[9px] border border-orange-100 bg-orange-50 px-2.5 py-2">
                            <p className="text-[10.5px] font-bold uppercase tracking-wide text-orange-700">Cons</p>
                            <p className="mt-0.5 text-[12px] leading-relaxed text-ink">{truncate(review.cons, 200)}</p>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <dl className="mt-3 grid gap-1.5 rounded-[10px] border border-line bg-muted/50 p-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {REVIEW_SUB_RATINGS.map((field) => {
                    const value = review.ratings[field.key as keyof typeof review.ratings] ?? 0;
                    return (
                        <div key={field.key} className="flex items-center justify-between gap-2">
                            <dt className="truncate text-[11px] text-ink-soft">{field.label}</dt>
                            <dd className="flex shrink-0 items-center gap-1.5">
                                <span className="h-1.5 w-14 overflow-hidden rounded-full bg-line">
                                    <span
                                        className="block h-full rounded-full bg-navy-600"
                                        style={{ width: `${(value / 5) * 100}%` }}
                                    />
                                </span>
                                <span className="w-6 text-[11px] font-bold text-ink">{value.toFixed(1)}</span>
                            </dd>
                        </div>
                    );
                })}
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-soft">
                <span className="font-semibold text-ink">
                    {review.isAnonymous ? 'Anonymous' : review.authorName}
                </span>
                {verified ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-green-50 px-1.5 py-0.5 font-bold text-green">
                        <BadgeCheck className="h-3 w-3" aria-hidden />
                        Verified
                    </span>
                ) : null}
                {review.courseName ? (
                    <span className="inline-flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" aria-hidden />
                        {review.courseName}
                    </span>
                ) : null}
                {review.passingYear ? <span>• Batch of {review.passingYear}</span> : null}
                <span>• {formatDate(review.createdAt)}</span>
                <span className="inline-flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" aria-hidden />
                    {review.helpfulCount ?? 0} found this helpful
                </span>
            </div>
        </article>
    );
}
