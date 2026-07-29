import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { LinkTileGrid, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { distinctOfferedCourseIds } from '@/db/repositories/college.repository';
import { listCourseOptionsByIds } from '@/db/repositories/course.repository';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
    title: 'Colleges by Course — Find Institutes Offering Your Programme',
    description:
        'Browse colleges grouped by the course they offer, with fees, ranking, accreditation and accepted entrance exams.',
    path: '/colleges/course',
});

export default async function CollegesByCourseIndexPage() {
    // Only courses at least one college actually offers, so every link resolves
    // to a page with results rather than an empty listing.
    const courseIds = await distinctOfferedCourseIds();
    const courses = await listCourseOptionsByIds(courseIds, 240);

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
                    { label: 'Colleges', href: '/colleges' },
                    { label: 'By course', href: '/colleges/course' },
                ])}
            />

            <PageHeader
                eyebrow="Directory"
                title="Colleges by course"
                description="Start from the programme you want to study and see every college that offers it, grouped by stream."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: 'By course' },
                ]}
                actions={
                    <Link
                        href="/colleges/state"
                        className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                    >
                        Browse by state
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                {courses.length === 0 ? (
                    <EmptyState icon="GraduationCap" title="No course-to-college mappings published yet" />
                ) : (
                    Object.entries(byCategory)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([categoryName, group]) => (
                            <SectionCard key={categoryName} title={categoryName} icon="GraduationCap">
                                <LinkTileGrid
                                    columns={4}
                                    items={group.map((course) => ({
                                        label: course.shortName ?? course.name,
                                        href: `/colleges/course/${course.slug}`,
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
