import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { Badge, Card, SectionHeader } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';
import type { ArticleDoc } from '@/db/models/content.model';

/**
 * Latest guides and insights.
 *
 * Gives the fifty seeded articles a route in from the homepage, which matters for
 * internal linking as much as for readers. The featured image is optional by
 * design — an editorial card without art still has to look finished.
 */
export function LatestArticlesSection({
    heading,
    description,
    ctaLabel,
    ctaUrl,
    articles,
}: {
    heading: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    articles: ArticleDoc[];
}) {
    if (articles.length === 0) return null;

    return (
        <Card as="section" aria-labelledby="latest-articles-heading">
            <SectionHeader
                title={heading}
                description={description}
                ctaLabel={ctaLabel}
                ctaUrl={ctaUrl}
                compact
            />

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                    <li key={String(article._id)}>
                        <article className="flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card">
                            {article.featuredImage?.url ? (
                                <Link href={`/articles/${article.slug}`} className="relative block aspect-[16/9] bg-muted">
                                    <Image
                                        src={article.featuredImage.url}
                                        alt={article.featuredImage.alt ?? article.title}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover"
                                    />
                                </Link>
                            ) : null}

                            <div className="flex flex-1 flex-col p-3.5">
                                <Badge tone="navy" className="self-start">
                                    {article.category}
                                </Badge>

                                <h3 className="mt-2 line-clamp-2 text-[13.5px] font-extrabold leading-snug text-ink">
                                    <Link href={`/articles/${article.slug}`} className="hover:text-navy-700">
                                        {article.title}
                                    </Link>
                                </h3>

                                {article.excerpt ? (
                                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-soft">
                                        {article.excerpt}
                                    </p>
                                ) : null}

                                <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[10.5px] text-ink-soft">
                                    <span className="truncate">
                                        {article.authorName ? `${article.authorName} • ` : ''}
                                        {formatDate(article.publishedAt, { day: '2-digit', month: 'short' })}
                                    </span>
                                    {article.readingTimeMinutes ? (
                                        <span className="flex shrink-0 items-center gap-1">
                                            <Clock className="h-3 w-3" aria-hidden />
                                            {article.readingTimeMinutes} min
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </article>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
