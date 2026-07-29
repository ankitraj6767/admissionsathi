import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, IndianRupee, MapPin, TrendingUp } from 'lucide-react';
import { Badge, Card, RatingStars, SectionHeader } from '@/components/ui/primitives';
import { formatCompactINR } from '@/lib/utils';
import type { CollegeDoc } from '@/db/models/college.model';
import type { FeaturedCollegesConfig } from '@/schemas/homepage.schema';

/**
 * Featured colleges grid.
 *
 * The homepage previously showcased courses, predictors and tools but never a
 * single college, which is the thing most visitors arrive looking for. Each card is
 * a compact version of the college listing card so the two read consistently.
 */
export function FeaturedCollegesSection({
    heading,
    description,
    ctaLabel,
    ctaUrl,
    colleges,
    config,
}: {
    heading: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    colleges: CollegeDoc[];
    config: FeaturedCollegesConfig;
}) {
    if (colleges.length === 0) return null;

    return (
        <Card as="section" aria-labelledby="featured-colleges-heading">
            <SectionHeader
                title={heading}
                description={description}
                ctaLabel={ctaLabel}
                ctaUrl={ctaUrl}
                compact
            />

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {colleges.map((college) => (
                    <li key={String(college._id)}>
                        <article className="flex h-full flex-col rounded-[14px] border border-line bg-white p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card">
                            <div className="flex items-start gap-2.5">
                                {college.logo?.url ? (
                                    <Image
                                        src={college.logo.url}
                                        alt={college.logo.alt ?? `${college.name} logo`}
                                        width={40}
                                        height={40}
                                        className="h-10 w-10 shrink-0 rounded-[9px] border border-line object-contain p-0.5"
                                    />
                                ) : (
                                    <span
                                        aria-hidden
                                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-navy-50 text-[13px] font-extrabold text-navy-700"
                                    >
                                        {college.name.slice(0, 2).toUpperCase()}
                                    </span>
                                )}

                                <div className="min-w-0 flex-1">
                                    <h3 className="line-clamp-2 text-[13px] font-extrabold leading-snug text-ink">
                                        <Link href={`/colleges/${college.slug}`} className="hover:text-navy-700">
                                            {college.name}
                                        </Link>
                                    </h3>
                                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-soft">
                                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                                        <span className="truncate">
                                            {college.cityName}
                                            {college.stateName ? `, ${college.stateName}` : ''}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <Badge tone={college.ownership === 'Government' ? 'navy' : 'purple'}>
                                    {college.ownership}
                                </Badge>
                                {college.ranking?.nirfOverall ? (
                                    <Badge tone="orange">NIRF #{college.ranking.nirfOverall}</Badge>
                                ) : null}
                                {config.showRating && college.rating?.overall ? (
                                    <RatingStars value={college.rating.overall} size="sm" count={college.rating.count} />
                                ) : null}
                            </div>

                            <dl className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line pt-2.5 text-[11px]">
                                {config.showFees ? (
                                    <div>
                                        <dt className="flex items-center gap-1 text-ink-soft">
                                            <IndianRupee className="h-3 w-3" aria-hidden />
                                            Annual fee
                                        </dt>
                                        <dd className="mt-0.5 font-bold text-ink">
                                            {college.feeRange?.min ? `${formatCompactINR(college.feeRange.min)}+` : '—'}
                                        </dd>
                                    </div>
                                ) : null}
                                {config.showPlacement ? (
                                    <div>
                                        <dt className="flex items-center gap-1 text-ink-soft">
                                            <TrendingUp className="h-3 w-3" aria-hidden />
                                            Avg package
                                        </dt>
                                        <dd className="mt-0.5 font-bold text-green">
                                            {college.placement?.averagePackage
                                                ? formatCompactINR(college.placement.averagePackage)
                                                : '—'}
                                        </dd>
                                    </div>
                                ) : null}
                            </dl>

                            <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
                                <Link
                                    href={`/colleges/${college.slug}/courses`}
                                    className="text-[11.5px] font-bold text-navy-600 hover:text-orange"
                                >
                                    Courses & fees
                                </Link>
                                <Link
                                    href={`/colleges/${college.slug}`}
                                    className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-navy px-2.5 text-[11.5px] font-bold text-white hover:bg-navy-800"
                                >
                                    View
                                    <ArrowRight className="h-3 w-3" aria-hidden />
                                </Link>
                            </div>
                        </article>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
