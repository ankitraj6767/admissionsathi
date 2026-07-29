import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, KeyValueGrid, LinkTileGrid, SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState, IconTile, RatingStars } from '@/components/ui/primitives';
import { getStateBySlug, listCities, listStates } from '@/db/repositories/geo.repository';
import { listCounsellorsForState } from '@/db/repositories/counsellor.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { searchColleges } from '@/services/college.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const state = await getStateBySlug(slug);
    if (!state) {
        return buildMetadata({ title: 'State not found', path: `/counselling/state/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: `${state.name} Admission Counselling — Free Expert Guidance`,
        description: `Free counselling for ${state.name} admissions: state quota rules, domicile requirements, document checklist and college shortlisting.`,
        path: `/counselling/state/${state.slug}`,
    });
}

export default async function CounsellingByStatePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const state = await getStateBySlug(slug);
    if (!state) notFound();

    const stateId = String(state._id);
    const [counsellors, colleges, cities, otherStates] = await Promise.all([
        listCounsellorsForState(stateId, 6).then(toPlain),
        searchColleges({ stateId, pageSize: 6, sort: 'ranking' }),
        listCities({ stateId, limit: 16 }),
        listStates({ featuredOnly: true, limit: 12 }),
    ]);

    const bookingHref = `/book-counselling?type=college&state=${state.slug}`;

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Counselling', href: '/counselling' },
                    { label: state.name, href: `/counselling/state/${state.slug}` },
                ])}
            />

            <PageHeader
                eyebrow="Counselling by state"
                title={`${state.name} admission counselling`}
                description={`State-quota seats, domicile proof and document verification work differently in every state. Our counsellors walk you through the ${state.name} process end to end — at no cost.`}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Counselling', href: '/counselling' },
                    { label: state.name },
                ]}
                actions={
                    <Link
                        href={bookingHref}
                        className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                    >
                        Book free counselling
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title={`How ${state.name} counselling works`} icon="Landmark">
                    <KeyValueGrid
                        columns={4}
                        items={[
                            { label: 'Counselling authority', value: state.counsellingAuthority ?? 'Announced per exam' },
                            { label: 'Colleges listed', value: state.collegeCount },
                            { label: 'Cities covered', value: cities.length },
                            { label: 'Counsellors available', value: counsellors.length },
                        ]}
                    />
                    <ol className="mt-4 grid gap-2.5 sm:grid-cols-2">
                        {[
                            {
                                title: 'Confirm your eligibility',
                                detail: `We check your qualifying exam, category and ${state.name} domicile status before you register.`,
                            },
                            {
                                title: 'Register on the state portal',
                                detail: 'Registration, fee payment and choice filling happen on the official counselling portal — we sit with you through it.',
                            },
                            {
                                title: 'Fill choices in the right order',
                                detail: 'Choice order decides your allotment. We help you sequence colleges against previous cut-off trends.',
                            },
                            {
                                title: 'Document verification & reporting',
                                detail: 'We share the exact document checklist and reporting deadlines so an allotment is never lost on paperwork.',
                            },
                        ].map((step, index) => (
                            <li
                                key={step.title}
                                className="flex gap-3 rounded-[12px] border border-line bg-muted/40 px-3.5 py-3"
                            >
                                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                                    {index + 1}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[12.5px] font-bold text-ink">{step.title}</p>
                                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">{step.detail}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
                        Counselling schedules and seat matrices are published by the authority itself. Always confirm dates on the
                        official portal — we help you interpret them, we do not replace them.
                    </p>
                </SectionCard>

                <SectionCard
                    title={`Counsellors covering ${state.name}`}
                    icon="UserCheck"
                    actions={
                        <Link href="/counsellors" className="link-more whitespace-nowrap">
                            All counsellors
                        </Link>
                    }
                >
                    {counsellors.length === 0 ? (
                        <EmptyState icon="UserCheck" title="No counsellors listed yet" />
                    ) : (
                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {counsellors.map((counsellor) => (
                                <li key={String(counsellor._id)}>
                                    <article className="flex h-full flex-col rounded-panel border border-line bg-white p-4 shadow-card">
                                        <div className="flex items-start gap-3">
                                            <IconTile icon="UserCheck" tone="teal" />
                                            <div className="min-w-0">
                                                <h3 className="truncate text-[13.5px] font-extrabold text-ink">
                                                    <Link href={`/counsellors/${counsellor.slug}`} className="hover:text-navy-700">
                                                        {counsellor.name}
                                                    </Link>
                                                </h3>
                                                <p className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-soft">
                                                    {counsellor.designation ?? 'Admission counsellor'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                            <RatingStars value={counsellor.rating?.average ?? 0} size="sm" count={counsellor.rating?.count} />
                                            {counsellor.experienceYears ? (
                                                <Badge tone="neutral">{counsellor.experienceYears}+ yrs</Badge>
                                            ) : null}
                                        </div>
                                        <Link
                                            href={`/book-counselling?counsellor=${counsellor.slug}&state=${state.slug}`}
                                            className="mt-auto inline-flex h-9 items-center justify-center rounded-[9px] bg-navy px-3 text-[12px] font-bold text-white hover:bg-navy-800"
                                        >
                                            Book a session
                                        </Link>
                                    </article>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard
                    title={`Top colleges in ${state.name}`}
                    icon="Building2"
                    actions={
                        <Link href={`/colleges/state/${state.slug}`} className="link-more whitespace-nowrap">
                            All {state.collegeCount} colleges
                        </Link>
                    }
                >
                    {colleges.items.length === 0 ? (
                        <EmptyState icon="Building2" title="No colleges published for this state yet" />
                    ) : (
                        <LinkTileGrid
                            items={colleges.items.map((college) => ({
                                label: college.name,
                                href: `/colleges/${college.slug}`,
                                description: `${college.cityName ?? ''} • ${college.ownership}`,
                                meta: college.ranking?.nirfOverall ? `#${college.ranking.nirfOverall}` : undefined,
                            }))}
                        />
                    )}
                </SectionCard>

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

                <SectionCard title="Counselling in other states" icon="Map">
                    <div className="flex flex-wrap gap-1.5">
                        {otherStates
                            .filter((entry) => entry.slug !== state.slug)
                            .map((entry) => (
                                <Link key={String(entry._id)} href={`/counselling/state/${entry.slug}`} className="chip">
                                    {entry.name}
                                </Link>
                            ))}
                    </div>
                </SectionCard>

                <CtaBanner
                    title={`Talk to a ${state.name} admission counsellor`}
                    description="Free 30-minute session. Bring your scorecard and we will build a realistic choice list with you."
                    ctaLabel="Book free counselling"
                    ctaUrl={bookingHref}
                />
            </div>
        </>
    );
}
