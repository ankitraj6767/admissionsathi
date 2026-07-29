import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { LinkTileGrid, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { listCourseCategories } from '@/db/repositories/course.repository';
import { COURSE_LEVEL_LANDINGS } from '@/config/taxonomy';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
    title: 'Courses by Stream — Engineering, Medical, Management & More',
    description:
        'Browse every course stream we track, with the number of programmes and colleges in each. Pick a stream to see its courses, fees and eligibility.',
    path: '/courses/category',
});

export default async function CourseCategoryIndexPage() {
    const categories = await listCourseCategories({ limit: 40 });

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: 'By stream', href: '/courses/category' },
                ])}
            />

            <PageHeader
                eyebrow="Directory"
                title="Courses by stream"
                description="Every stream on the platform with its programme and college counts. Pick one to see eligibility, fees and admission routes."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: 'By stream' },
                ]}
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title="Streams" icon="LayoutGrid">
                    {categories.length === 0 ? (
                        <EmptyState icon="LayoutGrid" title="No streams published yet" />
                    ) : (
                        <LinkTileGrid
                            items={categories.map((category) => ({
                                label: category.name,
                                href: `/courses/category/${category.slug}`,
                                description: category.subtitle ?? category.description,
                                meta: `${category.courseCount} courses`,
                            }))}
                        />
                    )}
                </SectionCard>

                <SectionCard title="Or browse by level" icon="ListChecks">
                    <LinkTileGrid
                        columns={4}
                        items={COURSE_LEVEL_LANDINGS.map((entry) => ({
                            label: entry.label,
                            href: `/courses/level/${entry.slug}`,
                        }))}
                    />
                </SectionCard>
            </div>
        </>
    );
}
