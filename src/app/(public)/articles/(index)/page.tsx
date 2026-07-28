import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { SearchBox } from '@/components/search/search-box';
import { Badge, Chip, EmptyState } from '@/components/ui/primitives';
import { listArticles } from '@/db/repositories/content.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 600;

const CATEGORIES = [
    'Admission Guidance',
    'Counselling',
    'Course Guidance',
    'Career Guidance',
    'Exam Preparation',
    'Fees & Finance',
    'Scholarships',
    'Student Life',
];

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}): Promise<Metadata> {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    return buildMetadata({
        title: params.category
            ? `${params.category} Articles — Admission Sathi`
            : page > 1
                ? `Articles — Page ${page}`
                : 'Admission & Career Articles — Practical Guidance',
        description:
            'Editorial guides on choosing courses and colleges, entrance exam preparation, counselling rounds, education loans and scholarships.',
        path: '/articles',
        noIndex: Boolean(params.q),
    });
}

export default async function ArticlesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; category?: string; tag?: string; page?: string; sort?: string }>;
}) {
    const params = await searchParams;
    const result = toPlain(
        await listArticles({
            q: params.q,
            category: params.category,
            tag: params.tag,
            page: Number(params.page) || 1,
            pageSize: 12,
            sort: params.sort,
        }),
    );

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Articles', href: '/articles' },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((a) => ({ name: a.title, url: `/articles/${a.slug}` })),
                        'Articles',
                    ),
                ]}
            />

            <PageHeader
                eyebrow="Resources"
                title="Articles & guides"
                description="Practical, jargon-free guidance written by counsellors who work on admissions every season."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Articles' }]}
            >
                <div className="max-w-2xl">
                    <SearchBox placeholder="Search articles…" types={['article']} size="md" />
                </div>
            </PageHeader>

            <div className="shell py-6">
                <div className="mb-5 flex flex-wrap gap-1.5">
                    <Chip href="/articles" active={!params.category}>
                        All
                    </Chip>
                    {CATEGORIES.map((category) => (
                        <Chip
                            key={category}
                            href={`/articles?category=${encodeURIComponent(category)}`}
                            active={params.category === category}
                        >
                            {category}
                        </Chip>
                    ))}
                </div>

                {result.items.length === 0 ? (
                    <EmptyState icon="Newspaper" title="No articles found" description="Try another category or keyword." />
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {result.items.map((article) => (
                            <li key={String(article._id)}>
                                <article className="flex h-full flex-col rounded-panel border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised">
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge tone="navy">{article.category}</Badge>
                                        <span className="text-[10.5px] text-ink-soft">{article.readingTimeMinutes} min read</span>
                                    </div>
                                    <h2 className="mt-2 text-[14px] font-extrabold leading-snug text-ink">
                                        <Link href={`/articles/${article.slug}`} className="hover:text-navy-700">
                                            {article.title}
                                        </Link>
                                    </h2>
                                    <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-ink-soft">
                                        {article.excerpt}
                                    </p>
                                    <p className="mt-auto pt-3 text-[11px] text-ink-soft">
                                        {article.authorName} • {formatDate(article.publishedAt)}
                                    </p>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}

                <Pagination
                    className="mt-6"
                    basePath="/articles"
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
