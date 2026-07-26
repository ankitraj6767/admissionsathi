import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { ExamTabs } from '@/components/exams/exam-tabs';
import {
    CtaBanner,
    FaqAccordion,
    KeyValueGrid,
    RichText,
    SectionCard,
} from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { getExamDetail } from '@/services/exam.service';
import { incrementViewCount } from '@/services/analytics.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import {
    JsonLd,
    buildBreadcrumbJsonLd,
    buildEventJsonLd,
    buildFaqJsonLd,
} from '@/lib/seo/json-ld';

export const revalidate = 600;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const detail = await getExamDetail(slug);
    if (!detail) return buildMetadata({ title: 'Exam not found', path: `/exams/${slug}`, noIndex: true });
    const { exam } = detail;
    return buildMetadata({
        title: exam.seo?.title ?? `${exam.shortName} ${exam.examYear} — Dates, Eligibility, Pattern & Result`,
        description:
            exam.seo?.description ??
            `${exam.shortName} ${exam.examYear}: registration dates, eligibility, application process, exam pattern, syllabus, cut-off trends and counselling.`,
        path: `/exams/${exam.slug}`,
    });
}

export default async function ExamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const detail = await getExamDetail(slug);
    if (!detail) notFound();

    const { exam, dates, colleges, papers, articles, predictors } = detail;
    void incrementViewCount('exam', String(exam._id));

    const keyDates = dates.filter((d) => d.isKeyDate).slice(0, 6);
    const faqJson = buildFaqJsonLd((exam.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })));
    const eventJson = buildEventJsonLd({
        name: `${exam.shortName} ${exam.examYear}`,
        slug: exam.slug,
        startDate: exam.examDateFrom,
        endDate: exam.examDateTo,
        description: exam.overviewHtml,
        organizer: exam.conductingBody,
    });

    return (
        <>
            <JsonLd
                data={[
                    buildBreadcrumbJsonLd([
                        { label: 'Home', href: '/' },
                        { label: 'Exams', href: '/exams' },
                        { label: exam.shortName, href: `/exams/${exam.slug}` },
                    ]),
                    ...(faqJson ? [faqJson] : []),
                    ...(eventJson ? [eventJson] : []),
                ]}
            />

            <PageHeader
                eyebrow={`${exam.level} • ${exam.category}`}
                title={`${exam.shortName} ${exam.examYear}`}
                description={`${exam.name} — conducted by ${exam.conductingBody}.`}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Exams', href: '/exams' },
                    { label: exam.shortName },
                ]}
                actions={
                    predictors.length > 0 ? (
                        <Link
                            href={`/predictors/${predictors[0]!.slug}`}
                            className="inline-flex h-10 items-center rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                        >
                            Run {exam.shortName} predictor
                        </Link>
                    ) : undefined
                }
            >
                <ExamTabs base={`/exams/${exam.slug}`} />
            </PageHeader>

            <div className="shell py-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                        <SectionCard title="Overview" icon="FileText">
                            <KeyValueGrid
                                columns={4}
                                className="mb-4"
                                items={[
                                    { label: 'Conducting body', value: exam.conductingBody },
                                    { label: 'Level', value: exam.level },
                                    { label: 'Mode', value: exam.mode?.join(', ') || '—' },
                                    { label: 'Frequency', value: exam.frequencyPerYear ? `${exam.frequencyPerYear}× per year` : '—' },
                                    { label: 'Application fee (General)', value: formatCurrency(exam.applicationFee?.general) },
                                    { label: 'Application fee (Reserved)', value: formatCurrency(exam.applicationFee?.reserved) },
                                    { label: 'Colleges accepting', value: exam.acceptedByCollegeCount },
                                    { label: 'Exam year', value: exam.examYear },
                                ]}
                            />
                            <RichText html={exam.overviewHtml} />
                        </SectionCard>

                        {keyDates.length > 0 ? (
                            <SectionCard
                                title="Key dates"
                                icon="CalendarDays"
                                actions={
                                    <Link href={`/exams/${exam.slug}/dates`} className="link-more">
                                        Full schedule →
                                    </Link>
                                }
                            >
                                <ul className="divide-y divide-line">
                                    {keyDates.map((date) => (
                                        <li key={String(date._id)} className="flex items-center justify-between gap-3 py-2.5">
                                            <span className="text-[12.5px] font-semibold text-ink">{date.event}</span>
                                            <span className="flex items-center gap-2 text-[12px] text-ink-soft">
                                                {formatDate(date.startDate)}
                                                {date.isTentative ? <Badge tone="amber">Tentative</Badge> : null}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        <SectionCard title="Eligibility" icon="ShieldCheck">
                            <RichText html={exam.eligibilityHtml} />
                        </SectionCard>

                        <SectionCard title="Exam pattern" icon="ClipboardList">
                            <RichText html={exam.patternHtml} />
                        </SectionCard>

                        <SectionCard title="Preparation tips" icon="Lightbulb">
                            <RichText html={exam.preparationTipsHtml} />
                        </SectionCard>

                        {colleges.items.length > 0 ? (
                            <SectionCard
                                title={`Colleges accepting ${exam.shortName}`}
                                icon="Building2"
                                actions={
                                    <Link href={`/colleges?exam=${exam.slug}`} className="link-more">
                                        View all →
                                    </Link>
                                }
                            >
                                <ul className="grid gap-2 sm:grid-cols-2">
                                    {colleges.items.map((college) => (
                                        <li key={String(college._id)}>
                                            <Link
                                                href={`/colleges/${college.slug}`}
                                                className="block rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                            >
                                                <span className="block truncate text-[12.5px] font-bold text-ink">{college.name}</span>
                                                <span className="mt-0.5 block text-[11px] text-ink-soft">
                                                    {college.cityName}, {college.stateName}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        {exam.faqs?.length ? (
                            <SectionCard title="FAQs" icon="CircleHelp">
                                <FaqAccordion faqs={exam.faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
                            </SectionCard>
                        ) : null}

                        <CtaBanner
                            title={`Need help planning ${exam.shortName} counselling?`}
                            description="Free counselling covers choice filling, document verification and backup options."
                            ctaLabel="Book free counselling"
                            ctaUrl={`/book-counselling?exam=${exam.slug}`}
                        />
                    </div>

                    <aside className="space-y-4">
                        {predictors.length > 0 ? (
                            <SectionCard title="Predictors" icon="Target">
                                <ul className="space-y-1.5">
                                    {predictors.map((predictor) => (
                                        <li key={String(predictor._id)}>
                                            <Link
                                                href={`/predictors/${predictor.slug}`}
                                                className="block rounded-[9px] bg-orange-50 px-2.5 py-2 text-[12.5px] font-bold text-orange-700 hover:bg-orange-100"
                                            >
                                                {predictor.name} →
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        {papers.length > 0 ? (
                            <SectionCard
                                title="Previous year papers"
                                icon="FileStack"
                                actions={
                                    <Link href={`/exams/${exam.slug}/papers`} className="link-more">
                                        All →
                                    </Link>
                                }
                            >
                                <ul className="space-y-1.5">
                                    {papers.slice(0, 5).map((paper) => (
                                        <li key={String(paper._id)}>
                                            <Link
                                                href={`/previous-year-papers/${paper.slug}`}
                                                className="block truncate text-[12.5px] font-semibold text-ink hover:text-navy-700"
                                            >
                                                {paper.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        {articles.length > 0 ? (
                            <SectionCard title="Related reading" icon="Newspaper">
                                <ul className="space-y-1.5">
                                    {articles.map((article) => (
                                        <li key={String(article._id)}>
                                            <Link
                                                href={`/articles/${article.slug}`}
                                                className="block text-[12.5px] font-semibold text-ink hover:text-navy-700"
                                            >
                                                {article.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        ) : null}

                        {exam.officialWebsite ? (
                            <SectionCard title="Official website" icon="Globe">
                                <a
                                    href={exam.officialWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    className="break-all text-[12.5px] font-semibold text-navy-600 hover:text-orange"
                                >
                                    {exam.officialWebsite}
                                </a>
                            </SectionCard>
                        ) : null}
                    </aside>
                </div>
            </div>
        </>
    );
}
