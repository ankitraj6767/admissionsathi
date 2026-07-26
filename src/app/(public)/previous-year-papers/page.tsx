import type { Metadata } from 'next';
import { ResourceListing } from '@/components/resources/resource-listing';
import { buildMetadata } from '@/lib/seo/metadata';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
    title: 'Previous Year Question Papers — Free PDF Downloads',
    description:
        'Download previous-year question papers with answer keys for JEE Main, NEET, CUET, CAT, CLAT and other entrance exams.',
    path: '/previous-year-papers',
});

export default async function PreviousYearPapersPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; year?: string; page?: string }>;
}) {
    const params = await searchParams;
    return (
        <ResourceListing
            type="previous_year_paper"
            basePath="/previous-year-papers"
            eyebrow="Exam preparation"
            title="Previous year papers"
            description="Past papers with answer keys. Solve them under timed conditions — it is the single highest-return prep activity."
            searchParams={params}
        />
    );
}
