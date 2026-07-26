import { Fragment } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { ComparisonToolbar } from '@/components/colleges/comparison-toolbar';
import {
    buildComparison,
    formatComparisonValue,
    getComparisonByShareId,
    type ComparisonRow,
} from '@/services/comparison.service';
import { listFeaturedColleges } from '@/db/repositories/college.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ colleges?: string; share?: string }>;
}): Promise<Metadata> {
    const params = await searchParams;
    const slugs = (params.colleges ?? '').split(',').filter(Boolean);
    return buildMetadata({
        title: slugs.length
            ? `Compare ${slugs.length} colleges — Fees, Ranking & Placements`
            : 'Compare Colleges — Fees, Ranking, Placements & Facilities',
        description:
            'Compare up to four colleges side by side on fees, ranking, ratings, placements, facilities, hostel and academics.',
        path: '/compare-colleges',
        noIndex: slugs.length > 0,
    });
}

export default async function CompareCollegesPage({
    searchParams,
}: {
    searchParams: Promise<{ colleges?: string; share?: string }>;
}) {
    const params = await searchParams;

    let slugs = (params.colleges ?? '').split(',').map((s) => s.trim()).filter(Boolean);

    if (slugs.length === 0 && params.share) {
        const shared = await getComparisonByShareId(params.share);
        if (shared) slugs = shared.collegeSlugs;
    }

    const comparison = slugs.length > 0 ? await buildComparison(slugs) : null;
    const suggestions = toPlain(await listFeaturedColleges(6));

    const groups = comparison
        ? Array.from(new Set(comparison.rows.map((row) => row.group)))
        : [];

    /** Marks the best value in a row so the winner is visually obvious. */
    const bestIndexes = (row: ComparisonRow | undefined) => {
        if (!row || row.higherIsBetter === undefined) return new Set<number>();
        const numeric: (number | null)[] = row.values.map((v) => (typeof v === 'number' ? v : null));
        const valid = numeric.filter((v): v is number => v !== null);
        if (valid.length < 2) return new Set<number>();
        const best = row.higherIsBetter ? Math.max(...valid) : Math.min(...valid);
        return new Set(numeric.map((v, i) => (v === best ? i : -1)).filter((i: number) => i >= 0));
    };

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Compare colleges', href: '/compare-colleges' },
                ])}
            />

            <PageHeader
                eyebrow="College tools"
                title="Compare colleges"
                description="Put up to four colleges side by side on the numbers that actually decide your choice."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Compare colleges' }]}
            />

            <div className="shell space-y-4 py-6">
                <ComparisonToolbar initialSlugs={slugs} />

                {!comparison || comparison.colleges.length === 0 ? (
                    <SectionCard title="Pick colleges to compare" icon="GitCompare">
                        <EmptyState
                            icon="GitCompare"
                            title="No colleges selected yet"
                            description="Add colleges from any listing or detail page, or start with a popular option below."
                        />
                        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {suggestions.map((college) => (
                                <li key={String(college._id)}>
                                    <Link
                                        href={`/compare-colleges?colleges=${college.slug}`}
                                        className="block rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                    >
                                        <span className="block truncate text-[12.5px] font-bold text-ink">{college.name}</span>
                                        <span className="mt-0.5 block text-[11px] text-ink-soft">
                                            {college.cityName}, {college.stateName}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                ) : (
                    <SectionCard
                        title={`Comparing ${comparison.colleges.length} college${comparison.colleges.length > 1 ? 's' : ''}`}
                        icon="GitCompare"
                        actions={
                            <Button asChild variant="outline" size="sm">
                                {/* Rendered server-side, so the download works without JS. */}
                                <a
                                    href={`/api/compare/pdf?slugs=${comparison.colleges.map((c) => c.slug).join(',')}`}
                                    download
                                >
                                    <Download className="h-4 w-4" aria-hidden />
                                    Download PDF
                                </a>
                            </Button>
                        }
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] border-collapse text-left text-[12.5px]">
                                <thead>
                                    <tr>
                                        <th className="sticky left-0 z-10 w-[190px] bg-white py-3 pr-3 align-bottom text-[10.5px] uppercase tracking-wide text-ink-soft">
                                            Parameter
                                        </th>
                                        {comparison.colleges.map((college) => (
                                            <th key={college.id} className="min-w-[180px] border-b border-line py-3 pr-3 align-bottom">
                                                <span className="flex items-start gap-2">
                                                    <Image
                                                        src={college.logoUrl ?? '/brand/college-placeholder.svg'}
                                                        alt=""
                                                        width={32}
                                                        height={32}
                                                        className="h-8 w-8 rounded-[8px] border border-line object-contain"
                                                    />
                                                    <span className="min-w-0">
                                                        <Link
                                                            href={`/colleges/${college.slug}`}
                                                            className="block truncate text-[12.5px] font-extrabold text-ink hover:text-navy-700"
                                                        >
                                                            {college.shortName ?? college.name}
                                                        </Link>
                                                        <span className="block truncate text-[10.5px] font-normal text-ink-soft">
                                                            {college.location}
                                                        </span>
                                                    </span>
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {groups.map((group) => (
                                        <Fragment key={`group-${group}`}>
                                            <tr>
                                                <td
                                                    colSpan={comparison.colleges.length + 1}
                                                    className="sticky left-0 bg-muted/60 px-2 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-navy-700"
                                                >
                                                    {group}
                                                </td>
                                            </tr>
                                            {comparison.rows
                                                .filter((row) => row.group === group)
                                                .map((row) => {
                                                    const best = bestIndexes(row);
                                                    return (
                                                        <tr key={`${group}-${row.label}`} className="border-b border-line/70">
                                                            <th
                                                                scope="row"
                                                                className="sticky left-0 z-10 bg-white py-2.5 pr-3 text-left text-[12px] font-semibold text-ink-soft"
                                                            >
                                                                {row.label}
                                                            </th>
                                                            {row.values.map((value, index) => (
                                                                <td
                                                                    key={`${row.label}-${index}`}
                                                                    className={cn(
                                                                        'py-2.5 pr-3 text-[12.5px]',
                                                                        best.has(index) ? 'font-extrabold text-green' : 'text-ink',
                                                                    )}
                                                                >
                                                                    {formatComparisonValue(row.label, value)}
                                                                    {best.has(index) ? (
                                                                        <span className="ml-1 text-[9px] font-bold uppercase text-green">best</span>
                                                                    ) : null}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-3 rounded-[10px] border border-orange-100 bg-orange-50 px-3 py-2 text-[11.5px] text-orange-700">
                            “Best” marks the strongest value among the selected colleges for comparable numeric fields only.
                            Figures are demonstration data — verify with the institute before deciding.
                        </p>
                    </SectionCard>
                )}

                <CtaBanner
                    title="Want a second opinion on your shortlist?"
                    description="A counsellor reviews your comparison and flags what the numbers do not show."
                    ctaLabel="Book free counselling"
                    ctaUrl="/book-counselling?type=college"
                />
            </div>
        </>
    );
}
