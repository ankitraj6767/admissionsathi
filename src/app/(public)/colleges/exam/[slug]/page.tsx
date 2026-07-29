import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { CollegeCard, toCollegeCard } from '@/components/colleges/college-card';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { getExamBySlug } from '@/db/repositories/exam.repository';
import { listStates } from '@/db/repositories/geo.repository';
import { resolveCollegeFilters, searchColleges } from '@/services/college.service';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const exam = await getExamBySlug(slug);
    if (!exam) {
        return buildMetadata({ title: 'Exam not found', path: `/colleges/exam/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: `Colleges Accepting ${exam.shortName} ${exam.examYear} — Fees, Cut-off & Admission`,
        description: `Every college that accepts ${exam.shortName} scores, with fees, ranking, accreditation and previous cut-off trends.`,
        path: `/colleges/exam/${exam.slug}`,
    });
}

export default async function CollegesByExamPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const exam = await getExamBySlug(slug);
    if (!exam) notFound();

    const filters = await resolveCollegeFilters(query, { examId: String(exam._id) });
    const [result, states] = await Promise.all([
        searchColleges(filters),
        listStates({ featuredOnly: true, limit: 12 }),
    ]);

    const basePath = `/colleges/exam/${exam.slug}`;

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Colleges', href: '/colleges' },
                        { label: `${exam.shortName} colleges`, href: basePath },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((c) => ({ name: c.name, url: `/colleges/${c.slug}` })),
                        `Colleges accepting ${exam.shortName}`,
                    ),
                ]}
            />

            <PageHeader
                eyebrow={`${exam.category} • ${exam.level}`}
                title={`Colleges accepting ${exam.shortName}`}
                description={`${result.total} colleges admit students through ${exam.name}. Compare them on fees, ranking, placements and the courses on offer before counselling opens.`}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Colleges', href: '/colleges' },
                    { label: `${exam.shortName} colleges` },
                ]}
                actions={
                    <>
                        <Link
                            href={`/exams/${exam.slug}`}
                            className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                        >
                            Exam details
                        </Link>
                        {exam.predictorEnabled ? (
                            <Link
                                href="/predictors"
                                className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                            >
                                Predict your college
                            </Link>
                        ) : null}
                    </>
                }
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title={`${exam.shortName} ${exam.examYear} at a glance`} icon="FileText">
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'Conducted by', value: exam.conductingBody },
                            { label: 'Registration ends', value: formatDate(exam.registrationEnd) },
                            { label: 'Exam date', value: formatDate(exam.examDateFrom) },
                            { label: 'Result', value: formatDate(exam.resultDate) },
                        ].map((item) => (
                            <div key={item.label} className="rounded-[10px] border border-line bg-muted/50 px-3 py-2">
                                <dt className="text-[10.5px] uppercase tracking-wide text-ink-soft">{item.label}</dt>
                                <dd className="mt-0.5 text-[13px] font-bold text-ink">{item.value || '—'}</dd>
                            </div>
                        ))}
                    </dl>
                </SectionCard>

                <SectionCard title="Narrow down by state" icon="Map">
                    <div className="flex flex-wrap gap-1.5">
                        {states.map((state) => (
                            <Link
                                key={String(state._id)}
                                href={`/colleges?exam=${exam.slug}&state=${state.slug}`}
                                className="chip"
                            >
                                {state.name}
                            </Link>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard title={`${result.total} colleges accepting ${exam.shortName}`} icon="Building2">
                    {result.items.length === 0 ? (
                        <EmptyState
                            icon="Building2"
                            title="No colleges mapped to this exam yet"
                            description="Participating institutes are added as each counselling authority publishes its list."
                        />
                    ) : (
                        <div className="space-y-3">
                            {result.items.map((college) => (
                                <CollegeCard key={String(college._id)} college={toCollegeCard(college)} />
                            ))}
                        </div>
                    )}

                    <Pagination
                        className="mt-5"
                        basePath={basePath}
                        params={query}
                        page={result.page}
                        totalPages={result.totalPages}
                        total={result.total}
                        pageSize={result.pageSize}
                    />
                </SectionCard>

                <CtaBanner
                    title={`Not sure which ${exam.shortName} college your score reaches?`}
                    description="Check previous cut-off trends with a counsellor before you lock your choice order."
                    ctaLabel="Book free counselling"
                    ctaUrl="/book-counselling?type=college"
                    tone="teal"
                />
            </div>
        </>
    );
}
