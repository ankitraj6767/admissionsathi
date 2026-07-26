import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { FilterPanel } from '@/components/shared/filter-panel';
import { SortSelect } from '@/components/shared/sort-select';
import { Pagination } from '@/components/shared/pagination';
import { CourseCard, toCourseCard } from '@/components/courses/course-card';
import { SearchBox } from '@/components/search/search-box';
import { EmptyState, IconTile } from '@/components/ui/primitives';
import {
    COURSE_SORTS,
    buildCourseFilterGroups,
    resolveCourseFilters,
    searchCourses,
    type CourseSearchParams,
} from '@/services/course.service';
import { listCourseCategories } from '@/db/repositories/course.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 600;

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<CourseSearchParams>;
}): Promise<Metadata> {
    const params = await searchParams;
    return buildMetadata({
        title: 'Courses in India — Eligibility, Fees, Duration & Colleges',
        description:
            'Explore undergraduate, postgraduate, diploma and doctoral courses across engineering, medical, management, IT, pharmacy, law, nursing and paramedical streams.',
        path: '/courses',
        noIndex: Boolean(params.q),
    });
}

export default async function CoursesPage({
    searchParams,
}: {
    searchParams: Promise<CourseSearchParams>;
}) {
    const params = await searchParams;
    const [filters, filterGroups, categories] = await Promise.all([
        resolveCourseFilters(params),
        buildCourseFilterGroups(),
        listCourseCategories({ limit: 12 }),
    ]);

    const result = await searchCourses(filters);
    const cards = result.items.map(toCourseCard);

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Courses', href: '/courses' },
                    ]),
                    buildItemListJsonLd(
                        cards.map((c) => ({ name: c.name, url: `/courses/${c.slug}` })),
                        'Courses in India',
                    ),
                ]}
            />

            <PageHeader
                eyebrow="Course discovery"
                title="Find the right course"
                description="Compare courses on eligibility, duration, fees, entrance exams, specialisations and career outcomes — then jump straight to the colleges that offer them."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Courses' }]}
            >
                <div className="max-w-2xl">
                    <SearchBox placeholder="Search courses, e.g. B.Tech, MBBS, MBA…" types={['course']} size="md" />
                </div>
            </PageHeader>

            <div className="shell py-6">
                {/* Category tiles */}
                <ul className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
                    {categories.map((category) => (
                        <li key={String(category._id)}>
                            <Link
                                href={`/courses/category/${category.slug}`}
                                className="flex h-full flex-col items-center gap-1.5 rounded-[12px] border border-line bg-white px-2 py-3 text-center transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card"
                            >
                                <IconTile icon={category.icon} tone={category.themeColor} size="sm" />
                                <span className="text-[11.5px] font-bold leading-tight text-ink">{category.name}</span>
                                <span className="text-[9.5px] text-ink-soft">{category.courseCount} courses</span>
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
                    <FilterPanel groups={filterGroups} basePath="/courses" className="sticky top-24 self-start" />

                    <div>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-[13px] text-ink-soft">
                                <span className="font-bold text-ink">{result.total}</span> courses found
                            </p>
                            <SortSelect options={COURSE_SORTS} basePath="/courses" defaultValue="default" />
                        </div>

                        {cards.length === 0 ? (
                            <EmptyState
                                icon="GraduationCap"
                                title="No courses match these filters"
                                description="Try a different stream, level or fee range."
                                action={
                                    <Link
                                        href="/courses"
                                        className="inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-[13px] font-bold text-white"
                                    >
                                        Reset filters
                                    </Link>
                                }
                            />
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {cards.map((course) => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        )}

                        <Pagination
                            className="mt-6"
                            basePath="/courses"
                            params={params as Record<string, string | undefined>}
                            page={result.page}
                            totalPages={result.totalPages}
                            total={result.total}
                            pageSize={result.pageSize}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
