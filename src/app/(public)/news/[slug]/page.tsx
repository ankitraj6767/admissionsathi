import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, RichText, SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { getNewsBySlug, listTrendingUpdates } from '@/db/repositories/content.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { TRENDING_CATEGORY_LABELS, type TrendingCategory } from '@/config/constants';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildArticleJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 300;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const post = await getNewsBySlug(slug);
    if (!post) return buildMetadata({ title: 'Update not found', path: `/news/${slug}`, noIndex: true });
    return buildMetadata({
        title: post.seo?.title ?? post.title,
        description: post.seo?.description ?? post.summary,
        path: `/news/${post.slug}`,
        type: 'article',
        publishedTime: new Date(post.publishDate).toISOString(),
    });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getNewsBySlug(slug);
    if (!post) notFound();

    const others = toPlain(await listTrendingUpdates({ limit: 8 }));

    return (
        <>
            <JsonLd
                data={[
                    buildArticleJsonLd({
                        title: post.title,
                        slug: post.slug,
                        excerpt: post.summary,
                        contentHtml: post.contentHtml,
                        publishedAt: post.publishDate,
                        updatedAt: post.updatedAt,
                    }),
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'News', href: '/news' },
                        { label: post.title, href: `/news/${post.slug}` },
                    ]),
                ]}
            />

            <PageHeader
                eyebrow={TRENDING_CATEGORY_LABELS[post.category as TrendingCategory] ?? post.category}
                title={post.title}
                description={post.summary}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'News', href: '/news' },
                    { label: post.title },
                ]}
            />

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="space-y-4">
                        <div className="rounded-panel border border-line bg-white p-4 shadow-card md:p-6">
                            <p className="mb-3 flex flex-wrap items-center gap-2 border-b border-line pb-3 text-[11.5px] text-ink-soft">
                                <Badge tone="navy">
                                    {TRENDING_CATEGORY_LABELS[post.category as TrendingCategory] ?? post.category}
                                </Badge>
                                <span>Published {formatDate(post.publishDate)}</span>
                                {post.expiryDate ? <span>• Valid till {formatDate(post.expiryDate)}</span> : null}
                            </p>

                            <RichText html={post.contentHtml} />

                            {post.externalUrl ? (
                                <a
                                    href={post.externalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-[12.5px] font-bold text-white hover:bg-navy-800"
                                >
                                    Open official notification
                                </a>
                            ) : null}
                        </div>

                        <CtaBanner
                            title="Not sure how this affects you?"
                            description="Ask a counsellor — free — and get a clear next step for your application."
                            ctaLabel="Book free counselling"
                            ctaUrl="/book-counselling"
                        />
                    </div>

                    <aside>
                        <SectionCard title="More updates" icon="Flame">
                            <ul className="space-y-2.5">
                                {others
                                    .filter((item) => item.slug !== post.slug)
                                    .slice(0, 6)
                                    .map((item) => (
                                        <li key={String(item._id)}>
                                            <Link href={`/news/${item.slug}`} className="group block">
                                                <span className="block text-[12.5px] font-semibold text-ink group-hover:text-navy-700">
                                                    {item.title}
                                                </span>
                                                <span className="mt-0.5 block text-[10.5px] text-ink-soft">
                                                    {formatDate(item.publishDate)}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                            </ul>
                            <Link href="/news" className="link-more mt-3 inline-flex">
                                All updates →
                            </Link>
                        </SectionCard>
                    </aside>
                </div>
            </div>
        </>
    );
}
