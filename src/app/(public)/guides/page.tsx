import type { Metadata } from 'next';
import { ResourceListing } from '@/components/resources/resource-listing';
import { buildMetadata } from '@/lib/seo/metadata';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
    title: 'Admission Guides — Step-by-Step Counselling & Application Help',
    description:
        'Step-by-step guides on entrance exam applications, counselling rounds, document checklists, course selection and education finance.',
    path: '/guides',
});

export default async function GuidesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const params = await searchParams;
    return (
        <ResourceListing
            type="guide"
            basePath="/guides"
            eyebrow="How-to"
            title="Guides"
            description="Practical, step-by-step walkthroughs of the admission process — written by counsellors who run it every season."
            searchParams={params}
        />
    );
}
