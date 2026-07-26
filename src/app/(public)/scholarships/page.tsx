import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { FilterPanel } from '@/components/shared/filter-panel';
import { SortSelect } from '@/components/shared/sort-select';
import { Pagination } from '@/components/shared/pagination';
import { SearchBox } from '@/components/search/search-box';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { searchScholarships, type ScholarshipSearchParams } from '@/services/finance.service';
import { COURSE_LEVELS, RESERVATION_CATEGORIES } from '@/config/constants';
import { formatCompactINR, formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<ScholarshipSearchParams>;
}): Promise<Metadata> {
    const params = await searchParams;
    return buildMetadata({
        title: 'Scholarships in India — Eligibility, Amount & Deadlines',
        description:
            'Browse government, private, institute and NGO scholarships by level, category and course. Check eligibility, benefit amount and application deadlines.',
        path: '/scholarships',
        noIndex: Boolean(params.q),
    });
}

const FILTERS = [
    {
        key: 'provider',
        label: 'Provider type',
        type: 'checkbox' as const,
        options: ['Government', 'Private', 'Institute', 'NGO', 'International'].map((v) => ({
            label: v,
            value: v,
        })),
    },
    {
        key: 'level',
        label: 'Level',
        type: 'radio' as const,
        options: COURSE_LEVELS.map((l) => ({ label: l, value: l })),
    },
    {
        key: 'category',
        label: 'Category',
        type: 'radio' as const,
        options: RESERVATION_CATEGORIES.map((c) => ({ label: c, value: c })),
    },
    {
        key: 'benefit',
        label: 'Benefit type',
        type: 'checkbox' as const,
        options: ['Full Tuition', 'Partial Tuition', 'Fixed Amount', 'Monthly Stipend', 'Other'].map((v) => ({
            label: v,
            value: v,
        })),
    },
];

export default async function ScholarshipsPage({
    searchParams,
}: {
    searchParams: Promise<ScholarshipSearchParams>;
}) {
    const params = await searchParams;
    const result = await searchScholarships(params);

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Scholarships', href: '/scholarships' },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((s) => ({ name: s.name, url: `/scholarships/${s.slug}` })),
                        'Scholarships',
                    ),
                ]}
            />

            <PageHeader
                eyebrow="Finance"
                title="Scholarships"
                description="Every scholarship listed with its eligibility, benefit and deadline — so you apply before the window closes, not after."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Scholarships' }]}
            >
                <div className="max-w-2xl">
                    <SearchBox placeholder="Search scholarships by name or provider…" types={['scholarship']} size="md" />
                </div>
            </PageHeader>

            <div className="shell py-6">
                <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <FilterPanel groups={FILTERS} basePath="/scholarships" className="sticky top-24 self-start" />

                    <div>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-[13px] text-ink-soft">
                                <span className="font-bold text-ink">{result.total}</span> scholarships
                            </p>
                            <SortSelect
                                options={[
                                    { label: 'Recommended', value: 'default' },
                                    { label: 'Closing soonest', value: 'deadline' },
                                    { label: 'Highest amount', value: 'amount' },
                                ]}
                                basePath="/scholarships"
                                defaultValue="default"
                            />
                        </div>

                        {result.items.length === 0 ? (
                            <EmptyState icon="Award" title="No scholarships match these filters" />
                        ) : (
                            <ul className="grid gap-3 sm:grid-cols-2">
                                {result.items.map((scholarship) => (
                                    <li key={String(scholarship._id)}>
                                        <article className="flex h-full flex-col rounded-panel border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h2 className="text-[13.5px] font-extrabold leading-snug text-ink">
                                                        <Link href={`/scholarships/${scholarship.slug}`} className="hover:text-navy-700">
                                                            {scholarship.name}
                                                        </Link>
                                                    </h2>
                                                    <p className="mt-0.5 text-[11.5px] text-ink-soft">{scholarship.provider}</p>
                                                </div>
                                                <Badge tone={scholarship.providerType === 'Government' ? 'navy' : 'purple'}>
                                                    {scholarship.providerType}
                                                </Badge>
                                            </div>

                                            <p className="mt-2 line-clamp-2 text-[12px] text-ink-soft">{scholarship.description}</p>

                                            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
                                                <div>
                                                    <dt className="text-ink-soft">Benefit</dt>
                                                    <dd className="font-bold text-ink">{scholarship.benefitType}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-ink-soft">Amount</dt>
                                                    <dd className="font-bold text-green">
                                                        {scholarship.amountMax ? `Up to ${formatCompactINR(scholarship.amountMax)}` : '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-ink-soft">Deadline</dt>
                                                    <dd className="font-bold text-ink">{formatDate(scholarship.applicationDeadline)}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-ink-soft">Levels</dt>
                                                    <dd className="truncate font-bold text-ink">
                                                        {scholarship.targetLevels.join(', ') || 'All'}
                                                    </dd>
                                                </div>
                                            </dl>

                                            <Link
                                                href={`/scholarships/${scholarship.slug}`}
                                                className="mt-auto inline-flex h-9 items-center justify-center rounded-[9px] bg-navy px-3 pt-0 text-[12px] font-bold text-white hover:bg-navy-800"
                                            >
                                                Eligibility & apply
                                            </Link>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <Pagination
                            className="mt-6"
                            basePath="/scholarships"
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
