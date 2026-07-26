import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { CollegeCard, toCollegeCard } from '@/components/colleges/college-card';
import { EmptyState } from '@/components/ui/primitives';
import { getCourseBySlug } from '@/db/repositories/course.repository';
import { resolveCollegeFilters, searchColleges } from '@/services/college.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 600;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const course = await getCourseBySlug(slug);
    if (!course) return buildMetadata({ title: 'Not found', path: `/courses/${slug}/colleges`, noIndex: true });

    return buildMetadata({
        title: `${course.name} Colleges in India — Fees, Ranking & Admission`,
        description: `Compare ${course.collegeCount}+ colleges offering ${course.name} on fees, ranking, accreditation and placements.`,
        path: `/courses/${course.slug}/colleges`,
    });
}

export default async function CourseCollegesPage({
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
    const result = await searchColleges(filters);

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: course.name, href: `/courses/${course.slug}` },
                    { label: 'Colleges', href: `/courses/${course.slug}/colleges` },
                ])}
            />

            <PageHeader
                eyebrow={course.categoryName}
                title={`Colleges offering ${course.name}`}
                description={`${result.total} colleges on Admission Sathi offer ${course.name}. Compare fees, ranking, placements and admission requirements.`}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: course.shortName ?? course.name, href: `/courses/${course.slug}` },
                    { label: 'Colleges' },
                ]}
                actions={
                    <Link
                        href={`/colleges?course=${course.slug}`}
                        className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                    >
                        Open in college finder
                    </Link>
                }
            />

            <div className="shell py-6">
                {result.items.length === 0 ? (
                    <EmptyState
                        icon="Building2"
                        title="No colleges mapped to this course yet"
                        description="College mappings are added from the admin dashboard."
                    />
                ) : (
                    <div className="space-y-3">
                        {result.items.map((college) => (
                            <CollegeCard key={String(college._id)} college={toCollegeCard(college)} />
                        ))}
                    </div>
                )}

                <Pagination
                    className="mt-6"
                    basePath={`/courses/${course.slug}/colleges`}
                    params={query}
                    page={result.page}
                    totalPages={result.totalPages}
                    total={result.total}
                    pageSize={result.pageSize}
                />
            </div>
        </>
    );
}
