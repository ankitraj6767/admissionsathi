import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SearchBox } from '@/components/search/search-box';
import { SectionCard } from '@/components/shared/content-blocks';
import { EmptyState, IconTile } from '@/components/ui/primitives';
import { getTrendingSearches, globalSearch, logSearchQuery } from '@/services/search.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const dynamic = 'force-dynamic';

const TYPE_ICONS: Record<string, string> = {
    college: 'Building2',
    course: 'GraduationCap',
    exam: 'FileText',
    article: 'Newspaper',
    scholarship: 'Award',
    predictor: 'Target',
    city: 'MapPin',
    state: 'Map',
};

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
    const { q } = await searchParams;
    return buildMetadata({
        title: q ? `Search results for “${q}”` : 'Search Admission Sathi',
        description:
            'Search colleges, courses, exams, predictors, scholarships and articles across Admission Sathi.',
        path: '/search',
        noIndex: true,
    });
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const term = (q ?? '').trim();

    const [result, trending] = await Promise.all([
        term.length >= 2 ? globalSearch(term, { limitPerGroup: 8 }) : Promise.resolve(null),
        getTrendingSearches(8),
    ]);

    if (result) {
        void logSearchQuery({ term, resultCount: result.total, scope: 'search_page' });
    }

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Search', href: '/search' },
                ])}
            />

            <PageHeader
                eyebrow="Search"
                title={term ? `Results for “${term}”` : 'Search Admission Sathi'}
                description={
                    result
                        ? `${result.total} matches across colleges, courses, exams, predictors, scholarships and articles.`
                        : 'Search across colleges, courses, exams, predictors, scholarships, articles, cities and states.'
                }
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Search' }]}
            >
                <div className="max-w-2xl">
                    <SearchBox placeholder="Search anything — colleges, courses, exams…" size="lg" />
                </div>
            </PageHeader>

            <div className="shell space-y-4 py-6">
                {!term ? (
                    <SectionCard title="Trending searches" icon="Flame">
                        {trending.length === 0 ? (
                            <p className="text-[13px] text-ink-soft">Start typing above to search the platform.</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {trending.map((item) => (
                                    <Link key={item} href={`/search?q=${encodeURIComponent(item)}`} className="chip">
                                        {item}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                ) : result && result.total === 0 ? (
                    <EmptyState
                        icon="Search"
                        title={`No matches for “${term}”`}
                        description="Check the spelling, try a shorter keyword, or browse the modules directly."
                        action={
                            <div className="flex flex-wrap justify-center gap-2">
                                <Link href="/colleges" className="chip">
                                    Browse colleges
                                </Link>
                                <Link href="/courses" className="chip">
                                    Browse courses
                                </Link>
                                <Link href="/exams" className="chip">
                                    Browse exams
                                </Link>
                            </div>
                        }
                    />
                ) : (
                    result?.groups.map((group) => (
                        <SectionCard
                            key={`${group.type}-${group.label}`}
                            title={group.label}
                            icon={TYPE_ICONS[group.type] ?? 'Search'}
                            description={`${group.hits.length} result${group.hits.length === 1 ? '' : 's'}`}
                        >
                            <ul className="grid gap-2 sm:grid-cols-2">
                                {group.hits.map((hit) => (
                                    <li key={`${hit.type}-${hit.id}`}>
                                        <Link
                                            href={hit.url}
                                            className="flex items-start gap-3 rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                        >
                                            <IconTile icon={TYPE_ICONS[hit.type] ?? 'Search'} tone="navy" size="sm" />
                                            <span className="min-w-0">
                                                <span className="block truncate text-[12.5px] font-bold text-ink">{hit.label}</span>
                                                {hit.sublabel ? (
                                                    <span className="block truncate text-[11px] text-ink-soft">{hit.sublabel}</span>
                                                ) : null}
                                            </span>
                                            {hit.meta ? (
                                                <span className="ml-auto shrink-0 text-[11px] font-semibold text-ink-soft">
                                                    {hit.meta}
                                                </span>
                                            ) : null}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </SectionCard>
                    ))
                )}
            </div>
        </>
    );
}
