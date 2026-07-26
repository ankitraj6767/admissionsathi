import type { Metadata } from 'next';
import { ResourceListing } from '@/components/resources/resource-listing';
import { buildMetadata } from '@/lib/seo/metadata';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
    title: 'Free Mock Tests — Full-Length Entrance Exam Practice',
    description:
        'Attempt full-length mock tests matching the latest exam pattern for engineering, medical, management and law entrance exams.',
    path: '/mock-tests',
});

export default async function MockTestsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; year?: string; page?: string }>;
}) {
    const params = await searchParams;
    return (
        <ResourceListing
            type="mock_test"
            basePath="/mock-tests"
            eyebrow="Exam preparation"
            title="Mock tests"
            description="Timed, full-length tests that mirror the current exam pattern. Review every mistake in an error log."
            searchParams={params}
        />
    );
}
