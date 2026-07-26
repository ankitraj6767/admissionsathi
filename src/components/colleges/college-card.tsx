import Image from 'next/image';
import Link from 'next/link';
import { GraduationCap, MapPin, TrendingUp } from 'lucide-react';
import { Badge, RatingStars } from '@/components/ui/primitives';
import { CollegeCardActions } from './college-card-actions';
import { formatCompactINR } from '@/lib/utils';
import type { CollegeDoc } from '@/db/models/college.model';

export interface CollegeCardData {
    id: string;
    name: string;
    shortName?: string;
    slug: string;
    logoUrl?: string;
    cityName: string;
    stateName: string;
    ownership: string;
    establishedYear?: number;
    approvals: string[];
    accreditation: string[];
    feeMin?: number;
    rating: number;
    ratingCount: number;
    nirfRank?: number;
    averagePackage?: number;
    placementPercentage?: number;
    isFeatured?: boolean;
    isVerified?: boolean;
}

export function toCollegeCard(college: CollegeDoc): CollegeCardData {
    return {
        id: String(college._id),
        name: college.name,
        shortName: college.shortName,
        slug: college.slug,
        logoUrl: college.logo?.url,
        cityName: college.cityName,
        stateName: college.stateName,
        ownership: college.ownership,
        establishedYear: college.establishedYear,
        approvals: college.approvals ?? [],
        accreditation: college.accreditation ?? [],
        feeMin: college.feeRange?.min,
        rating: college.rating?.overall ?? 0,
        ratingCount: college.rating?.count ?? 0,
        nirfRank: college.ranking?.nirfOverall,
        averagePackage: college.placement?.averagePackage,
        placementPercentage: college.placement?.placementPercentage,
        isFeatured: college.isFeatured,
        isVerified: college.isVerified,
    };
}

/** Listing card used by /colleges and every college-related landing page. */
export function CollegeCard({ college }: { college: CollegeCardData }) {
    return (
        <article className="group flex flex-col gap-3 rounded-panel border border-line bg-white p-4 shadow-card transition-all duration-300 hover:border-navy-200 hover:shadow-raised sm:flex-row">
            <div className="flex shrink-0 items-start gap-3">
                <span className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-[12px] border border-line bg-navy-50">
                    <Image
                        src={college.logoUrl ?? '/brand/college-placeholder.svg'}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 object-contain p-1"
                    />
                </span>
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="text-[14.5px] font-extrabold leading-snug text-ink">
                            <Link href={`/colleges/${college.slug}`} className="hover:text-navy-700">
                                {college.name}
                            </Link>
                        </h3>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-soft">
                            <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" aria-hidden />
                                {college.cityName}, {college.stateName}
                            </span>
                            <span aria-hidden>•</span>
                            <span>{college.ownership}</span>
                            {college.establishedYear ? (
                                <>
                                    <span aria-hidden>•</span>
                                    <span>Est. {college.establishedYear}</span>
                                </>
                            ) : null}
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <RatingStars value={college.rating} count={college.ratingCount} />
                        {college.nirfRank ? (
                            <Badge tone="navy">NIRF #{college.nirfRank}</Badge>
                        ) : null}
                    </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {college.isFeatured ? <Badge tone="solidOrange">Featured</Badge> : null}
                    {college.approvals.slice(0, 3).map((approval) => (
                        <Badge key={approval} tone="neutral">
                            {approval}
                        </Badge>
                    ))}
                    {college.accreditation.slice(0, 1).map((item) => (
                        <Badge key={item} tone="green">
                            {item}
                        </Badge>
                    ))}
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-3">
                    <div>
                        <dt className="text-[10px] uppercase tracking-wide text-ink-soft">Annual fee (from)</dt>
                        <dd className="text-[13px] font-bold text-ink">
                            {college.feeMin ? `${formatCompactINR(college.feeMin)}` : '—'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[10px] uppercase tracking-wide text-ink-soft">Avg. package</dt>
                        <dd className="flex items-center gap-1 text-[13px] font-bold text-ink">
                            {college.averagePackage ? formatCompactINR(college.averagePackage) : '—'}
                            {college.averagePackage ? (
                                <TrendingUp className="h-3 w-3 text-green" aria-hidden />
                            ) : null}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[10px] uppercase tracking-wide text-ink-soft">Placement</dt>
                        <dd className="text-[13px] font-bold text-ink">
                            {college.placementPercentage ? `${college.placementPercentage}%` : '—'}
                        </dd>
                    </div>
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                        href={`/colleges/${college.slug}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-navy px-3.5 text-[12px] font-bold text-white hover:bg-navy-800"
                    >
                        <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                        View details
                    </Link>
                    <CollegeCardActions slug={college.slug} name={college.name} id={college.id} />
                </div>
            </div>
        </article>
    );
}
