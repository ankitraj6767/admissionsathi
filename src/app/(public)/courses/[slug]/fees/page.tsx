import type { Metadata } from 'next';
import Link from 'next/link';
import { DataNotice, KeyValueGrid, SectionCard } from '@/components/shared/content-blocks';
import { CourseSubpage, buildCourseSubpageMetadata } from '@/components/courses/course-subpage';
import { formatCompactINR, formatCurrency } from '@/lib/utils';

export const revalidate = 900;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    return buildCourseSubpageMetadata(slug, 'fees');
}

export default async function CourseFeesPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    return (
        <CourseSubpage slug={slug} kind="fees">
            {(detail) => {
                if ('redirectTo' in detail) return null;
                const { course, colleges } = detail;

                return (
                    <>
                        <SectionCard title="Fee range" icon="IndianRupee">
                            <KeyValueGrid
                                columns={3}
                                items={[
                                    { label: 'Lowest reported fee', value: formatCurrency(course.averageFee?.min) },
                                    { label: 'Highest reported fee', value: formatCurrency(course.averageFee?.max) },
                                    { label: 'Duration', value: course.durationLabel },
                                ]}
                            />
                            <DataNotice className="mt-3" note={course.averageFee?.note} />
                        </SectionCard>

                        <SectionCard title="Fees by college" icon="Building2" description="Annual tuition reported per college">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[12.5px]">
                                    <thead>
                                        <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-soft">
                                            <th className="py-2 pr-3">College</th>
                                            <th className="py-2 pr-3">Seats</th>
                                            <th className="py-2 pr-3">Annual fee</th>
                                            <th className="py-2">Total fee</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {colleges.items.map((row) => (
                                            <tr key={String(row._id)} className="border-b border-line/70 last:border-0">
                                                <td className="py-2.5 pr-3">
                                                    <Link
                                                        href={`/colleges/${row.collegeSlug}`}
                                                        className="font-semibold text-ink hover:text-navy-700"
                                                    >
                                                        {row.collegeName}
                                                    </Link>
                                                </td>
                                                <td className="py-2.5 pr-3 text-ink-soft">{row.totalSeats ?? '—'}</td>
                                                <td className="py-2.5 pr-3 font-bold text-ink">{formatCompactINR(row.annualFee)}</td>
                                                <td className="py-2.5 text-ink-soft">{formatCompactINR(row.totalFee)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Link
                                href={`/courses/${course.slug}/colleges`}
                                className="link-more mt-3 inline-flex"
                            >
                                See all colleges →
                            </Link>
                        </SectionCard>

                        <SectionCard title="Financing this course" icon="Landmark">
                            <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                                <li>
                                    Compare education loans on interest rate, moratorium and collateral limits on the{' '}
                                    <Link href="/education-loans/compare" className="font-semibold text-navy-600 hover:text-orange">
                                        loan comparison page
                                    </Link>
                                    .
                                </li>
                                <li>
                                    Estimate your EMI with the{' '}
                                    <Link href="/education-loans/calculator" className="font-semibold text-navy-600 hover:text-orange">
                                        loan calculator
                                    </Link>
                                    .
                                </li>
                                <li>
                                    Check{' '}
                                    <Link href="/scholarships" className="font-semibold text-navy-600 hover:text-orange">
                                        scholarships
                                    </Link>{' '}
                                    you may be eligible for before taking a loan.
                                </li>
                            </ul>
                        </SectionCard>
                    </>
                );
            }}
        </CourseSubpage>
    );
}
