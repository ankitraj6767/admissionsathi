import type { Metadata } from 'next';
import { ResourceListing } from '@/components/resources/resource-listing';
import { buildMetadata } from '@/lib/seo/metadata';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
    title: 'Free E-Books — Admission & Exam Preparation Guides',
    description:
        'Downloadable e-books on entrance exam preparation, counselling processes, course selection and education finance.',
    path: '/ebooks',
});

export default async function EbooksPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const params = await searchParams;
    return (
        <ResourceListing
            type="ebook"
            basePath="/ebooks"
            eyebrow="Downloads"
            title="E-books"
            description="Compact, practical guides you can download and read offline."
            searchParams={params}
        />
    );
}
