import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { SortSelect } from '@/components/shared/sort-select';
import { CtaBanner, LinkTileGrid, SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState, IconTile } from '@/components/ui/primitives';
import { EXAM_CATEGORY_LANDINGS, findExamCategoryLanding } from '@/config/taxonomy';
import { EXAM_SORTS, resolveExamFilters, searchExams, type ExamSearchParams } from '@/services/exam.service';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 600;

/** Categories come from a fixed enum, so every landing page can be pre-rendered. */
export function generateStaticParams() {
    return EXAM_CATEGORY_LANDINGS.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const category = findExamCategoryLanding(slug);
    if (!category) {
        return buildMetadata({ title: 'Category not found', path: `/exams/category/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: `${category.label} Entrance Exams — Dates, Eligibility & Results`,
        description: category.description,
        path: `/exams/category/${category.slug}`,
    });
}

export default async function ExamsByCategoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<ExamSearchParams>;
}) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const category = findExamCategoryLanding(slug);
    if (!category) notFound();

    const result = await searchExams({ ...resolveExamFilters(query), category: category.value });
    const basePath = `/exams/category/${category.slug}`;

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Exams', href: '/exams' },
                        { label: `${category.label} exams`, href: basePath },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((e) => ({ name: e.shortName, url: `/exams/${e.slug}` })),
                        `${category.label} entrance exams`,
                    ),
                ]}
            />

            <PageHeader
                eyebrow="By category"
                title={`${category.label} entrance exams`}
                description={category.description}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Exams', href: '/exams' },
                    { label: category.label },
                ]}
                actions={
                    <Link
                        href={`/exams?category=${encodeURIComponent(category.value)}`}
                        className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                    >
                        Open in exam tracker
                    </Link>
                }
            />

            <div className="shell space-y-4 py-6">
                <SectionCard
                    title={`${result.total} ${category.label.toLowerCase()} exams tracked`}
                    icon="FileText"
                    actions={<SortSelect options={EXAM_SORTS} basePath={basePath} defaultValue="default" />}
                >
                    {result.items.length === 0 ? (
                        <EmptyState icon="FileText" title={`No ${category.label.toLowerCase()} exams published yet`} />
                    ) : (
                        <ul className="grid gap-3 sm:grid-cols-2">
                            {result.items.map((exam) => (
                                <li key={String(exam._id)}>
                                    <article className="flex h-full flex-col rounded-panel border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised">
                                        <div className="flex items-start gap-3">
                                            <IconTile icon="FileText" tone="navy" />
                                            <div className="min-w-0 flex-1">
                                                <h2 className="text-[14px] font-extrabold text-ink">
                                                    <Link href={`/exams/${exam.slug}`} className="hover:text-navy-700">
                                                        {exam.shortName} {exam.examYear}
                                                    </Link>
                                                </h2>
                                                <p className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-soft">{exam.name}</p>
                                            </div>
                                            {exam.predictorEnabled ? <Badge tone="green">Predictor</Badge> : null}
                                        </div>

                                        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
                                            <div>
                                                <dt className="text-ink-soft">Registration ends</dt>
                                                <dd className="font-semibold text-ink">{formatDate(exam.registrationEnd)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-ink-soft">Exam date</dt>
                                                <dd className="font-semibold text-ink">{formatDate(exam.examDateFrom)}</dd>
                                            </div>
                                        </dl>

                                        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                                            <Link
                                                href={`/colleges/exam/${exam.slug}`}
                                                className="text-[11.5px] font-bold text-navy-600 hover:text-orange"
                                            >
                                                Colleges accepting
                                            </Link>
                                            <Link
                                                href={`/exams/${exam.slug}`}
                                                className="inline-flex h-8 items-center rounded-[8px] bg-navy px-3 text-[11.5px] font-bold text-white hover:bg-navy-800"
                                            >
                                                Exam details
                                            </Link>
                                        </div>
                                    </article>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Pagination
                        className="mt-5"
                        basePath={basePath}
                        params={query as Record<string, string | undefined>}
                        page={result.page}
                        totalPages={result.totalPages}
                        total={result.total}
                        pageSize={result.pageSize}
                    />
                </SectionCard>

                <SectionCard title="Other exam categories" icon="LayoutGrid">
                    <LinkTileGrid
                        columns={4}
                        items={EXAM_CATEGORY_LANDINGS.filter((entry) => entry.slug !== category.slug).map((entry) => ({
                            label: entry.label,
                            href: `/exams/category/${entry.slug}`,
                        }))}
                    />
                </SectionCard>

                <CtaBanner
                    title={`Preparing for a ${category.label.toLowerCase()} exam?`}
                    description="Get a counsellor to sanity-check your target colleges against last year's cut-offs."
                    ctaLabel="Book free counselling"
                    ctaUrl="/book-counselling?type=college"
                    tone="teal"
                />
            </div>
        </>
    );
}
