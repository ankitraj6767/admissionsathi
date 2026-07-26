import type { Metadata } from 'next';
import { ResourceListing } from '@/components/resources/resource-listing';
import { buildMetadata } from '@/lib/seo/metadata';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
    title: 'Study Resources — Papers, Mock Tests, Guides & Webinars',
    description:
        'Previous-year question papers, mock tests, e-books, webinars, admission calendars and state counselling guides — all free to access.',
    path: '/resources',
});

export default async function ResourcesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; type?: string; year?: string; page?: string }>;
}) {
    const params = await searchParams;
    return (
        <ResourceListing
            basePath="/resources"
            title="Study resources"
            description="Papers, mock tests, guides, e-books and webinars maintained by our content team."
            searchParams={params}
        />
    );
}
