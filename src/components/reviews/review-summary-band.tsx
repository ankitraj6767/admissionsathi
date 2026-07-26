import { RatingStars } from '@/components/ui/primitives';
import type { ReviewSummary } from '@/services/review.service';

/**
 * Aggregate band above the reviews list.
 * Values arrive pre-computed from the service, so no counting happens in render.
 */
export function ReviewSummaryBand({ summary }: { summary: ReviewSummary }) {
    return (
        <section
            aria-label="Rating summary"
            className="rounded-panel border border-line bg-white p-4 shadow-card"
        >
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
                <div className="text-center sm:border-r sm:border-line sm:pr-6">
                    <p className="text-[34px] font-extrabold leading-none text-navy-800">
                        {summary.average > 0 ? summary.average.toFixed(1) : '—'}
                    </p>
                    <div className="mt-1 flex justify-center">
                        <RatingStars value={summary.average} showValue={false} />
                    </div>
                    <p className="mt-1 text-[11.5px] text-ink-soft">
                        {summary.total.toLocaleString('en-IN')} approved review
                        {summary.total === 1 ? '' : 's'}
                    </p>
                </div>

                <ul className="space-y-1.5">
                    {summary.distribution.map((bucket) => (
                        <li key={bucket.rating} className="flex items-center gap-2.5">
                            <span className="w-8 shrink-0 text-[11.5px] font-semibold text-ink">{bucket.rating}★</span>
                            <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                                <span
                                    className="block h-full rounded-full bg-orange"
                                    style={{ width: `${bucket.percentage}%` }}
                                />
                            </span>
                            <span className="w-20 shrink-0 text-right text-[11px] text-ink-soft">
                                {bucket.count.toLocaleString('en-IN')} ({bucket.percentage}%)
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
