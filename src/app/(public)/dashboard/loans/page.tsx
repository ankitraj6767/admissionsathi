import Link from 'next/link';
import { SectionCard } from '@/components/shared/content-blocks';
import { EmptyState } from '@/components/ui/primitives';
import { requireAuthPage } from '@/lib/auth/session';
import { listUserLoanCalculations } from '@/services/finance.service';
import { formatCurrency, formatDate } from '@/lib/utils';

export default async function LoanHistoryPage() {
    const actor = await requireAuthPage();
    const calculations = await listUserLoanCalculations(actor.id, 40);

    if (calculations.length === 0) {
        return (
            <SectionCard title="Loan calculations" icon="Calculator">
                <EmptyState
                    icon="Calculator"
                    title="No saved calculations"
                    description="Use the EMI calculator and save a scenario to compare it later."
                    action={
                        <Link
                            href="/education-loans/calculator"
                            className="inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-[13px] font-bold text-white"
                        >
                            Open calculator
                        </Link>
                    }
                />
            </SectionCard>
        );
    }

    return (
        <SectionCard
            title="Loan calculations"
            icon="Calculator"
            description={`${calculations.length} saved scenarios`}
            actions={
                <Link href="/education-loans/calculator" className="link-more">
                    New calculation →
                </Link>
            }
        >
            <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                    <thead>
                        <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-soft">
                            <th className="py-2 pr-3">Saved</th>
                            <th className="py-2 pr-3">Loan amount</th>
                            <th className="py-2 pr-3">Rate</th>
                            <th className="py-2 pr-3">Tenure</th>
                            <th className="py-2 pr-3">Moratorium</th>
                            <th className="py-2 pr-3">EMI</th>
                            <th className="py-2">Total repayment</th>
                        </tr>
                    </thead>
                    <tbody>
                        {calculations.map((row) => (
                            <tr key={String(row._id)} className="border-b border-line/70 last:border-0">
                                <td className="py-2.5 pr-3 text-ink-soft">{formatDate(row.createdAt)}</td>
                                <td className="py-2.5 pr-3 font-semibold text-ink">{formatCurrency(row.loanAmount)}</td>
                                <td className="py-2.5 pr-3 text-ink-soft">{row.interestRate}%</td>
                                <td className="py-2.5 pr-3 text-ink-soft">{Math.round(row.tenureMonths / 12)} yrs</td>
                                <td className="py-2.5 pr-3 text-ink-soft">{row.moratoriumMonths} mo</td>
                                <td className="py-2.5 pr-3 font-bold text-ink">{formatCurrency(row.emi)}</td>
                                <td className="py-2.5 text-ink-soft">{formatCurrency(row.totalRepayment)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
}
