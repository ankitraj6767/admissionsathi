import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { SortSelect } from '@/components/shared/sort-select';
import { CourseCard, toCourseCard } from '@/components/courses/course-card';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { listCourseCategories } from '@/db/repositories/course.repository';
import { COURSE_LEVEL_LANDINGS, findCourseLevelLanding } from '@/config/taxonomy';
import {
    COURSE_SORTS,
    resolveCourseFilters,
    searchCourses,
    type CourseSearchParams,
} from '@/services/course.service';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

/** Levels come from a fixed enum, so every landing page can be pre-rendered. */
export function generateStaticParams() {
    return COURSE_LEVEL_LANDINGS.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const level = findCourseLevelLanding(slug);
    if (!level) {
        return buildMetadata({ title: 'Level not found', path: `/courses/level/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: `${level.label} Courses in India — Eligibility, Fees & Colleges`,
        description: level.description,
        path: `/courses/level/${level.slug}`,
    });
}

export default async function CoursesByLevelPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<CourseSearchParams>;
}) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const level = findCourseLevelLanding(slug);
    if (!level) notFound();

    const filters = await resolveCourseFilters(query, { level: level.value });
    const [result, categories] = await Promise.all([searchCourses(filters), listCourseCategories({ limit: 12 })]);

    const basePath = `/courses/level/${level.slug}`;

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Courses', href: '/courses' },
                        { label: `${level.label} courses`, href: basePath },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((c) => ({ name: c.name, url: `/courses/${c.slug}` })),
                        `${level.label} courses`,
                    ),
                ]}
            />

            <PageHeader
                eyebrow="By level"
                title={`${level.label} courses`}
                description={level.description}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: level.label },
                ]}
                actions={
                    <Link
                        href={`/courses?level=${encodeURIComponent(level.value)}`}
                        className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                    >
                        Open in course finder
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title="Browse by stream" icon="LayoutGrid">
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map((category) => (
                            <Link
                                key={String(category._id)}
                                href={`/courses?level=${encodeURIComponent(level.value)}&category=${category.slug}`}
                                className="chip"
                            >
                                {category.name}
                                <span className="text-ink-soft">{category.courseCount}</span>
                            </Link>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard
                    title={`${result.total} ${level.label.toLowerCase()} courses`}
                    icon="GraduationCap"
                    actions={<SortSelect options={COURSE_SORTS} basePath={basePath} defaultValue="default" />}
                >
                    {result.items.length === 0 ? (
                        <EmptyState icon="GraduationCap" title={`No ${level.label.toLowerCase()} courses published yet`} />
                    ) : (
                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {result.items.map((course) => (
                                <li key={String(course._id)}>
                                    <CourseCard course={toCourseCard(course)} />
                                </li>
                            ))}
                        </ul>
                    )}

                    <Pagination
                        className="mt-5"
                        basePath={basePath}
                        params={query as Record<string, string | undefined>}
                        page={result.page}
                        totalPages={result.totalPages}
                        total={result.total}
                        pageSize={result.pageSize}
                    />
                </SectionCard>

                <SectionCard title="Other levels" icon="ListChecks">
                    <div className="flex flex-wrap gap-1.5">
                        {COURSE_LEVEL_LANDINGS.filter((entry) => entry.slug !== level.slug).map((entry) => (
                            <Link key={entry.slug} href={`/courses/level/${entry.slug}`} className="chip">
                                {entry.label}
                            </Link>
                        ))}
                    </div>
                </SectionCard>

                <CtaBanner
                    title={`Unsure which ${level.label.toLowerCase()} course suits you?`}
                    description="A counsellor can map your marks, budget and target city to a realistic shortlist."
                    ctaLabel="Book free counselling"
                    ctaUrl="/book-counselling?type=course"
                />
            </div>
        </>
    );
}
