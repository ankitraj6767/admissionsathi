'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { ShieldCheck } from 'lucide-react';
import { checkLoanEligibilityAction } from '@/actions/finance.actions';
import type { EligibilityResult } from '@/lib/finance/emi';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { KeyValueGrid } from '@/components/shared/content-blocks';
import { CIBIL_BANDS } from '@/config/finance';
import { formatCompactINR, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface FormValues {
    courseFee: number;
    coApplicantMonthlyIncome: number;
    existingMonthlyEmi: number;
    collateralValue?: number;
    isCollateralAvailable: boolean;
    courseType: 'domestic' | 'abroad';
    cibilBand: 'excellent' | 'good' | 'average' | 'unknown';
}

const bandTone: Record<EligibilityResult['band'], string> = {
    strong: 'border-green/30 bg-green-50 text-green',
    moderate: 'border-amber-alert/30 bg-amber-50 text-amber-alert',
    weak: 'border-red-alert/30 bg-red-50 text-red-alert',
};

/** Indicative education-loan eligibility estimator (server-computed). */
export function EligibilityChecker() {
    const [result, setResult] = useState<EligibilityResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        formState: { isSubmitting },
    } = useForm<FormValues>({
        defaultValues: {
            courseFee: 800000,
            coApplicantMonthlyIncome: 60000,
            existingMonthlyEmi: 0,
            isCollateralAvailable: false,
            courseType: 'domestic',
            cibilBand: 'unknown',
        },
    });

    const collateral = watch('isCollateralAvailable');

    const onSubmit = async (values: FormValues) => {
        setError(null);
        const response = await checkLoanEligibilityAction({
            ...values,
            collateralValue: values.isCollateralAvailable ? values.collateralValue : undefined,
        });
        if (response.ok) setResult(response.data);
        else setError(response.error);
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-3 rounded-panel border border-line bg-white p-4 shadow-card"
            >
                <h2 className="text-[15px] font-extrabold text-navy-800">Your details</h2>

                <Field label="Total course fee (₹)" htmlFor="el-fee" required>
                    <Input id="el-fee" type="number" min={10000} {...register('courseFee', { valueAsNumber: true })} />
                </Field>

                <Field label="Co-applicant monthly income (₹)" htmlFor="el-income" required>
                    <Input
                        id="el-income"
                        type="number"
                        min={0}
                        {...register('coApplicantMonthlyIncome', { valueAsNumber: true })}
                    />
                </Field>

                <Field label="Existing monthly EMIs (₹)" htmlFor="el-emi">
                    <Input id="el-emi" type="number" min={0} {...register('existingMonthlyEmi', { valueAsNumber: true })} />
                </Field>

                <Field label="Course location" htmlFor="el-type">
                    <Select
                        id="el-type"
                        options={[
                            { label: 'In India', value: 'domestic' },
                            { label: 'Abroad', value: 'abroad' },
                        ]}
                        {...register('courseType')}
                    />
                </Field>

                <Field label="Credit score band" htmlFor="el-cibil">
                    <Select id="el-cibil" options={CIBIL_BANDS.map((b) => ({ label: b.label, value: b.value }))} {...register('cibilBand')} />
                </Field>

                <label className="flex items-start gap-2 text-[12.5px] text-ink">
                    <Checkbox {...register('isCollateralAvailable')} />
                    Collateral (property / FD / insurance) is available
                </label>

                {collateral ? (
                    <Field label="Assessed collateral value (₹)" htmlFor="el-collateral">
                        <Input
                            id="el-collateral"
                            type="number"
                            min={0}
                            {...register('collateralValue', { valueAsNumber: true })}
                        />
                    </Field>
                ) : null}

                {error ? (
                    <p role="alert" className="text-[12.5px] font-semibold text-red-alert">
                        {error}
                    </p>
                ) : null}

                <Button type="submit" variant="primary" full loading={isSubmitting} loadingText="Checking…">
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Check eligibility
                </Button>
            </form>

            <div className="space-y-4">
                {result ? (
                    <div className="rounded-panel border border-line bg-white p-4 shadow-card" aria-live="polite">
                        <div className={cn('mb-3 rounded-[10px] border px-3 py-2 text-[12.5px] font-bold', bandTone[result.band])}>
                            {result.band === 'strong'
                                ? 'Your profile looks strong for the full course fee.'
                                : result.band === 'moderate'
                                    ? 'Partial funding looks likely — plan a top-up or scholarship.'
                                    : 'This profile may struggle to fund the full fee. Consider collateral or a stronger co-applicant.'}
                        </div>

                        <KeyValueGrid
                            columns={2}
                            items={[
                                { label: 'Indicative maximum loan', value: formatCurrency(result.maxEligibleAmount) },
                                { label: 'Recommended loan amount', value: formatCurrency(result.recommendedAmount) },
                                { label: 'Affordable monthly EMI', value: formatCurrency(result.affordableEmi) },
                                { label: 'Collateral likely needed', value: result.requiresCollateral ? 'Yes' : 'No' },
                            ]}
                        />

                        {result.notes.length > 0 ? (
                            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[12px] text-ink-soft">
                                {result.notes.map((note) => (
                                    <li key={note}>{note}</li>
                                ))}
                            </ul>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                                href={`/education-loans/calculator`}
                                className="inline-flex h-9 items-center rounded-[9px] bg-navy px-3.5 text-[12px] font-bold text-white hover:bg-navy-800"
                            >
                                Calculate EMI for {formatCompactINR(result.recommendedAmount)}
                            </Link>
                            <Link
                                href="/education-loans/compare"
                                className="inline-flex h-9 items-center rounded-[9px] border border-line px-3.5 text-[12px] font-bold text-ink hover:border-navy-200"
                            >
                                Compare lenders
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-panel border border-dashed border-line bg-white/70 p-6 text-center">
                        <p className="text-[13px] font-semibold text-ink">Fill the form to see an indicative estimate</p>
                        <p className="mt-1 text-[12px] text-ink-soft">
                            We use a conservative 50% obligation-to-income ratio, standard collateral-free ceilings and your
                            credit band.
                        </p>
                    </div>
                )}

                <p className="rounded-[10px] border border-orange-100 bg-orange-50 px-3 py-2 text-[11.5px] text-orange-700">
                    This is guidance, not a sanction. Lenders assess income proof, credit history, institute category and
                    collateral before approving any amount.
                </p>
            </div>
        </div>
    );
}
