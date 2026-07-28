import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { FilterPanel } from '@/components/shared/filter-panel';
import { SortSelect } from '@/components/shared/sort-select';
import { Pagination } from '@/components/shared/pagination';
import { SearchBox } from '@/components/search/search-box';
import { Badge, EmptyState, IconTile } from '@/components/ui/primitives';
import {
    EXAM_SORTS,
    buildExamFilterGroups,
    resolveExamFilters,
    searchExams,
    type ExamSearchParams,
} from '@/services/exam.service';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 600;

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<ExamSearchParams>;
}): Promise<Metadata> {
    const params = await searchParams;
    return buildMetadata({
        title: 'Entrance Exams in India — Dates, Eligibility, Pattern & Results',
        description:
            'Track engineering, medical, management, law and university entrance exams: registration windows, exam dates, eligibility, pattern, syllabus, results and counselling.',
        path: '/exams',
        noIndex: Boolean(params.q),
    });
}

export default async function ExamsPage({
    searchParams,
}: {
    searchParams: Promise<ExamSearchParams>;
}) {
    const params = await searchParams;
    const filters = resolveExamFilters(params);
    const [result, filterGroups] = await Promise.all([searchExams(filters), buildExamFilterGroups()]);

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Exams', href: '/exams' },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((e) => ({ name: e.shortName, url: `/exams/${e.slug}` })),
                        'Entrance exams',
                    ),
                ]}
            />

            <PageHeader
                eyebrow="Exam tracker"
                title="Entrance exams"
                description="Registration windows, exam dates, eligibility, pattern, syllabus, cut-off trends and counselling — for every major entrance exam."
                breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Exams' }]}
            >
                <div className="max-w-2xl">
                    <SearchBox placeholder="Search exams, e.g. JEE Main, NEET, CAT…" types={['exam']} size="md" />
                </div>
            </PageHeader>

            <div className="shell py-6">
                <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <FilterPanel groups={filterGroups} basePath="/exams" className="sticky top-24 self-start" />

                    <div>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-[13px] text-ink-soft">
                                <span className="font-bold text-ink">{result.total}</span> exams tracked
                            </p>
                            <SortSelect options={EXAM_SORTS} basePath="/exams" defaultValue="default" />
                        </div>

                        {result.items.length === 0 ? (
                            <EmptyState icon="FileText" title="No exams match these filters" />
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
                                                <div>
                                                    <dt className="text-ink-soft">Mode</dt>
                                                    <dd className="font-semibold text-ink">{exam.mode?.[0] ?? '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-ink-soft">Colleges accepting</dt>
                                                    <dd className="font-semibold text-ink">{exam.acceptedByCollegeCount}</dd>
                                                </div>
                                            </dl>

                                            <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                                                <Link href={`/exams/${exam.slug}/dates`} className="text-[11.5px] font-bold text-navy-600 hover:text-orange">
                                                    Important dates
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
                            className="mt-6"
                            basePath="/exams"
                            params={params as Record<string, string | undefined>}
                            page={result.page}
                            totalPages={result.totalPages}
                            total={result.total}
                            pageSize={result.pageSize}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
