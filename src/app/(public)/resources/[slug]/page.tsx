import type { Metadata } from 'next';
import { ResourceDetail, buildResourceMetadataFor } from '@/components/resources/resource-detail';
import { listResourceSitemapSlugs } from '@/db/repositories/content.repository';

export const revalidate = 900;

export async function generateStaticParams() {
  const resources = await listResourceSitemapSlugs(500, {
    excludeTypes: ['guide', 'previous_year_paper', 'mock_test', 'ebook', 'webinar'],
  });
  return resources.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildResourceMetadataFor(slug, '/resources');
}

export default async function ResourcesDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ResourceDetail slug={slug} basePath="/resources" />;
}
