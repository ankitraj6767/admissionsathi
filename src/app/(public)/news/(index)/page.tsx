import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Badge, Chip, EmptyState } from '@/components/ui/primitives';
import { listNews } from '@/db/repositories/content.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { TRENDING_CATEGORIES, TRENDING_CATEGORY_LABELS, type TrendingCategory } from '@/config/constants';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 180;

export const metadata: Metadata = buildMetadata({
    title: 'Admission News & Updates — Exams, Counselling & Deadlines',
    description:
        'Live admission updates: registration windows, exam dates, admit cards, results, counselling schedules and application deadlines.',
    path: '/news',
});

export default async function NewsPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string; page?: string; q?: string }>;
}) {
    const params = await searchParams;
    const result = toPlain(
        await listNews({
            q: params.q,
            category: params.category,
            page: Number(params.page) || 1,
            pageSize: 15,
        }),
    );

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'News', href: '/news' },
                ])}
            />

            <PageHeader
                eyebrow="Live updates"
                title="Admission news & updates"
                description="Registration windows, exam dates, admit cards, results and counselling notices — updated as they are announced."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'News' }]}
            />

            <div className="shell py-6">
                <div className="mb-5 flex flex-wrap gap-1.5">
                    <Chip href="/news" active={!params.category}>
                        All updates
                    </Chip>
                    {TRENDING_CATEGORIES.map((category) => (
                        <Chip key={category} href={`/news?category=${category}`} active={params.category === category}>
                            {TRENDING_CATEGORY_LABELS[category as TrendingCategory]}
                        </Chip>
                    ))}
                </div>

                {result.items.length === 0 ? (
                    <EmptyState icon="Newspaper" title="No updates in this category yet" />
                ) : (
                    <ul className="space-y-2.5">
                        {result.items.map((item) => {
                            const href = item.internalUrl ?? item.externalUrl ?? `/news/${item.slug}`;
                            const external = Boolean(item.externalUrl && !item.internalUrl);
                            return (
                                <li key={String(item._id)}>
                                    <article className="rounded-panel border border-line bg-white p-4 shadow-card transition-colors hover:border-navy-200">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                                    <Badge tone="navy">
                                                        {TRENDING_CATEGORY_LABELS[item.category as TrendingCategory] ?? item.category}
                                                    </Badge>
                                                    {item.badge ? <Badge tone="solidOrange">{item.badge}</Badge> : null}
                                                    {item.targetExamName ? <Badge tone="neutral">{item.targetExamName}</Badge> : null}
                                                </div>
                                                <h2 className="text-[14px] font-extrabold leading-snug text-ink">
                                                    <Link
                                                        href={href}
                                                        target={external ? '_blank' : undefined}
                                                        rel={external ? 'noopener noreferrer' : undefined}
                                                        className="hover:text-navy-700"
                                                    >
                                                        {item.title}
                                                    </Link>
                                                </h2>
                                                {item.summary ? (
                                                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{item.summary}</p>
                                                ) : null}
                                            </div>
                                            <p className="shrink-0 text-right text-[11px] text-ink-soft">
                                                <span className="block font-semibold text-ink">{formatDate(item.publishDate)}</span>
                                                <span>{formatRelativeTime(item.publishDate)}</span>
                                            </p>
                                        </div>
                                    </article>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <Pagination
                    className="mt-6"
                    basePath="/news"
                    params={params as Record<string, string | undefined>}
                    page={result.page}
                    totalPages={result.totalPages}
                    total={result.total}
                    pageSize={result.pageSize}
                />
            </div>
        </>
    );
}
