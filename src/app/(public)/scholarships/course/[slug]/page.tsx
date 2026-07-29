import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { getCourseBySlug } from '@/db/repositories/course.repository';
import { searchScholarships, type ScholarshipSearchParams } from '@/services/finance.service';
import { formatCompactINR, formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const course = await getCourseBySlug(slug);
    if (!course) {
        return buildMetadata({ title: 'Course not found', path: `/scholarships/course/${slug}`, noIndex: true });
    }
    return buildMetadata({
        title: `${course.name} Scholarships — Eligibility, Amount & Deadlines`,
        description: `Scholarships open to ${course.name} students, with eligibility, benefit amount and application deadlines.`,
        path: `/scholarships/course/${course.slug}`,
    });
}

export default async function ScholarshipsByCoursePage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<ScholarshipSearchParams>;
}) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const course = await getCourseBySlug(slug);
    if (!course) notFound();

    const result = await searchScholarships({ ...query, course: course.slug });
    const basePath = `/scholarships/course/${course.slug}`;

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Scholarships', href: '/scholarships' },
                        { label: `${course.shortName ?? course.name} scholarships`, href: basePath },
                    ]),
                    buildItemListJsonLd(
                        result.items.map((s) => ({ name: s.name, url: `/scholarships/${s.slug}` })),
                        `${course.name} scholarships`,
                    ),
                ]}
            />

            <PageHeader
                eyebrow={course.categoryName}
                title={`${course.shortName ?? course.name} scholarships`}
                description={`${result.total} scholarships list ${course.name} among their eligible programmes. Check the deadline first — most close before admission rounds end.`}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Scholarships', href: '/scholarships' },
                    { label: `${course.shortName ?? course.name}` },
                ]}
                actions={
                    <>
                        <Link
                            href={`/courses/${course.slug}/fees`}
                            className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-navy-800"
                        >
                            {course.shortName ?? course.name} fees
                        </Link>
                        <Link
                            href="/education-loans"
                            className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                        >
                            Education loans
                        </Link>
                    </>
                }
            />

            <div className="shell space-y-4 py-6">
                <SectionCard title={`${result.total} scholarships for ${course.shortName ?? course.name}`} icon="Award">
                    {result.items.length === 0 ? (
                        <EmptyState
                            icon="Award"
                            title="No course-specific scholarships listed yet"
                            description="Browse all scholarships — many are open across programmes rather than tied to one course."
                            action={
                                <Link
                                    href="/scholarships"
                                    className="inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-[13px] font-bold text-white"
                                >
                                    All scholarships
                                </Link>
                            }
                        />
                    ) : (
                        <ul className="grid gap-3 sm:grid-cols-2">
                            {result.items.map((scholarship) => (
                                <li key={String(scholarship._id)}>
                                    <article className="flex h-full flex-col rounded-panel border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-raised">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h2 className="text-[13.5px] font-extrabold leading-snug text-ink">
                                                    <Link href={`/scholarships/${scholarship.slug}`} className="hover:text-navy-700">
                                                        {scholarship.name}
                                                    </Link>
                                                </h2>
                                                <p className="mt-0.5 text-[11.5px] text-ink-soft">{scholarship.provider}</p>
                                            </div>
                                            <Badge tone={scholarship.providerType === 'Government' ? 'navy' : 'purple'}>
                                                {scholarship.providerType}
                                            </Badge>
                                        </div>

                                        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
                                            <div>
                                                <dt className="text-ink-soft">Amount</dt>
                                                <dd className="font-bold text-green">
                                                    {scholarship.amountMax ? `Up to ${formatCompactINR(scholarship.amountMax)}` : '—'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-ink-soft">Deadline</dt>
                                                <dd className="font-bold text-ink">{formatDate(scholarship.applicationDeadline)}</dd>
                                            </div>
                                        </dl>

                                        <Link
                                            href={`/scholarships/${scholarship.slug}`}
                                            className="mt-auto inline-flex h-9 items-center justify-center rounded-[9px] bg-navy px-3 text-[12px] font-bold text-white hover:bg-navy-800"
                                        >
                                            Eligibility & apply
                                        </Link>
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

                <CtaBanner
                    title={`Funding a ${course.shortName ?? course.name} seat?`}
                    description="Combine a scholarship with an education loan — our counsellors help you sequence both."
                    ctaLabel="Talk to a counsellor"
                    ctaUrl="/book-counselling?type=loan"
                />
            </div>
        </>
    );
}
