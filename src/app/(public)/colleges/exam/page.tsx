import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { LinkTileGrid, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { listExamDirectoryRows } from '@/db/repositories/exam.repository';
import { EXAM_CATEGORY_LANDINGS } from '@/config/taxonomy';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
    title: 'Colleges by Entrance Exam — Who Accepts Your Score',
    description:
        'Find which colleges accept each entrance exam score, with fees, ranking and cut-off context for every participating institute.',
    path: '/colleges/exam',
});

export default async function CollegesByExamIndexPage() {
    const exams = await listExamDirectoryRows(80);

    const byCategory = exams.reduce<Record<string, typeof exams>>((acc, exam) => {
        const key = exam.category ?? 'Other';
        acc[key] = [...(acc[key] ?? []), exam];
        return acc;
    }, {});

    const categoryOrder = EXAM_CATEGORY_LANDINGS.map((entry) => entry.value);

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: 'By exam', href: '/colleges/exam' },
                ])}
            />

            <PageHeader
                eyebrow="Directory"
                title="Colleges by entrance exam"
                description="Already written an exam? Start here to see which colleges admit through it, then compare them on fees and ranking."
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: 'By exam' },
                ]}
                actions={
                    <Link
                        href="/predictors"
                        className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                    >
                        Predict your college
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                {exams.length === 0 ? (
                    <EmptyState icon="FileText" title="No exams published yet" />
                ) : (
                    Object.entries(byCategory)
                        .sort(([a], [b]) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b))
                        .map(([categoryName, group]) => (
                            <SectionCard key={categoryName} title={categoryName} icon="FileText">
                                <LinkTileGrid
                                    columns={4}
                                    items={group.map((exam) => ({
                                        label: exam.shortName,
                                        href: `/colleges/exam/${exam.slug}`,
                                        meta: exam.acceptedByCollegeCount
                                            ? `${exam.acceptedByCollegeCount}`
                                            : undefined,
                                    }))}
                                />
                            </SectionCard>
                        ))
                )}
            </div>
        </>
    );
}
