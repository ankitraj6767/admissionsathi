import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { LinkTileGrid, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { listStates } from '@/db/repositories/geo.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
    title: 'Counselling by State — State Quota, Domicile & Document Rules',
    description:
        'State-wise admission counselling guidance: counselling authority, domicile rules, choice filling and document verification for every state we cover.',
    path: '/counselling/state',
});

export default async function CounsellingByStateIndexPage() {
    const states = await listStates({ limit: 40 });

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
                    { label: 'Counselling', href: '/counselling' },
                    { label: 'By state', href: '/counselling/state' },
                ])}
            />

            <PageHeader
                eyebrow="Directory"
                title="Counselling by state"
                description="Every state runs its own counselling authority, quota split and document checklist. Pick your state to see how the process works there."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Counselling', href: '/counselling' },
                    { label: 'By state' },
                ]}
                actions={
                    <Link
                        href="/book-counselling"
                        className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                    >
                        Book free counselling
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                {states.length === 0 ? (
                    <EmptyState icon="Map" title="No states published yet" />
                ) : (
                    Object.entries(byRegion).map(([region, group]) => (
                        <SectionCard key={region} title={`${region} India`} icon="Map">
                            <LinkTileGrid
                                columns={4}
                                items={group.map((state) => ({
                                    label: state.name,
                                    href: `/counselling/state/${state.slug}`,
                                    meta: `${state.collegeCount}`,
                                }))}
                            />
                        </SectionCard>
                    ))
                )}
            </div>
        </>
    );
}
