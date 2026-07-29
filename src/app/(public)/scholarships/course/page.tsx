import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { LinkTileGrid, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { distinctScholarshipCourseIds } from '@/db/repositories/finance.repository';
import { listCourseOptionsByIds } from '@/db/repositories/course.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
    title: 'Scholarships by Course — Find Funding for Your Programme',
    description:
        'Browse scholarships grouped by the course they fund, from engineering and medical to management, law and nursing programmes.',
    path: '/scholarships/course',
});

export default async function ScholarshipsByCourseIndexPage() {
    const courseIds = await distinctScholarshipCourseIds();
    const courses = await listCourseOptionsByIds(courseIds, 200);

    // Group by stream so a long list stays scannable.
    const byCategory = courses.reduce<Record<string, typeof courses>>((acc, course) => {
        const key = course.categoryName ?? 'Other';
        acc[key] = [...(acc[key] ?? []), course];
        return acc;
    }, {});

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Scholarships', href: '/scholarships' },
                    { label: 'By course', href: '/scholarships/course' },
                ])}
            />

            <PageHeader
                eyebrow="Directory"
                title="Scholarships by course"
                description="Only courses with at least one scholarship mapped to them are listed here, so every link leads to real results."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Scholarships', href: '/scholarships' },
                    { label: 'By course' },
                ]}
                actions={
                    <Link
                        href="/scholarships"
                        className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                    >
                        All scholarships
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                {courses.length === 0 ? (
                    <EmptyState
                        icon="Award"
                        title="No course-specific scholarships yet"
                        description="Scholarships currently listed apply across programmes rather than to a single course."
                        action={
                            <Link
                                href="/scholarships"
                                className="inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-[13px] font-bold text-white"
                            >
                                Browse all scholarships
                            </Link>
                        }
                    />
                ) : (
                    Object.entries(byCategory)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([categoryName, group]) => (
                            <SectionCard key={categoryName} title={categoryName} icon="Award">
                                <LinkTileGrid
                                    columns={4}
                                    items={group.map((course) => ({
                                        label: course.shortName ?? course.name,
                                        href: `/scholarships/course/${course.slug}`,
                                        meta: course.level,
                                    }))}
                                />
                            </SectionCard>
                        ))
                )}
            </div>
        </>
    );
}
