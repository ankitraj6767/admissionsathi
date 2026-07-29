import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { LinkTileGrid, SectionCard } from '@/components/shared/content-blocks';
import { listCourseCategories } from '@/db/repositories/course.repository';
import { COURSE_LEVEL_LANDINGS } from '@/config/taxonomy';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
    title: 'Courses by Level — Certificate to Doctorate',
    description:
        'Browse programmes by study level: certificate, diploma, undergraduate, postgraduate, doctorate and integrated degrees.',
    path: '/courses/level',
});

export default async function CoursesByLevelIndexPage() {
    const categories = await listCourseCategories({ limit: 12 });

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: 'By level', href: '/courses/level' },
                ])}
            />

            <PageHeader
                eyebrow="Directory"
                title="Courses by level"
                description="Study level decides eligibility, duration and which entrance exams apply. Start from the level you are admitting into."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Courses', href: '/courses' },
                    { label: 'By level' },
                ]}
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title="Study levels" icon="ListChecks">
                    <LinkTileGrid
                        items={COURSE_LEVEL_LANDINGS.map((entry) => ({
                            label: `${entry.label} courses`,
                            href: `/courses/level/${entry.slug}`,
                            description: entry.description,
                        }))}
                    />
                </SectionCard>

                <SectionCard title="Or browse by stream" icon="LayoutGrid">
                    <LinkTileGrid
                        columns={4}
                        items={categories.map((category) => ({
                            label: category.name,
                            href: `/courses/category/${category.slug}`,
                            meta: String(category.courseCount),
                        }))}
                    />
                </SectionCard>
            </div>
        </>
    );
}
