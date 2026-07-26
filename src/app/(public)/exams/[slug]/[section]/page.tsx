import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { ExamTabs } from '@/components/exams/exam-tabs';
import { EXAM_SECTION_SEGMENTS } from '@/config/exam-sections';
import {
    CtaBanner,
    DataNotice,
    KeyValueGrid,
    RichText,
    SectionCard,
} from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { getExamDetail } from '@/services/exam.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 600;

const VALID: string[] = [...EXAM_SECTION_SEGMENTS];

const SECTION_META: Record<string, { title: string; description: string }> = {
    dates: { title: 'Important dates', description: 'Registration, admit card, exam, result and counselling schedule.' },
    eligibility: { title: 'Eligibility', description: 'Qualification, age and subject requirements.' },
    application: { title: 'Application process', description: 'Step-by-step registration, fee payment and correction window.' },
    pattern: { title: 'Exam pattern', description: 'Sections, marking scheme, duration and question distribution.' },
    syllabus: { title: 'Syllabus', description: 'Topic-wise syllabus and weightage guidance.' },
    'admit-card': { title: 'Admit card', description: 'Release timeline, download steps and required documents.' },
    result: { title: 'Result & answer key', description: 'Result declaration, scorecard details and answer-key objections.' },
    cutoff: { title: 'Cut-off', description: 'Previous-year closing trends and qualifying marks.' },
    counselling: { title: 'Counselling', description: 'Rounds, choice filling, seat allotment and reporting.' },
    papers: { title: 'Papers & mock tests', description: 'Previous-year question papers and full-length mock tests.' },
};

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; section: string }>;
}): Promise<Metadata> {
    const { slug, section } = await params;
    const detail = await getExamDetail(slug);
    const meta = SECTION_META[section];
    if (!detail || !meta) {
        return buildMetadata({ title: 'Not found', path: `/exams/${slug}/${section}`, noIndex: true });
    }
    return buildMetadata({
        title: `${detail.exam.shortName} ${detail.exam.examYear} ${meta.title}`,
        description: `${detail.exam.shortName} ${detail.exam.examYear} — ${meta.description}`,
        path: `/exams/${slug}/${section}`,
    });
}

export default async function ExamSectionPage({
    params,
}: {
    params: Promise<{ slug: string; section: string }>;
}) {
    const { slug, section } = await params;
    if (!VALID.includes(section)) notFound();

    const detail = await getExamDetail(slug);
    if (!detail) notFound();

    const { exam, dates, papers, mocks } = detail;
    const meta = SECTION_META[section]!;

    const htmlBySection: Record<string, string | undefined> = {
        eligibility: exam.eligibilityHtml,
        application: exam.applicationProcessHtml,
        pattern: exam.patternHtml,
        syllabus: exam.syllabusHtml,
        'admit-card': exam.admitCardHtml,
        result: exam.resultHtml,
        cutoff: exam.cutoffHtml,
        counselling: exam.counsellingHtml,
    };

    return (
        <>
            <JsonLd
                data={buildBreadcrumbJsonLd([
                    { label: 'Home', href: '/' },
                    { label: 'Exams', href: '/exams' },
                    { label: exam.shortName, href: `/exams/${exam.slug}` },
                    { label: meta.title, href: `/exams/${exam.slug}/${section}` },
                ])}
            />

            <PageHeader
                eyebrow={`${exam.shortName} ${exam.examYear}`}
                title={`${exam.shortName} ${meta.title}`}
                description={meta.description}
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Exams', href: '/exams' },
                    { label: exam.shortName, href: `/exams/${exam.slug}` },
                    { label: meta.title },
                ]}
            >
                <ExamTabs base={`/exams/${exam.slug}`} />
            </PageHeader>

            <div className="shell space-y-4 py-6">
                {section === 'dates' ? (
                    <SectionCard title="Full schedule" icon="CalendarDays">
                        {dates.length === 0 ? (
                            <EmptyState icon="CalendarDays" title="Schedule not published yet" />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[12.5px]">
                                    <thead>
                                        <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-soft">
                                            <th className="py-2 pr-3">Event</th>
                                            <th className="py-2 pr-3">Date</th>
                                            <th className="py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dates.map((date) => (
                                            <tr key={String(date._id)} className="border-b border-line/70 last:border-0">
                                                <td className="py-2.5 pr-3 font-semibold text-ink">{date.event}</td>
                                                <td className="py-2.5 pr-3 text-ink-soft">{formatDate(date.startDate)}</td>
                                                <td className="py-2.5">
                                                    {date.isTentative ? (
                                                        <Badge tone="amber">Tentative</Badge>
                                                    ) : (
                                                        <Badge tone="green">Confirmed</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <DataNotice
                            className="mt-3"
                            note="Dates are indicative demonstration values. Always confirm on the official exam portal."
                        />
                    </SectionCard>
                ) : null}

                {section === 'application' ? (
                    <SectionCard title="Application fee" icon="IndianRupee">
                        <KeyValueGrid
                            columns={3}
                            items={[
                                { label: 'General', value: formatCurrency(exam.applicationFee?.general) },
                                { label: 'Reserved categories', value: formatCurrency(exam.applicationFee?.reserved) },
                                { label: 'Note', value: exam.applicationFee?.note ?? '—' },
                            ]}
                        />
                    </SectionCard>
                ) : null}

                {section === 'papers' ? (
                    <>
                        <SectionCard title="Previous year papers" icon="FileStack">
                            {papers.length === 0 ? (
                                <EmptyState icon="FileStack" title="No papers uploaded yet" />
                            ) : (
                                <ul className="grid gap-2 sm:grid-cols-2">
                                    {papers.map((paper) => (
                                        <li key={String(paper._id)}>
                                            <Link
                                                href={`/previous-year-papers/${paper.slug}`}
                                                className="flex items-center justify-between gap-2 rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[12.5px] font-bold text-ink">{paper.title}</span>
                                                    <span className="block text-[11px] text-ink-soft">
                                                        {paper.year} • {paper.fileSizeKb ? `${paper.fileSizeKb} KB` : 'PDF'}
                                                    </span>
                                                </span>
                                                <span className="shrink-0 text-[11.5px] font-bold text-navy-600">Open →</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </SectionCard>

                        <SectionCard title="Mock tests" icon="ClipboardList">
                            {mocks.length === 0 ? (
                                <EmptyState icon="ClipboardList" title="No mock tests published yet" />
                            ) : (
                                <ul className="grid gap-2 sm:grid-cols-2">
                                    {mocks.map((mock) => (
                                        <li key={String(mock._id)}>
                                            <Link
                                                href={`/mock-tests/${mock.slug}`}
                                                className="flex items-center justify-between gap-2 rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-navy-200 hover:bg-muted/50"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[12.5px] font-bold text-ink">{mock.title}</span>
                                                    <span className="block text-[11px] text-ink-soft">
                                                        {mock.questionCount ?? '—'} questions • {mock.durationMinutes ?? '—'} min
                                                    </span>
                                                </span>
                                                <span className="shrink-0 text-[11.5px] font-bold text-navy-600">Start →</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </SectionCard>
                    </>
                ) : null}

                {htmlBySection[section] !== undefined ? (
                    <SectionCard title={meta.title} icon="FileText">
                        {htmlBySection[section] ? (
                            <RichText html={htmlBySection[section]} />
                        ) : (
                            <EmptyState
                                icon="FileText"
                                title="This section is being prepared"
                                description="Our editorial team updates exam content as official notifications are released."
                            />
                        )}
                    </SectionCard>
                ) : null}

                <CtaBanner
                    title={`Have questions about ${exam.shortName}?`}
                    description="Get free guidance on eligibility, preparation and counselling from an expert."
                    ctaLabel="Book free counselling"
                    ctaUrl={`/book-counselling?exam=${exam.slug}`}
                    tone="teal"
                />
            </div>
        </>
    );
}
