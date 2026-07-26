import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { CtaBanner, FaqAccordion, RichText, SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { getArticleBySlug, listRelatedArticles } from '@/db/repositories/content.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { incrementViewCount } from '@/services/analytics.service';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import {
    JsonLd,
    buildArticleJsonLd,
    buildBreadcrumbJsonLd,
    buildFaqJsonLd,
} from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) return buildMetadata({ title: 'Article not found', path: `/articles/${slug}`, noIndex: true });

    return buildMetadata({
        title: article.seo?.title ?? article.title,
        description: article.seo?.description ?? article.excerpt,
        path: `/articles/${article.slug}`,
        ogImage: article.featuredImage?.url,
        type: 'article',
        publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
        modifiedTime: new Date(article.updatedAt).toISOString(),
        authors: article.authorName ? [article.authorName] : undefined,
        keywords: article.tags,
    });
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) notFound();

    const related = toPlain(await listRelatedArticles(article, 4));
    void incrementViewCount('article', String(article._id));

    const faqJson = buildFaqJsonLd((article.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })));

    return (
        <>
            <JsonLd
                data={[
                    buildArticleJsonLd({
                        title: article.title,
                        slug: article.slug,
                        excerpt: article.excerpt,
                        contentHtml: article.contentHtml,
                        image: article.featuredImage?.url,
                        authorName: article.authorName,
                        publishedAt: article.publishedAt,
                        updatedAt: article.updatedAt,
                    }),
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Articles', href: '/articles' },
                        { label: article.title, href: `/articles/${article.slug}` },
                    ]),
                    ...(faqJson ? [faqJson] : []),
                ]}
            />

            <PageHeader
                eyebrow={article.category}
                title={article.title}
                description={article.excerpt}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Articles', href: '/articles' },
                    { label: article.category, href: `/articles?category=${encodeURIComponent(article.category)}` },
                ]}
            />

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <article className="space-y-4">
                        <div className="rounded-panel border border-line bg-white p-4 shadow-card md:p-6">
                            <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line pb-3 text-[11.5px] text-ink-soft">
                                <span className="font-semibold text-ink">{article.authorName}</span>
                                <span>• {formatDate(article.publishedAt)}</span>
                                <span>• {article.readingTimeMinutes} min read</span>
                                <span>• {article.viewCount.toLocaleString('en-IN')} views</span>
                            </p>

                            <RichText html={article.contentHtml} />

                            {article.tags?.length ? (
                                <div className="mt-5 flex flex-wrap gap-1.5 border-t border-line pt-4">
                                    {article.tags.map((tag) => (
                                        <Link key={tag} href={`/articles?tag=${encodeURIComponent(tag)}`} className="chip">
                                            #{tag}
                                        </Link>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        {article.faqs?.length ? (
                            <SectionCard title="FAQs" icon="CircleHelp">
                                <FaqAccordion faqs={article.faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
                            </SectionCard>
                        ) : null}

                        <CtaBanner
                            title="Want this reviewed for your own case?"
                            description="Book a free counselling session and apply this guidance to your actual marks and budget."
                            ctaLabel="Book free counselling"
                            ctaUrl="/book-counselling"
                        />
                    </article>

                    <aside className="space-y-4">
                        {article.tableOfContents?.length ? (
                            <SectionCard title="On this page" icon="ListChecks">
                                <ul className="space-y-1.5">
                                    {article.tableOfContents.map((item) => (
                                        <li key={item.id}>
                                            <a
                                                href={`#${item.id}`}
                                                className="block truncate text-[12.5px] text-ink-soft hover:text-navy-700"
                                            >
                                                {item.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        {related.length > 0 ? (
                            <SectionCard title="Related articles" icon="Newspaper">
                                <ul className="space-y-2.5">
                                    {related.map((item) => (
                                        <li key={String(item._id)}>
                                            <Link href={`/articles/${item.slug}`} className="group block">
                                                <Badge tone="neutral">{item.category}</Badge>
                                                <span className="mt-1 block text-[12.5px] font-semibold text-ink group-hover:text-navy-700">
                                                    {item.title}
                                                </span>
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
