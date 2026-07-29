import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { LinkTileGrid, SectionCard } from '@/components/shared/content-blocks';
import { EXAM_CATEGORY_LANDINGS } from '@/config/taxonomy';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
    title: 'Entrance Exams by Category — Engineering, Medical, Law & More',
    description:
        'Browse entrance exams grouped by category, from engineering and medical to law, design and common university tests.',
    path: '/exams/category',
});

export default function ExamCategoryIndexPage() {
    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Exams', href: '/exams' },
                    { label: 'By category', href: '/exams/category' },
                ])}
            />

            <PageHeader
                eyebrow="Directory"
                title="Entrance exams by category"
                description="Each category groups the exams that feed the same set of programmes, so you can compare windows and patterns side by side."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Exams', href: '/exams' },
                    { label: 'By category' },
                ]}
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title="Categories" icon="LayoutGrid">
                    <LinkTileGrid
                        items={EXAM_CATEGORY_LANDINGS.map((entry) => ({
                            label: `${entry.label} exams`,
                            href: `/exams/category/${entry.slug}`,
                            description: entry.description,
                        }))}
                    />
                </SectionCard>
            </div>
        </>
    );
}
