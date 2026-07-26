import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { CollegeCard, toCollegeCard } from '@/components/colleges/college-card';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { getCourseBySlug } from '@/db/repositories/course.repository';
import { resolveCollegeFilters, searchColleges } from '@/services/college.service';
import { listStates } from '@/db/repositories/geo.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const course = await getCourseBySlug(slug);
    if (!course) {
        return buildMetadata({ title: 'Course not found', path: `/colleges/course/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: `${course.name} Colleges in India — Fees, Ranking & Admission`,
        description: `Compare colleges offering ${course.name} on fees, ranking, accreditation, placements and accepted entrance exams.`,
        path: `/colleges/course/${course.slug}`,
    });
}

export default async function CollegesByCoursePage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const course = await getCourseBySlug(slug);
    if (!course) notFound();

    const filters = await resolveCollegeFilters(query, { courseId: String(course._id) });
    const [result, states] = await Promise.all([searchColleges(filters), listStates({ featuredOnly: true, limit: 12 })]);

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Colleges', href: '/colleges' },
                        { label: `${course.name} colleges`, href: `/colleges/course/${course.slug}` },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((c) => ({ name: c.name, url: `/colleges/${c.slug}` })),
                        `${course.name} colleges`,
                    ),
                ]}
            />

            <PageHeader
                eyebrow={course.categoryName}
                title={`${course.name} colleges in India`}
                description={`${result.total} colleges offer ${course.name}. Compare them on fees, ranking, placements and entrance exams accepted.`}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: `${course.shortName ?? course.name} colleges` },
                ]}
                actions={
                    <Link
                        href={`/courses/${course.slug}`}
                        className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                    >
                        Course details
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title="Filter by state" icon="Map">
                    <div className="flex flex-wrap gap-1.5">
                        {states.map((state) => (
                            <Link
                                key={String(state._id)}
                                href={`/colleges?course=${course.slug}&state=${state.slug}`}
                                className="chip"
                            >
                                {state.name}
                            </Link>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard title={`${result.total} colleges offering ${course.shortName ?? course.name}`} icon="Building2">
                    {result.items.length === 0 ? (
                        <EmptyState icon="Building2" title="No colleges mapped to this course yet" />
                    ) : (
                        <div className="space-y-3">
                            {result.items.map((college) => (
                                <CollegeCard key={String(college._id)} college={toCollegeCard(college)} />
                            ))}
                        </div>
                    )}

                    <Pagination
                        className="mt-5"
                        basePath={`/colleges/course/${course.slug}`}
                        params={query}
                        page={result.page}
                        totalPages={result.totalPages}
                        total={result.total}
                        pageSize={result.pageSize}
                    />
                </SectionCard>

                <CtaBanner
                    title={`Which ${course.shortName ?? course.name} college fits your score?`}
                    description="Run the relevant predictor, then get a counsellor to validate your shortlist."
                    ctaLabel="Open predictors"
                    ctaUrl="/predictors"
                    tone="teal"
                />
            </div>
        </>
    );
}
