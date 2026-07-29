import Link from 'next/link';
import Image from 'next/image';
import { Badge, Card, RatingStars, SectionHeader } from '@/components/ui/primitives';
import { initials } from '@/lib/utils';
import type { CounsellorDoc } from '@/db/models/counselling.model';
import type { CounsellorsConfig } from '@/schemas/homepage.schema';

/**
 * Counsellor line-up.
 *
 * A free-counselling offer is only credible if the people behind it are named, so
 * each card carries a real specialisation, experience and rating, and links to the
 * counsellor's own page. Booking deep-links to that counsellor rather than the
 * generic form.
 */
export function CounsellorsSection({
    heading,
    description,
    ctaLabel,
    ctaUrl,
    counsellors,
    config,
}: {
    heading: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    counsellors: CounsellorDoc[];
    config: CounsellorsConfig;
}) {
    if (counsellors.length === 0) return null;

    return (
        <Card as="section" aria-labelledby="counsellors-heading">
            <SectionHeader
                title={heading}
                description={description}
                ctaLabel={ctaLabel}
                ctaUrl={ctaUrl}
                compact
            />

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {counsellors.map((counsellor) => (
                    <li key={String(counsellor._id)}>
                        <article className="flex h-full flex-col items-start rounded-[14px] border border-line bg-white p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card">
                            {counsellor.photo?.url ? (
                                <Image
                                    src={counsellor.photo.url}
                                    alt={counsellor.photo.alt ?? counsellor.name}
                                    width={48}
                                    height={48}
                                    className="h-12 w-12 rounded-full border border-line object-cover"
                                />
                            ) : (
                                <span
                                    aria-hidden
                                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-[15px] font-extrabold text-navy-700"
                                >
                                    {initials(counsellor.name)}
                                </span>
                            )}

                            <h3 className="mt-2.5 text-[13px] font-extrabold leading-snug text-ink">
                                <Link href={`/counsellors/${counsellor.slug}`} className="hover:text-navy-700">
                                    {counsellor.name}
                                </Link>
                            </h3>
                            <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-soft">
                                {counsellor.designation ?? 'Admission counsellor'}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {config.showRating && counsellor.rating?.average ? (
                                    <RatingStars
                                        value={counsellor.rating.average}
                                        size="sm"
                                        count={counsellor.rating.count}
                                    />
                                ) : null}
                                {counsellor.experienceYears ? (
                                    <Badge tone="neutral">{counsellor.experienceYears}+ yrs</Badge>
                                ) : null}
                            </div>

                            {counsellor.specializations?.length ? (
                                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
                                    {counsellor.specializations.slice(0, 2).join(' • ')}
                                </p>
                            ) : null}

                            <Link
                                href={`/book-counselling?counsellor=${counsellor.slug}`}
                                className="mt-auto inline-flex h-8 w-full items-center justify-center rounded-[8px] bg-navy px-3 text-[11.5px] font-bold text-white hover:bg-navy-800"
                            >
                                Book a session
                            </Link>
                        </article>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
