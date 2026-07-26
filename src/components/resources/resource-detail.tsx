import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, KeyValueGrid, RichText, SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { getResourceBySlug, listResources } from '@/db/repositories/content.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { RESOURCE_TYPE_META } from './resource-listing';
import { formatDate } from '@/lib/utils';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import type { ResourceType } from '@/config/constants';

/** Shared detail view for every resource type. */
export async function ResourceDetail({ slug, basePath }: { slug: string; basePath: string }) {
    const resource = await getResourceBySlug(slug);
    if (!resource) notFound();

    const meta = RESOURCE_TYPE_META[resource.type as ResourceType];
    const related = toPlain(
        await listResources({ type: resource.type, pageSize: 6 }),
    ).items.filter((item) => item.slug !== resource.slug);

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: meta?.plural ?? 'Resources', href: basePath },
                    { label: resource.title, href: `${basePath}/${resource.slug}` },
                ])}
            />

            <PageHeader
                eyebrow={meta?.label ?? 'Resource'}
                title={resource.title}
                description={resource.description}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: meta?.plural ?? 'Resources', href: basePath },
                    { label: resource.title },
                ]}
                actions={
                    resource.fileUrl ? (
                        <a
                            href={resource.fileUrl}
                            download
                            className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                            data-analytics="resource_download"
                        >
                            Download
                        </a>
                    ) : resource.externalUrl ? (
                        <a
                            href={resource.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                        >
                            Open resource
                        </a>
                    ) : undefined
                }
            />

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="space-y-4">
                        <SectionCard title="Details" icon={meta?.icon ?? 'FileText'}>
                            <KeyValueGrid
                                columns={4}
                                items={[
                                    { label: 'Type', value: meta?.label ?? resource.type },
                                    { label: 'Exam', value: resource.relatedExamName ?? '—' },
                                    { label: 'Year', value: resource.year ?? '—' },
                                    { label: 'Published', value: formatDate(resource.publishedAt) },
                                    { label: 'Questions', value: resource.questionCount ?? '—' },
                                    { label: 'Duration', value: resource.durationMinutes ? `${resource.durationMinutes} min` : '—' },
                                    { label: 'Difficulty', value: resource.difficulty ?? '—' },
                                    { label: 'Access', value: resource.isFree ? 'Free' : `₹${resource.price ?? 0}` },
                                ]}
                            />
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {resource.isFree ? <Badge tone="green">Free</Badge> : <Badge tone="orange">Paid</Badge>}
                                {resource.requiresLogin ? <Badge tone="neutral">Login required</Badge> : null}
                                {resource.fileSizeKb ? <Badge tone="neutral">{resource.fileSizeKb} KB</Badge> : null}
                            </div>
                        </SectionCard>

                        {resource.contentHtml ? (
                            <SectionCard title="Contents" icon="BookOpen">
                                <RichText html={resource.contentHtml} />
                            </SectionCard>
                        ) : null}

                        {resource.videoUrl ? (
                            <SectionCard title="Video" icon="Video">
                                <div className="aspect-video overflow-hidden rounded-[12px] border border-line">
                                    <iframe
                                        src={resource.videoUrl}
                                        title={resource.title}
                                        loading="lazy"
                                        className="h-full w-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                </div>
                            </SectionCard>
                        ) : null}

                        <CtaBanner
                            title="Preparing for this exam?"
                            description="Get a free counselling session to build a study and application plan around your target colleges."
                            ctaLabel="Book free counselling"
                            ctaUrl="/book-counselling"
                        />
                    </div>

                    <aside>
                        {related.length > 0 ? (
                            <SectionCard title={`More ${meta?.plural ?? 'resources'}`} icon={meta?.icon ?? 'FileText'}>
                                <ul className="space-y-2">
                                    {related.slice(0, 6).map((item) => (
                                        <li key={String(item._id)}>
                                            <Link
                                                href={`${basePath}/${item.slug}`}
                                                className="block text-[12.5px] font-semibold text-ink hover:text-navy-700"
                                            >
                                                {item.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}
                    </aside>
                </div>
            </div>
        </>
    );
}

export async function buildResourceMetadataFor(slug: string, basePath: string) {
    const resource = await getResourceBySlug(slug);
    const { buildMetadata } = await import('@/lib/seo/metadata');
    if (!resource) {
        return buildMetadata({ title: 'Resource not found', path: `${basePath}/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: resource.seo?.title ?? resource.title,
        description: resource.seo?.description ?? resource.description,
        path: `${basePath}/${resource.slug}`,
    });
}
