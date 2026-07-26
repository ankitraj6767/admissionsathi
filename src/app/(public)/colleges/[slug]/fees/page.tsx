import { notFound } from 'next/navigation';
import { CtaBanner, DataNotice, KeyValueGrid, SectionCard } from '@/components/shared/content-blocks';
import { getCollegeDetail } from '@/services/college.service';
import { formatCompactINR, formatCurrency } from '@/lib/utils';

export default async function CollegeFeesPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) notFound();

    const { college, courses } = detail;
    const hostelMin = college.hostelFeeRange?.min;
    const hostelMax = college.hostelFeeRange?.max;

    return (
        <div className="space-y-4">
            <SectionCard title="Fee structure" icon="IndianRupee" description="Indicative annual and total fees by programme">
                <KeyValueGrid
                    columns={4}
                    className="mb-4"
                    items={[
                        { label: 'Annual fee (from)', value: formatCompactINR(college.feeRange?.min) },
                        { label: 'Annual fee (up to)', value: formatCompactINR(college.feeRange?.max) },
                        { label: 'Hostel fee (from)', value: hostelMin ? formatCompactINR(hostelMin) : '—' },
                        { label: 'Hostel fee (up to)', value: hostelMax ? formatCompactINR(hostelMax) : '—' },
                    ]}
                />

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px]">
                        <thead>
                            <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-soft">
                                <th className="py-2 pr-3">Programme</th>
                                <th className="py-2 pr-3">Duration</th>
                                <th className="py-2 pr-3">Annual tuition</th>
                                <th className="py-2 pr-3">Total tuition</th>
                                <th className="py-2">Hostel (annual)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.map((row) => (
                                <tr key={String(row._id)} className="border-b border-line/70 last:border-0">
                                    <td className="py-2.5 pr-3 font-semibold text-ink">{row.courseName}</td>
                                    <td className="py-2.5 pr-3 text-ink-soft">{row.durationLabel}</td>
                                    <td className="py-2.5 pr-3 font-bold text-ink">{formatCurrency(row.annualFee)}</td>
                                    <td className="py-2.5 pr-3 text-ink-soft">{formatCurrency(row.totalFee)}</td>
                                    <td className="py-2.5 text-ink-soft">{row.hostelFee ? formatCurrency(row.hostelFee) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <DataNotice className="mt-4" note={college.dataSourceNote} />
            </SectionCard>

            <SectionCard title="Planning the fees" icon="Calculator">
                <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] text-ink-soft">
                    <li>Tuition is usually payable per semester or per year; confirm the instalment schedule.</li>
                    <li>Add hostel, mess, examination, caution deposit and transport to estimate the real cost.</li>
                    <li>Check the refund policy before paying — withdrawal timelines change the refundable amount.</li>
                    <li>Compare an education loan EMI against family cash flow before committing.</li>
                </ul>
            </SectionCard>

            <CtaBanner
                title="Estimate your monthly EMI for this fee"
                description="Use the education loan calculator, then compare lenders on rate, tenure and moratorium."
                ctaLabel="Open loan calculator"
                ctaUrl="/education-loans/calculator"
                tone="orange"
            />
        </div>
    );
}
