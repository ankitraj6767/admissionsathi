import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { Badge, Card, SectionHeader } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import type { ExamDateDoc } from '@/db/models/exam.model';
import type { UpcomingDatesConfig } from '@/schemas/homepage.schema';

/** Days until a date, or null when it has passed or is missing. */
function daysUntil(value?: Date | string | null): number | null {
    if (!value) return null;
    const target = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(target.getTime())) return null;

    const diff = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
    return diff >= 0 ? diff : null;
}

/**
 * Upcoming exam and admission dates.
 *
 * The countdown is the point: a student who has missed a registration window cannot
 * be helped by any other feature on the page. Tentative dates are labelled, and the
 * copy defers to the official portal, because publishing an unqualified date that
 * later moves is worse than publishing none.
 */
export function UpcomingDatesSection({
    heading,
    description,
    ctaLabel,
    ctaUrl,
    dates,
    config,
}: {
    heading: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    dates: ExamDateDoc[];
    config: UpcomingDatesConfig;
}) {
    if (dates.length === 0) return null;

    return (
        <Card as="section" aria-labelledby="upcoming-dates-heading">
            <SectionHeader
                title={heading}
                description={description}
                ctaLabel={ctaLabel}
                ctaUrl={ctaUrl}
                compact
            />

            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {dates.map((row) => {
                    const countdown = daysUntil(row.startDate);
                    const urgent = countdown !== null && countdown <= 7;

                    return (
                        <li key={String(row._id)}>
                            <article
                                className={`flex h-full gap-3 rounded-[12px] border px-3 py-2.5 ${urgent ? 'border-orange-200 bg-orange-50/60' : 'border-line bg-muted/40'
                                    }`}
                            >
                                <span
                                    aria-hidden
                                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${urgent ? 'bg-orange text-white' : 'bg-navy-50 text-navy-700'
                                        }`}
                                >
                                    <CalendarDays className="h-4 w-4" />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-navy-700">
                                            {row.examShortName}
                                        </span>
                                        {config.showTentativeBadge && row.isTentative ? (
                                            <Badge tone="amber">Tentative</Badge>
                                        ) : null}
                                    </div>

                                    <p className="mt-0.5 line-clamp-2 text-[12.5px] font-bold leading-snug text-ink">
                                        {row.event}
                                    </p>

                                    <p className="mt-1 text-[11.5px] text-ink-soft">
                                        {formatDate(row.startDate)}
                                        {countdown !== null ? (
                                            <span className={urgent ? 'ml-1.5 font-bold text-orange-700' : 'ml-1.5 font-semibold'}>
                                                {countdown === 0 ? '• today' : `• in ${countdown} day${countdown === 1 ? '' : 's'}`}
                                            </span>
                                        ) : null}
                                    </p>
                                </div>
                            </article>
                        </li>
                    );
                })}
            </ul>

            <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
                Dates are tracked from official notifications and can change. Always confirm on the conducting body&rsquo;s
                portal before acting on one.{' '}
                <Link href="/exams" className="font-semibold text-navy-600 hover:text-orange">
                    See every exam we track
                </Link>
                .
            </p>
        </Card>
    );
}
