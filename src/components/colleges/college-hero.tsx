import Image from 'next/image';
import Link from 'next/link';
import { Award, Building2, CalendarDays, Download, Globe, MapPin, Users } from 'lucide-react';
import { Badge, RatingStars } from '@/components/ui/primitives';
import { Breadcrumbs } from '@/components/shared/page-header';
import { SafeLink } from '@/components/shared/safe-link';
import { safeWebUrl } from '@/lib/url';
import { CollegeCardActions } from './college-card-actions';
import { CollegeTabs } from './college-tabs';
import { formatCompactINR } from '@/lib/utils';
import { PageBannerImage } from '@/components/shared/page-banner-image';
import type { CollegeDoc } from '@/db/models/college.model';

export function CollegeHero({ college }: { college: CollegeDoc }) {
    const base = `/colleges/${college.slug}`;

    const seededStockBanner =
        college.banner?.url.startsWith('https://images.unsplash.com/photo-') &&
        !college.banner.mediaId &&
        college.banner.alt === `${college.name} campus`;
    const banner = college.banner?.url && !seededStockBanner ? college.banner.url : '/brand/page-banners/campus-natural.webp';
    const websiteHref = safeWebUrl(college.contact?.website);

    return (
        <section className="relative isolate overflow-hidden border-b border-white/30 text-[#142b3e] lg:flex lg:min-h-[542px] lg:flex-col">
            <PageBannerImage src={banner} priority sizes="100vw" className="object-[72%_32%] md:object-[center_28%]" />

            <div className="relative shell py-6 lg:flex lg:flex-1 lg:flex-col lg:justify-end">
                <Breadcrumbs
                    tone="light"
                    className="banner-breadcrumb-panel banner-breadcrumbs-on-photo mb-4"
                    items={[
                        { label: 'Home', href: '/' },
                        { label: 'Colleges', href: '/colleges' },
                        { label: college.stateName, href: `/colleges/state/${college.stateName.toLowerCase().replace(/\s+/g, '-')}` },
                        { label: college.shortName ?? college.name },
                    ]}
                />

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="banner-copy-panel flex min-w-0 gap-4">
                        <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[#e8e0d5] bg-white">
                            <Image
                                src={college.logo?.url ?? '/brand/college-placeholder.svg'}
                                alt=""
                                width={64}
                                height={64}
                                className="h-16 w-16 object-contain p-1.5"
                            />
                        </span>

                        <div className="banner-copy-on-photo min-w-0">
                            <h1 className="font-display text-[22px] font-extrabold leading-tight text-[#142b3e] md:text-[26px]">
                                {college.name}
                            </h1>

                            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-[#334b5f]">
                                <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-orange-700" aria-hidden />
                                    {college.cityName}, {college.stateName}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5 text-orange-700" aria-hidden />
                                    {college.ownership}
                                </span>
                                {college.establishedYear ? (
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5 text-orange-700" aria-hidden />
                                        Est. {college.establishedYear}
                                    </span>
                                ) : null}
                                {college.totalStudents ? (
                                    <span className="inline-flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5 text-orange-700" aria-hidden />
                                        {college.totalStudents.toLocaleString('en-IN')} students
                                    </span>
                                ) : null}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-pill border border-[#e8e0d5] bg-[#fffdf7] px-2 py-1">
                                    <RatingStars value={college.rating?.overall ?? 0} count={college.rating?.count} />
                                </span>
                                {college.ranking?.nirfOverall ? (
                                    <Badge tone="orange">NIRF #{college.ranking.nirfOverall}</Badge>
                                ) : null}
                                {college.accreditation?.slice(0, 2).map((item) => (
                                    <span
                                        key={item}
                                        className="inline-flex items-center gap-1 rounded-pill border border-[#e8e0d5] bg-[#fffdf7] px-2 py-0.5 text-[10.5px] font-bold text-[#142b3e]"
                                    >
                                        <Award className="h-3 w-3 text-green" aria-hidden />
                                        {item}
                                    </span>
                                ))}
                                {college.approvals?.slice(0, 3).map((item) => (
                                    <span
                                        key={item}
                                        className="rounded-pill border border-[#e8e0d5] bg-[#fffdf7] px-2 py-0.5 text-[10.5px] font-bold text-[#142b3e]"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 rounded-panel border border-[#e8e0d5] bg-[#fffdf7] p-3 text-[#142b3e] shadow-card">
                        <dl className="grid grid-cols-2 gap-x-5 gap-y-2">
                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#536779]">Fee (from)</dt>
                                <dd className="text-[14px] font-extrabold">{formatCompactINR(college.feeRange?.min)}</dd>
                            </div>
                            <div>
                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#536779]">Avg. package</dt>
                                <dd className="text-[14px] font-extrabold">
                                    {formatCompactINR(college.placement?.averagePackage)}
                                </dd>
                            </div>
                        </dl>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                                href={`/book-counselling?college=${college.slug}`}
                                className="inline-flex h-9 items-center rounded-[9px] bg-orange px-3.5 text-[12px] font-bold text-[#142b3e] hover:bg-orange-600"
                            >
                                Apply / Get guidance
                            </Link>
                            {/*
                              Through SafeLink so a brochure URL typed into the
                              admin cannot become a `javascript:` href, and so the
                              PDF opens in a new tab with `rel="noopener"` instead
                              of navigating away from the college page.
                            */}
                            <SafeLink
                                href={college.brochureUrl}
                                showIcon={false}
                                className="h-9 rounded-[9px] border border-[#d5dce2] px-3 text-[12px] font-bold text-[#142b3e] hover:bg-[#f4f1ea]"
                                data-analytics="brochure_download"
                            >
                                <Download className="h-3.5 w-3.5" aria-hidden />
                                Brochure
                                <span className="sr-only">(opens in a new tab)</span>
                            </SafeLink>

                            {websiteHref ? (
                                <SafeLink
                                    href={websiteHref}
                                    showIcon={false}
                                    className="h-9 rounded-[9px] border border-[#d5dce2] px-3 text-[12px] font-bold text-[#142b3e] hover:bg-[#f4f1ea]"
                                >
                                    <Globe className="h-3.5 w-3.5" aria-hidden />
                                    Official website
                                    <span className="sr-only">(opens in a new tab)</span>
                                </SafeLink>
                            ) : null}
                        </div>

                        <div className="mt-2">
                            <CollegeCardActions
                                slug={college.slug}
                                name={college.name}
                                id={String(college._id)}
                                className="[&_button]:border-[#d5dce2] [&_button]:bg-white [&_button]:text-[#142b3e]"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <CollegeTabs base={base} />
                </div>
            </div>
        </section>
    );
}
