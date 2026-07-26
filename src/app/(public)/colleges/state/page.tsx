import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { listCities, listStates } from '@/db/repositories/geo.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
    title: 'Colleges by State — Browse Every State & Union Territory',
    description:
        'Browse colleges state by state with counselling authority details, city breakdowns and course-wise listings.',
    path: '/colleges/state',
});

export default async function CollegesByStateIndexPage() {
    const [states, cities] = await Promise.all([listStates({ limit: 40 }), listCities({ limit: 60 })]);

    const byRegion = states.reduce<Record<string, typeof states>>((acc, state) => {
        const region = state.region ?? 'Other';
        acc[region] = [...(acc[region] ?? []), state];
        return acc;
    }, {});

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: 'By state', href: '/colleges/state' },
                ])}
            />

            <PageHeader
                eyebrow="Directory"
                title="Colleges by state"
                description="Every state and union territory we track, grouped by region — with the number of colleges listed."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: 'By state' },
                ]}
            />

            <div className="shell space-y-4 py-6">
                {Object.entries(byRegion).map(([region, group]) => (
                    <SectionCard key={region} title={`${region} India`} icon="Map">
                        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {group.map((state) => (
                                <li key={String(state._id)}>
                                    <Link
                                        href={`/colleges/state/${state.slug}`}
                                        className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                    >
                                        <span className="truncate text-[12.5px] font-semibold text-ink">{state.name}</span>
                                        <span className="shrink-0 text-[11px] font-bold text-ink-soft">{state.collegeCount}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                ))}

                <SectionCard title="Popular cities" icon="MapPin">
                    <div className="flex flex-wrap gap-1.5">
                        {cities
                            .filter((city) => city.collegeCount > 0)
                            .map((city) => (
                                <Link key={String(city._id)} href={`/colleges/city/${city.slug}`} className="chip">
                                    {city.name}
                                    <span className="text-ink-soft">{city.collegeCount}</span>
                                </Link>
                            ))}
                    </div>
                </SectionCard>
            </div>
        </>
    );
}
