import Link from 'next/link';
import { Award, CalendarClock } from 'lucide-react';
import { Badge, Card, SectionHeader } from '@/components/ui/primitives';
import { formatCompactINR, formatDate } from '@/lib/utils';
import type { ScholarshipDoc } from '@/db/models/finance.model';

/** Days remaining before a deadline, or null when it is missing or past. */
function daysLeft(value?: Date | string | null): number | null {
    if (!value) return null;
    const target = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(target.getTime())) return null;

    const diff = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
    return diff >= 0 ? diff : null;
}

/**
 * Scholarship spotlight.
 *
 * Twenty scholarships were seeded and none of them appeared on the homepage, even
 * though "can I afford this" is the question that follows every shortlist. The
 * deadline leads each card because that is the part that expires.
 */
export function ScholarshipsSection({
    heading,
    description,
    ctaLabel,
    ctaUrl,
    scholarships,
}: {
    heading: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    scholarships: ScholarshipDoc[];
}) {
    if (scholarships.length === 0) return null;

    return (
        <Card as="section" aria-labelledby="scholarships-heading">
            <SectionHeader
                title={heading}
                description={description}
                ctaLabel={ctaLabel}
                ctaUrl={ctaUrl}
                compact
            />

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {scholarships.map((scholarship) => {
                    const remaining = daysLeft(scholarship.applicationDeadline);
                    const closingSoon = remaining !== null && remaining <= 21;

                    return (
                        <li key={String(scholarship._id)}>
                            <article className="flex h-full flex-col rounded-[14px] border border-line bg-white p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card">
                                <div className="flex items-start justify-between gap-2">
                                    <span
                                        aria-hidden
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-green-50 text-green"
                                    >
                                        <Award className="h-4 w-4" />
                                    </span>
                                    <Badge tone={scholarship.providerType === 'Government' ? 'navy' : 'purple'}>
                                        {scholarship.providerType}
                                    </Badge>
                                </div>

                                <h3 className="mt-2.5 line-clamp-2 text-[13px] font-extrabold leading-snug text-ink">
                                    <Link href={`/scholarships/${scholarship.slug}`} className="hover:text-navy-700">
                                        {scholarship.name}
                                    </Link>
                                </h3>
                                <p className="mt-0.5 truncate text-[11.5px] text-ink-soft">{scholarship.provider}</p>

                                <dl className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line pt-2.5 text-[11px]">
                                    <div>
                                        <dt className="text-ink-soft">Benefit</dt>
                                        <dd className="mt-0.5 font-bold text-green">
                                            {scholarship.amountMax ? `Up to ${formatCompactINR(scholarship.amountMax)}` : scholarship.benefitType}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="flex items-center gap-1 text-ink-soft">
                                            <CalendarClock className="h-3 w-3" aria-hidden />
                                            Deadline
                                        </dt>
                                        <dd className={`mt-0.5 font-bold ${closingSoon ? 'text-orange-700' : 'text-ink'}`}>
                                            {formatDate(scholarship.applicationDeadline)}
                                        </dd>
                                    </div>
                                </dl>

                                {closingSoon ? (
                                    <p className="mt-2 rounded-[8px] bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-700">
                                        {remaining === 0 ? 'Closes today' : `${remaining} day${remaining === 1 ? '' : 's'} left to apply`}
                                    </p>
                                ) : null}

                                <Link
                                    href={`/scholarships/${scholarship.slug}`}
                                    className="mt-auto inline-flex h-8 items-center justify-center rounded-[8px] border border-line text-[11.5px] font-bold text-navy-700 hover:border-navy-200"
                                >
                                    Eligibility &amp; apply
                                </Link>
                            </article>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
