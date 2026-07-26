import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { CourseCard, toCourseCard } from '@/components/courses/course-card';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { getCategoryDetail } from '@/services/course.service';
import { listColleges } from '@/db/repositories/college.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const detail = await getCategoryDetail(slug);
    if (!detail) {
        return buildMetadata({ title: 'Category not found', path: `/courses/category/${slug}`, noIndex: true });
    }
    const { category } = detail;
    return buildMetadata({
        title: category.seo?.title ?? `${category.name} Courses — Colleges, Fees & Admission`,
        description: category.seo?.description ?? category.description,
        path: `/courses/category/${category.slug}`,
    });
}

export default async function CourseCategoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getCategoryDetail(slug);
    if (!detail) notFound();

    const { category, courses } = detail;
    const colleges = toPlain(
        await listColleges({ categoryId: String(category._id), pageSize: 8, sort: 'ranking' }),
    );

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Courses', href: '/courses' },
                        { label: category.name, href: `/courses/category/${category.slug}` },
                    ]),
                    buildItemListJsonLd(
                        courses.items.map((c) => ({ name: c.name, url: `/courses/${c.slug}` })),
                        `${category.name} courses`,
                    ),
                ]}
            />

            <PageHeader
                eyebrow="Stream"
                title={`${category.name} courses`}
                description={category.description}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: category.name },
                ]}
                actions={
                    <Link
                        href={`/colleges?category=${category.slug}`}
                        className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                    >
                        {category.collegeCount} colleges
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title={`${courses.total} courses in ${category.name}`} icon={category.icon}>
                    {courses.items.length === 0 ? (
                        <EmptyState icon="GraduationCap" title="No courses published in this stream yet" />
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {courses.items.map((course) => (
                                <CourseCard key={String(course._id)} course={toCourseCard(course)} />
                            ))}
                        </div>
                    )}
                </SectionCard>

                {colleges.items.length > 0 ? (
                    <SectionCard
                        title={`Top ${category.name} colleges`}
                        icon="Building2"
                        actions={
                            <Link href={`/colleges?category=${category.slug}`} className="link-more">
                                View all →
                            </Link>
                        }
                    >
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {colleges.items.map((college) => (
                                <li key={String(college._id)}>
                                    <Link
                                        href={`/colleges/${college.slug}`}
                                        className="block rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                    >
                                        <span className="block truncate text-[12.5px] font-bold text-ink">{college.name}</span>
                                        <span className="mt-0.5 block text-[11px] text-ink-soft">
                                            {college.cityName}, {college.stateName}
                                            {college.ranking?.nirfOverall ? ` • NIRF #${college.ranking.nirfOverall}` : ''}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                ) : null}

                <CtaBanner
                    title={`Not sure which ${category.name} course to pick?`}
                    description="Get a free counselling session and shortlist courses that match your profile."
                    ctaLabel="Book free counselling"
                    ctaUrl="/book-counselling"
                />
            </div>
        </>
    );
}
