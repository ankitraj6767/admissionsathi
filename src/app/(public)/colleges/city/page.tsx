import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { listCities, listStates } from '@/db/repositories/geo.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
    title: 'Colleges by City — Browse Every City We Track',
    description:
        'Browse colleges city by city with fees, ranking and course listings. Grouped by state so you can compare nearby options quickly.',
    path: '/colleges/city',
});

export default async function CollegesByCityIndexPage() {
    const [cities, states] = await Promise.all([listCities({ limit: 200 }), listStates({ limit: 40 })]);

    // Group by state so the directory reads geographically rather than as one
    // long alphabetical list. Cities with no published college are dropped —
    // an empty landing page is a thin page.
    const withColleges = cities.filter((city) => city.collegeCount > 0);
    const byState = withColleges.reduce<Record<string, typeof withColleges>>((acc, city) => {
        const key = city.stateName ?? 'Other';
        acc[key] = [...(acc[key] ?? []), city];
        return acc;
    }, {});

    const stateSlugByName = new Map(states.map((state) => [state.name, state.slug]));

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: 'By city', href: '/colleges/city' },
                ])}
            />

            <PageHeader
                eyebrow="Directory"
                title="Colleges by city"
                description="Every city with published colleges, grouped by state. Pick a city to see its institutes with fees, ranking and courses."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: 'By city' },
                ]}
                actions={
                    <Link
                        href="/colleges/state"
                        className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                    >
                        Browse by state
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                {withColleges.length === 0 ? (
                    <EmptyState icon="MapPin" title="No cities published yet" />
                ) : (
                    Object.entries(byState)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([stateName, group]) => (
                            <SectionCard
                                key={stateName}
                                title={stateName}
                                icon="MapPin"
                                actions={
                                    stateSlugByName.get(stateName) ? (
                                        <Link
                                            href={`/colleges/state/${stateSlugByName.get(stateName)}`}
                                            className="link-more whitespace-nowrap"
                                        >
                                            All of {stateName}
                                        </Link>
                                    ) : undefined
                                }
                            >
                                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    {group.map((city) => (
                                        <li key={String(city._id)}>
                                            <Link
                                                href={`/colleges/city/${city.slug}`}
                                                className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                            >
                                                <span className="truncate text-[12.5px] font-semibold text-ink">
                                                    {city.name}
                                                </span>
                                                <span className="shrink-0 text-[11px] font-bold text-ink-soft">
                                                    {city.collegeCount}
                                                </span>
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
