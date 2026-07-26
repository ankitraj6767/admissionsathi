import type { Metadata } from 'next';
import { ResourceListing } from '@/components/resources/resource-listing';
import { buildMetadata } from '@/lib/seo/metadata';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
    title: 'Admission Webinars — Live & Recorded Expert Sessions',
    description:
        'Join live webinars on counselling strategy, course selection, exam preparation and education loans, or watch the recordings.',
    path: '/webinars',
});

export default async function WebinarsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const params = await searchParams;
    return (
        <ResourceListing
            type="webinar"
            basePath="/webinars"
            eyebrow="Live sessions"
            title="Webinars"
            description="Expert sessions on counselling, course selection and finance — attend live or catch the recording."
            searchParams={params}
        />
    );
}
