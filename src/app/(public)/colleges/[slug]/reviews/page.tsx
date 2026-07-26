import { notFound } from 'next/navigation';
import { SectionCard } from '@/components/shared/content-blocks';
import { EmptyState, RatingStars } from '@/components/ui/primitives';
import { ReviewForm } from '@/components/colleges/review-form';
import { Pagination } from '@/components/shared/pagination';
import { getCollegeBySlug } from '@/db/repositories/college.repository';
import { listCollegeReviews } from '@/db/repositories/content.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { formatDate } from '@/lib/utils';
import { RATING_FIELDS } from '@/schemas/review.schema';

export default async function CollegeReviewsPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string; sort?: string }>;
}) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const college = await getCollegeBySlug(slug);
    if (!college) notFound();

    const reviews = toPlain(
        await listCollegeReviews(String(college._id), {
            page: Number(query.page) || 1,
            pageSize: 10,
            sort: query.sort,
        }),
    );

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
                <SectionCard
                    title="Student reviews"
                    icon="Star"
                    description={`${college.rating?.count ?? 0} approved reviews`}
                >
                    <div className="mb-4 grid gap-3 rounded-[12px] border border-line bg-muted/40 p-3 sm:grid-cols-[auto_1fr]">
                        <div className="text-center sm:pr-4">
                            <p className="text-[30px] font-extrabold leading-none text-navy-800">
                                {(college.rating?.overall ?? 0).toFixed(1)}
                            </p>
                            <RatingStars value={college.rating?.overall ?? 0} showValue={false} />
                            <p className="mt-1 text-[11px] text-ink-soft">{college.rating?.count ?? 0} reviews</p>
                        </div>
                        <dl className="grid gap-1.5 sm:grid-cols-2">
                            {RATING_FIELDS.filter((f) => f.key !== 'overall').map((field) => {
                                const value = (college.rating?.[field.key as keyof typeof college.rating] as number) ?? 0;
                                return (
                                    <div key={field.key} className="flex items-center justify-between gap-2">
                                        <dt className="text-[11.5px] text-ink-soft">{field.label}</dt>
                                        <dd className="flex items-center gap-1.5">
                                            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
                                                <span
                                                    className="block h-full rounded-full bg-navy-600"
                                                    style={{ width: `${(value / 5) * 100}%` }}
                                                />
                                            </span>
                                            <span className="w-6 text-[11.5px] font-bold text-ink">{value.toFixed(1)}</span>
                                        </dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </div>

                    {reviews.items.length === 0 ? (
                        <EmptyState
                            icon="Star"
                            title="No published reviews yet"
                            description="Be the first to share your experience — it helps other students decide."
                        />
                    ) : (
                        <ul className="space-y-3">
                            {reviews.items.map((review) => (
                                <li key={String(review._id)} className="rounded-[12px] border border-line p-3.5">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <p className="text-[13.5px] font-extrabold text-ink">{review.title}</p>
                                        <RatingStars value={review.ratings.overall} showValue />
                                    </div>
                                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{review.reviewText}</p>

                                    {review.pros || review.cons ? (
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                            {review.pros ? (
                                                <div className="rounded-[9px] border border-green/25 bg-green-50 px-2.5 py-2">
                                                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-green">Pros</p>
                                                    <p className="mt-0.5 text-[12px] text-ink">{review.pros}</p>
                                                </div>
                                            ) : null}
                                            {review.cons ? (
                                                <div className="rounded-[9px] border border-orange-100 bg-orange-50 px-2.5 py-2">
                                                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-orange-700">Cons</p>
                                                    <p className="mt-0.5 text-[12px] text-ink">{review.cons}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-soft">
                                        <span className="font-semibold text-ink">
                                            {review.isAnonymous ? 'Anonymous student' : review.authorName}
                                        </span>
                                        {review.courseName ? <span>• {review.courseName}</span> : null}
                                        {review.passingYear ? <span>• Batch of {review.passingYear}</span> : null}
                                        <span>• {formatDate(review.createdAt)}</span>
                                        {review.verificationStatus !== 'unverified' ? (
                                            <span className="rounded-pill bg-green-50 px-1.5 py-0.5 font-bold text-green">Verified</span>
                                        ) : null}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Pagination
                        className="mt-5"
                        basePath={`/colleges/${slug}/reviews`}
                        params={query as Record<string, string | undefined>}
                        page={reviews.page}
                        totalPages={reviews.totalPages}
                        total={reviews.total}
                        pageSize={reviews.pageSize}
                    />
                </SectionCard>
            </div>

            <aside>
                <SectionCard title="Write a review" icon="Pencil" description="Moderated before publishing">
                    <ReviewForm
                        collegeId={String(college._id)}
                        collegeSlug={college.slug}
                        collegeName={college.shortName ?? college.name}
                    />
                </SectionCard>
            </aside>
        </div>
    );
}
