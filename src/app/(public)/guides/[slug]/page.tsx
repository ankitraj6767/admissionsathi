import type { Metadata } from 'next';
import { ResourceDetail, buildResourceMetadataFor } from '@/components/resources/resource-detail';

export const revalidate = 900;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildResourceMetadataFor(slug, '/guides');
}

export default async function GuidesDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ResourceDetail slug={slug} basePath="/guides" />;
}
