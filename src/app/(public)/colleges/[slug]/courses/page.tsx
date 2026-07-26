import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CtaBanner, SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { getCollegeDetail } from '@/services/college.service';
import { formatCompactINR, formatDate } from '@/lib/utils';

export default async function CollegeCoursesPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) notFound();

    const { college, courses } = detail;
    const byLevel = courses.reduce<Record<string, typeof courses>>((acc, course) => {
        acc[course.level] = [...(acc[course.level] ?? []), course];
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            <SectionCard
                title={`Courses & fees at ${college.shortName ?? college.name}`}
                icon="GraduationCap"
                description={`${courses.length} programmes across ${Object.keys(byLevel).length} levels`}
            >
                {courses.length === 0 ? (
                    <p className="text-[13px] text-ink-soft">Course details are being updated.</p>
                ) : (
                    <div className="space-y-5">
                        {Object.entries(byLevel).map(([level, rows]) => (
                            <div key={level}>
                                <h3 className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-navy-800">
                                    {level}
                                    <Badge tone="neutral">{rows.length}</Badge>
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[12.5px]">
                                        <thead>
                                            <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-soft">
                                                <th className="py-2 pr-3">Course</th>
                                                <th className="py-2 pr-3">Duration</th>
                                                <th className="py-2 pr-3">Mode</th>
                                                <th className="py-2 pr-3">Seats</th>
                                                <th className="py-2 pr-3">Annual fee</th>
                                                <th className="py-2 pr-3">Total fee</th>
                                                <th className="py-2">Deadline</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row) => (
                                                <tr key={String(row._id)} className="border-b border-line/70 last:border-0">
                                                    <td className="py-2.5 pr-3 font-semibold text-ink">{row.courseName}</td>
                                                    <td className="py-2.5 pr-3 text-ink-soft">{row.durationLabel}</td>
                                                    <td className="py-2.5 pr-3 text-ink-soft">{row.studyMode}</td>
                                                    <td className="py-2.5 pr-3 text-ink-soft">{row.totalSeats ?? '—'}</td>
                                                    <td className="py-2.5 pr-3 font-bold text-ink">{formatCompactINR(row.annualFee)}</td>
                                                    <td className="py-2.5 pr-3 text-ink-soft">{formatCompactINR(row.totalFee)}</td>
                                                    <td className="py-2.5 text-ink-soft">{formatDate(row.applicationDeadline)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            <SectionCard title="Explore these courses in detail" icon="BookOpen">
                <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set(courses.map((c) => c.courseName))).map((name) => (
                        <Link
                            key={name}
                            href={`/courses?q=${encodeURIComponent(name)}`}
                            className="chip"
                        >
                            {name}
                        </Link>
                    ))}
                </div>
            </SectionCard>

            <CtaBanner
                title="Need help choosing between these programmes?"
                description="A counsellor can compare eligibility, fees and outcomes with you — free of cost."
                ctaLabel="Talk to a counsellor"
                ctaUrl={`/book-counselling?college=${college.slug}`}
                tone="teal"
            />
        </div>
    );
}
