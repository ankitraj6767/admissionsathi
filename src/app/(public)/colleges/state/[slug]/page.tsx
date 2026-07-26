import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { CollegeCard, toCollegeCard } from '@/components/colleges/college-card';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { getStateBySlug, listCities, listStates } from '@/db/repositories/geo.repository';
import { resolveCollegeFilters, searchColleges } from '@/services/college.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const state = await getStateBySlug(slug);
    if (!state) {
        return buildMetadata({ title: 'State not found', path: `/colleges/state/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: state.seo?.title ?? `Colleges in ${state.name} — Fees, Courses & Admission`,
        description:
            state.seo?.description ??
            `Browse ${state.collegeCount}+ colleges in ${state.name} by course, fees, ranking and accepted entrance exams.`,
        path: `/colleges/state/${state.slug}`,
    });
}

export default async function CollegesByStatePage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const state = await getStateBySlug(slug);
    if (!state) notFound();

    const filters = await resolveCollegeFilters(query, { stateId: String(state._id) });
    const [result, cities, otherStates] = await Promise.all([
        searchColleges(filters),
        listCities({ stateId: String(state._id), limit: 20 }),
        listStates({ featuredOnly: true, limit: 12 }),
    ]);

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Colleges', href: '/colleges' },
                        { label: state.name, href: `/colleges/state/${state.slug}` },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((c) => ({ name: c.name, url: `/colleges/${c.slug}` })),
                        `Colleges in ${state.name}`,
                    ),
                ]}
            />

            <PageHeader
                eyebrow="By state"
                title={`Colleges in ${state.name}`}
                description={
                    state.description ??
                    `Explore colleges across ${state.name} with fees, ranking, accreditation and placement information.`
                }
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: state.name },
                ]}
                actions={
                    <Link
                        href={`/colleges?state=${state.slug}`}
                        className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                    >
                        Open in college finder
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                {cities.length > 0 ? (
                    <SectionCard title={`Cities in ${state.name}`} icon="MapPin">
                        <div className="flex flex-wrap gap-1.5">
                            {cities.map((city) => (
                                <Link key={String(city._id)} href={`/colleges/city/${city.slug}`} className="chip">
                                    {city.name}
                                    <span className="text-ink-soft">{city.collegeCount}</span>
                                </Link>
                            ))}
                        </div>
                    </SectionCard>
                ) : null}

                {state.counsellingAuthority ? (
                    <SectionCard title="State counselling authority" icon="Landmark">
                        <p className="text-[12.5px] text-ink-soft">
                            Admissions to state-quota seats in {state.name} are conducted by{' '}
                            <span className="font-semibold text-ink">{state.counsellingAuthority}</span>. Registration,
                            document verification and seat allotment happen on the official counselling portal.
                        </p>
                    </SectionCard>
                ) : null}

                <SectionCard title={`${result.total} colleges in ${state.name}`} icon="Building2">
                    {result.items.length === 0 ? (
                        <EmptyState icon="Building2" title="No colleges published for this state yet" />
                    ) : (
                        <div className="space-y-3">
                            {result.items.map((college) => (
                                <CollegeCard key={String(college._id)} college={toCollegeCard(college)} />
                            ))}
                        </div>
                    )}

                    <Pagination
                        className="mt-5"
                        basePath={`/colleges/state/${state.slug}`}
                        params={query}
                        page={result.page}
                        totalPages={result.totalPages}
                        total={result.total}
                        pageSize={result.pageSize}
                    />
                </SectionCard>

                <SectionCard title="Browse other states" icon="Map">
                    <div className="flex flex-wrap gap-1.5">
                        {otherStates
                            .filter((s) => s.slug !== state.slug)
                            .map((s) => (
                                <Link key={String(s._id)} href={`/colleges/state/${s.slug}`} className="chip">
                                    {s.name}
                                </Link>
                            ))}
                    </div>
                </SectionCard>

                <CtaBanner
                    title={`Need help with ${state.name} counselling?`}
                    description="Our counsellors know the state process, domicile rules and document checklist."
                    ctaLabel="Book free counselling"
                    ctaUrl="/book-counselling?type=college"
                />
            </div>
        </>
    );
}
