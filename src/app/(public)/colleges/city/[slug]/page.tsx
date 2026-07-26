import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { CollegeCard, toCollegeCard } from '@/components/colleges/college-card';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { getCityBySlug, listCities } from '@/db/repositories/geo.repository';
import { resolveCollegeFilters, searchColleges } from '@/services/college.service';
import { listCourseCategories } from '@/db/repositories/course.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const city = await getCityBySlug(slug);
    if (!city) {
        return buildMetadata({ title: 'City not found', path: `/colleges/city/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: city.seo?.title ?? `Colleges in ${city.name} — Courses, Fees & Placements`,
        description:
            city.seo?.description ??
            `Compare colleges in ${city.name}, ${city.stateName} by course, fee range, accreditation and placement record.`,
        path: `/colleges/city/${city.slug}`,
    });
}

export default async function CollegesByCityPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const city = await getCityBySlug(slug);
    if (!city) notFound();

    const filters = await resolveCollegeFilters(query, { cityId: String(city._id) });
    const [result, nearbyCities, categories] = await Promise.all([
        searchColleges(filters),
        listCities({ stateId: String(city.state), limit: 12 }),
        listCourseCategories({ limit: 8 }),
    ]);

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Colleges', href: '/colleges' },
                        { label: city.stateName, href: `/colleges/state/${city.stateName.toLowerCase().replace(/\s+/g, '-')}` },
                        { label: city.name, href: `/colleges/city/${city.slug}` },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((c) => ({ name: c.name, url: `/colleges/${c.slug}` })),
                        `Colleges in ${city.name}`,
                    ),
                ]}
            />

            <PageHeader
                eyebrow="By city"
                title={`Colleges in ${city.name}`}
                description={
                    city.description ??
                    `Colleges in ${city.name}, ${city.stateName} with fees, ranking, accreditation and placement details.`
                }
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: city.name },
                ]}
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title="Browse by stream" icon="GraduationCap">
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map((category) => (
                            <Link
                                key={String(category._id)}
                                href={`/colleges?city=${city.slug}&category=${category.slug}`}
                                className="chip"
                            >
                                {category.name}
                            </Link>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard title={`${result.total} colleges in ${city.name}`} icon="Building2">
                    {result.items.length === 0 ? (
                        <EmptyState icon="Building2" title="No colleges published for this city yet" />
                    ) : (
                        <div className="space-y-3">
                            {result.items.map((college) => (
                                <CollegeCard key={String(college._id)} college={toCollegeCard(college)} />
                            ))}
                        </div>
                    )}

                    <Pagination
                        className="mt-5"
                        basePath={`/colleges/city/${city.slug}`}
                        params={query}
                        page={result.page}
                        totalPages={result.totalPages}
                        total={result.total}
                        pageSize={result.pageSize}
                    />
                </SectionCard>

                {nearbyCities.length > 1 ? (
                    <SectionCard title={`Other cities in ${city.stateName}`} icon="MapPin">
                        <div className="flex flex-wrap gap-1.5">
                            {nearbyCities
                                .filter((c) => c.slug !== city.slug)
                                .map((c) => (
                                    <Link key={String(c._id)} href={`/colleges/city/${c.slug}`} className="chip">
                                        {c.name}
                                        <span className="text-ink-soft">{c.collegeCount}</span>
                                    </Link>
                                ))}
                        </div>
                    </SectionCard>
                ) : null}

                <CtaBanner
                    title={`Shortlisting colleges in ${city.name}?`}
                    description="Get a free counselling session to compare fees, placements and hostel costs realistically."
                    ctaLabel="Book free counselling"
                    ctaUrl="/book-counselling?type=college"
                />
            </div>
        </>
    );
}
