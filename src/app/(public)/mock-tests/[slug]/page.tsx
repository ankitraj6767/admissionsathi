import type { Metadata } from 'next';
import { ResourceDetail, buildResourceMetadataFor } from '@/components/resources/resource-detail';
import { listResourceSitemapSlugs } from '@/db/repositories/content.repository';

export const revalidate = 900;

export async function generateStaticParams() {
  const resources = await listResourceSitemapSlugs(500, { type: 'mock_test' });
  return resources.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildResourceMetadataFor(slug, '/mock-tests');
}

export default async function MockTestsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ResourceDetail slug={slug} basePath="/mock-tests" />;
}
