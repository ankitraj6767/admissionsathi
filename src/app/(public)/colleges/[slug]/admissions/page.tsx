import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CtaBanner, RichText, SectionCard } from '@/components/shared/content-blocks';
import { getCollegeDetail } from '@/services/college.service';
import { formatDate } from '@/lib/utils';

export default async function CollegeAdmissionsPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) notFound();

    const { college, courses } = detail;
    const exams = (college.examsAccepted ?? []) as unknown as {
        _id: string;
        shortName: string;
        slug: string;
        name: string;
    }[];

    return (
        <div className="space-y-4">
            <SectionCard title="Admission process" icon="Route">
                <RichText html={college.admissionsHtml} />
            </SectionCard>

            <SectionCard title="Eligibility" icon="ShieldCheck">
                <RichText html={college.eligibilityHtml} />
            </SectionCard>

            {exams.length > 0 ? (
                <SectionCard title="Entrance exams accepted" icon="FileText">
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {exams.map((exam) => (
                            <li key={String(exam._id)}>
                                <Link
                                    href={`/exams/${exam.slug}`}
                                    className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5 transition-colors hover:border-navy-200 hover:bg-muted/60"
                                >
                                    <span>
                                        <span className="block text-[13px] font-bold text-ink">{exam.shortName}</span>
                                        <span className="block text-[11px] text-ink-soft">{exam.name}</span>
                                    </span>
                                    <span className="text-[11.5px] font-bold text-navy-600">Details →</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            ) : null}

            <SectionCard title="Application deadlines" icon="CalendarDays">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px]">
                        <thead>
                            <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-soft">
                                <th className="py-2 pr-3">Programme</th>
                                <th className="py-2 pr-3">Admission status</th>
                                <th className="py-2">Last date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.map((row) => (
                                <tr key={String(row._id)} className="border-b border-line/70 last:border-0">
                                    <td className="py-2.5 pr-3 font-semibold text-ink">{row.courseName}</td>
                                    <td className="py-2.5 pr-3">
                                        <span
                                            className={`rounded-pill px-2 py-0.5 text-[10.5px] font-bold ${row.admissionOpen ? 'bg-green-50 text-green' : 'bg-muted text-ink-soft'
                                                }`}
                                        >
                                            {row.admissionOpen ? 'Open' : 'Closed'}
                                        </span>
                                    </td>
                                    <td className="py-2.5 text-ink-soft">{formatDate(row.applicationDeadline)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            <CtaBanner
                title="Get help with the application"
                description="Our counsellors walk you through document verification, choice filling and fee payment."
                ctaLabel="Book free counselling"
                ctaUrl={`/book-counselling?college=${college.slug}`}
            />
        </div>
    );
}
