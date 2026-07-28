import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { FilterPanel } from '@/components/shared/filter-panel';
import { SortSelect } from '@/components/shared/sort-select';
import { Pagination } from '@/components/shared/pagination';
import { CollegeCard, toCollegeCard } from '@/components/colleges/college-card';
import { CardSkeleton, Chip, EmptyState } from '@/components/ui/primitives';
import { SearchBox } from '@/components/search/search-box';
import {
    COLLEGE_SORTS,
    buildCollegeFilterGroups,
    getCollegeFacets,
    resolveCollegeFilters,
    searchColleges,
    type CollegeSearchParams,
} from '@/services/college.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 300;

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<CollegeSearchParams>;
}): Promise<Metadata> {
    const params = await searchParams;
    const page = Number(params.page) || 1;

    return buildMetadata({
        title:
            page > 1
                ? `Colleges in India — Page ${page}`
                : 'Colleges in India — Fees, Ranking, Placements & Admission',
        description:
            'Browse verified college listings across India. Filter by course, state, city, ownership, fees, accreditation, ranking and placement record, then compare shortlists side by side.',
        path: '/colleges',
        noIndex: Boolean(params.q),
    });
}

export default async function CollegesPage({
    searchParams,
}: {
    searchParams: Promise<CollegeSearchParams>;
}) {
    const params = await searchParams;
    const [filters, filterGroups, facets] = await Promise.all([
        resolveCollegeFilters(params),
        buildCollegeFilterGroups(),
        getCollegeFacets(),
    ]);

    const result = await searchColleges(filters);
    const cards = result.items.map(toCollegeCard);

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Colleges', href: '/colleges' },
                    ]),
                    buildItemListJsonLd(
                        cards.map((c) => ({ name: c.name, url: `/colleges/${c.slug}` })),
                        'Colleges in India',
                    ),
                ]}
            />

            <PageHeader
                eyebrow="College discovery"
                title="Find the right college"
                description="Compare colleges across India on fees, ranking, accreditation, placements and student reviews. Every listing links to detailed courses, cut-offs and admission information."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Colleges' },
                ]}
            >
                <div className="max-w-2xl">
                    <SearchBox
                        placeholder="Search colleges by name, city or state…"
                        types={['college', 'city', 'state']}
                        size="md"
                    />
                </div>
            </PageHeader>

            <div className="shell py-6">
                <div className="mb-4 flex flex-wrap gap-1.5">
                    {facets.categories.slice(0, 8).map((category) => (
                        <Chip key={category.value} href={`/colleges?category=${category.value}`}>
                            {category.label}
                            <span className="text-ink-soft">{category.count}</span>
                        </Chip>
                    ))}
                </div>

                <div className="grid gap-5 lg:grid-cols-[262px_minmax(0,1fr)]">
                    <FilterPanel groups={filterGroups} basePath="/colleges" className="sticky top-24 self-start" />

                    <div>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-[13px] text-ink-soft">
                                <span className="font-bold text-ink">{result.total}</span> colleges found
                            </p>
                            <SortSelect options={COLLEGE_SORTS} basePath="/colleges" defaultValue="relevance" />
                        </div>

                        <Suspense fallback={<CardSkeleton lines={5} />}>
                            {cards.length === 0 ? (
                                <EmptyState
                                    icon="Building2"
                                    title="No colleges match these filters"
                                    description="Try widening the fee range, removing a filter, or search by college name."
                                    action={
                                        <Link
                                            href="/colleges"
                                            className="inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-[13px] font-bold text-white"
                                        >
                                            Reset filters
                                        </Link>
                                    }
                                />
                            ) : (
                                <div className="space-y-3">
                                    {cards.map((college) => (
                                        <CollegeCard key={college.id} college={college} />
                                    ))}
                                </div>
                            )}
                        </Suspense>

                        <Pagination
                            className="mt-6"
                            basePath="/colleges"
                            params={params as Record<string, string | undefined>}
                            page={result.page}
                            totalPages={result.totalPages}
                            total={result.total}
                            pageSize={result.pageSize}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
