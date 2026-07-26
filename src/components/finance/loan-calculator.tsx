'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { calculateEmi, type EmiResult } from '@/lib/finance/emi';
import { calculateLoanAction } from '@/actions/finance.actions';
import { Field, Input, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { KeyValueGrid } from '@/components/shared/content-blocks';
import { formatCompactINR, formatCurrency } from '@/lib/utils';
import { getAnonymousId, track } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

/**
 * Education loan EMI calculator.
 * Computes instantly on the client for responsiveness, then persists the
 * calculation server-side (same pure function) so history stays trustworthy.
 */
export function LoanCalculator({
    providers,
    defaultAmount = 500000,
    defaultRate = 10.5,
}: {
    providers: { label: string; value: string; rate?: number }[];
    defaultAmount?: number;
    defaultRate?: number;
}) {
    const [courseFee, setCourseFee] = useState(defaultAmount);
    const [loanAmount, setLoanAmount] = useState(defaultAmount);
    const [rate, setRate] = useState(defaultRate);
    const [years, setYears] = useState(7);
    const [moratorium, setMoratorium] = useState(12);
    const [processingFee, setProcessingFee] = useState(1);
    const [saving, setSaving] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [showSchedule, setShowSchedule] = useState(false);

    const result: EmiResult = useMemo(
        () =>
            calculateEmi({
                loanAmount,
                annualRatePercent: rate,
                tenureMonths: years * 12,
                moratoriumMonths: moratorium,
                processingFeePercent: processingFee,
            }),
        [loanAmount, rate, years, moratorium, processingFee],
    );

    useEffect(() => {
        setSavedId(null);
    }, [loanAmount, rate, years, moratorium, processingFee]);

    const onSave = async () => {
        setSaving(true);
        const response = await calculateLoanAction({
            courseFee,
            loanAmount,
            interestRate: rate,
            tenureMonths: years * 12,
            moratoriumMonths: moratorium,
            processingFeePercent: processingFee,
            anonymousId: getAnonymousId(),
        });
        setSaving(false);
        if (response.ok) {
            setSavedId(response.data.calculationId ?? 'saved');
            track({ name: ANALYTICS_EVENTS.loanCalculated, properties: { loanAmount, rate, years } });
        }
    };

    const downloadCsv = () => {
        const header = 'Month,Opening balance,EMI,Interest,Principal,Closing balance\n';
        const body = result.schedule
            .map((row) =>
                [row.month, row.openingBalance, row.emi, row.interest, row.principal, row.closingBalance].join(','),
            )
            .join('\n');
        const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `admission-sathi-loan-schedule-${loanAmount}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void onSave();
                }}
                className="space-y-3 rounded-panel border border-line bg-white p-4 shadow-card"
            >
                <h2 className="text-[15px] font-extrabold text-navy-800">Loan details</h2>

                <Field label="Total course fee (₹)" htmlFor="courseFee">
                    <Input
                        id="courseFee"
                        type="number"
                        min={0}
                        value={courseFee}
                        onChange={(e) => setCourseFee(Number(e.target.value))}
                    />
                </Field>

                <Field label="Loan amount (₹)" htmlFor="loanAmount" hint={formatCompactINR(loanAmount)}>
                    <Input
                        id="loanAmount"
                        type="number"
                        min={10000}
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(Number(e.target.value))}
                    />
                </Field>

                {providers.length > 0 ? (
                    <Field label="Prefill rate from a lender" htmlFor="provider">
                        <Select
                            id="provider"
                            placeholder="Choose a lender"
                            options={providers.map((p) => ({ label: p.label, value: p.value }))}
                            onChange={(e) => {
                                const provider = providers.find((p) => p.value === e.target.value);
                                if (provider?.rate) setRate(provider.rate);
                            }}
                        />
                    </Field>
                ) : null}

                <Field label={`Interest rate: ${rate}% p.a.`} htmlFor="rate">
                    <input
                        id="rate"
                        type="range"
                        min={7}
                        max={18}
                        step={0.05}
                        value={rate}
                        onChange={(e) => setRate(Number(e.target.value))}
                        className="w-full accent-orange"
                    />
                </Field>

                <Field label={`Repayment tenure: ${years} years`} htmlFor="years">
                    <input
                        id="years"
                        type="range"
                        min={1}
                        max={20}
                        step={1}
                        value={years}
                        onChange={(e) => setYears(Number(e.target.value))}
                        className="w-full accent-orange"
                    />
                </Field>

                <Field label={`Moratorium: ${moratorium} months`} htmlFor="moratorium" hint="Study period before EMIs start">
                    <input
                        id="moratorium"
                        type="range"
                        min={0}
                        max={60}
                        step={1}
                        value={moratorium}
                        onChange={(e) => setMoratorium(Number(e.target.value))}
                        className="w-full accent-orange"
                    />
                </Field>

                <Field label={`Processing fee: ${processingFee}%`} htmlFor="processingFee">
                    <input
                        id="processingFee"
                        type="range"
                        min={0}
                        max={3}
                        step={0.05}
                        value={processingFee}
                        onChange={(e) => setProcessingFee(Number(e.target.value))}
                        className="w-full accent-orange"
                    />
                </Field>

                <Button type="submit" variant="navy" full loading={saving} loadingText="Saving…">
                    Save this calculation
                </Button>
                {savedId ? (
                    <p className="text-center text-[11.5px] font-semibold text-green">
                        Saved. Signed-in users can see it under dashboard → loan history.
                    </p>
                ) : null}
            </form>

            <div className="space-y-4">
                <div className="rounded-panel border border-line bg-white p-4 shadow-card">
                    <h2 className="mb-3 text-[15px] font-extrabold text-navy-800">Your EMI</h2>
                    <p className="text-[30px] font-extrabold leading-none text-navy-800">
                        {formatCurrency(result.emi)}
                        <span className="ml-1 text-[13px] font-semibold text-ink-soft">/ month</span>
                    </p>

                    <KeyValueGrid
                        className="mt-4"
                        columns={4}
                        items={[
                            { label: 'Principal (with moratorium interest)', value: formatCurrency(result.principal) },
                            { label: 'Interest during moratorium', value: formatCurrency(result.moratoriumInterest) },
                            { label: 'Total interest', value: formatCurrency(result.totalInterest) },
                            { label: 'Total repayment', value: formatCurrency(result.totalRepayment) },
                            { label: 'Processing fee', value: formatCurrency(result.processingFee) },
                            { label: 'Total cost of loan', value: formatCurrency(result.totalCost) },
                            { label: 'EMIs', value: `${result.schedule.length} months` },
                            { label: 'Total commitment', value: `${result.effectiveTenureMonths} months` },
                        ]}
                    />

                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowSchedule((s) => !s)}>
                            {showSchedule ? 'Hide' : 'Show'} amortisation schedule
                        </Button>
                        <Button asChild variant="soft" size="sm">
                            {/* Rendered server-side so the figures in the file are ours, not the browser's. */}
                            <a
                                href={`/api/education-loans/summary?amount=${loanAmount}&rate=${rate}&tenure=${years * 12}&moratorium=${moratorium}&fee=${processingFee}`}
                                download
                            >
                                <Download className="h-3.5 w-3.5" aria-hidden />
                                Download summary (PDF)
                            </a>
                        </Button>
                        <Button variant="soft" size="sm" onClick={downloadCsv}>
                            <Download className="h-3.5 w-3.5" aria-hidden />
                            Schedule (CSV)
                        </Button>
                    </div>
                </div>

                {showSchedule ? (
                    <div className="rounded-panel border border-line bg-white p-4 shadow-card">
                        <h3 className="mb-2 text-[14px] font-extrabold text-navy-800">Amortisation schedule</h3>
                        <div className="max-h-[420px] overflow-auto">
                            <table className="w-full text-left text-[11.5px]">
                                <thead className="sticky top-0 bg-white">
                                    <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-soft">
                                        <th className="py-2 pr-2">Month</th>
                                        <th className="py-2 pr-2">Opening</th>
                                        <th className="py-2 pr-2">EMI</th>
                                        <th className="py-2 pr-2">Interest</th>
                                        <th className="py-2 pr-2">Principal</th>
                                        <th className="py-2">Closing</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.schedule.map((row) => (
                                        <tr key={row.month} className="border-b border-line/60 last:border-0">
                                            <td className="py-1.5 pr-2 font-semibold text-ink">{row.month}</td>
                                            <td className="py-1.5 pr-2 text-ink-soft">{formatCurrency(row.openingBalance)}</td>
                                            <td className="py-1.5 pr-2 text-ink">{formatCurrency(row.emi)}</td>
                                            <td className="py-1.5 pr-2 text-ink-soft">{formatCurrency(row.interest)}</td>
                                            <td className="py-1.5 pr-2 text-ink-soft">{formatCurrency(row.principal)}</td>
                                            <td className="py-1.5 text-ink-soft">{formatCurrency(row.closingBalance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null}

                <p className="rounded-[10px] border border-orange-100 bg-orange-50 px-3 py-2 text-[11.5px] text-orange-700">
                    Figures are indicative. Lenders apply their own rate resets, insurance charges and prepayment
                    rules — confirm the final schedule with the bank before signing.
                </p>
            </div>
        </div>
    );
}
