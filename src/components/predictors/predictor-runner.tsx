'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Gauge, Loader2, Sparkles } from 'lucide-react';
import { predictorRunSchema, type PredictorRunValues } from '@/schemas/predictor.schema';
import { runPredictorAction, savePredictorLeadAction } from '@/actions/predictor.actions';
import type { PredictionResult } from '@/services/predictor.service';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { RESERVATION_CATEGORIES, QUOTA_TYPES } from '@/config/constants';
import { formatCompactINR } from '@/lib/utils';
import { getAnonymousId, track } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

const bandStyles: Record<string, string> = {
    green: 'bg-green-50 text-green border-green/30',
    teal: 'bg-teal-50 text-teal-600 border-teal/30',
    amber: 'bg-amber-50 text-amber-alert border-amber-alert/30',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-alert border-red-alert/30',
};

export interface PredictorRunnerProps {
    predictorSlug: string;
    predictorName: string;
    metric: 'rank' | 'percentile' | 'score';
    disclaimer: string;
    options: {
        branches: string[];
        states: string[];
        collegeTypes: string[];
        rounds: number[];
    };
    consentText: string;
}

/** Predictor input form + results table + optional counsellor lead capture. */
export function PredictorRunner({
    predictorSlug,
    predictorName,
    metric,
    disclaimer,
    options,
    consentText,
}: PredictorRunnerProps) {
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const [leadSaved, setLeadSaved] = useState<string | null>(null);
    const idempotencyKey = useMemo(
        () => `pred_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`,
        [],
    );

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<PredictorRunValues>({
        resolver: zodResolver(predictorRunSchema),
        defaultValues: {
            predictorSlug,
            metricValue: undefined,
            category: 'General',
            round: 1,
            branches: [],
            preferredStates: [],
            collegeType: '',
            homeState: '',
        },
    });

    const leadForm = useForm<{ name: string; phone: string; email: string; consent: boolean }>({
        defaultValues: { name: '', phone: '', email: '', consent: false },
    });

    const onSubmit = async (values: PredictorRunValues) => {
        setServerError(null);
        setMessage(null);
        track({ name: ANALYTICS_EVENTS.predictorStart, properties: { predictor: predictorSlug } });

        const response = await runPredictorAction({
            ...values,
            anonymousId: getAnonymousId(),
            branches: values.branches ?? [],
            preferredStates: values.preferredStates ?? [],
        });

        if (response.ok) {
            setResult(response.data);
            setMessage(response.message ?? null);
            track({
                name: ANALYTICS_EVENTS.predictorComplete,
                properties: { predictor: predictorSlug, results: response.data.rows.length },
            });
        } else {
            setServerError(response.error);
        }
    };

    const metricLabel =
        metric === 'rank' ? 'Your All India Rank' : metric === 'percentile' ? 'Your percentile' : 'Your score';

    return (
        <div className="space-y-4">
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="rounded-panel border border-line bg-white p-4 shadow-card md:p-5"
                noValidate
            >
                <h2 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-navy-800">
                    <Gauge className="h-4 w-4 text-navy-600" aria-hidden />
                    Enter your details
                </h2>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label={metricLabel} htmlFor="metricValue" required error={errors.metricValue?.message}>
                        <Input
                            id="metricValue"
                            type="number"
                            step={metric === 'percentile' ? '0.001' : '1'}
                            inputMode="decimal"
                            placeholder={metric === 'rank' ? 'e.g. 25000' : metric === 'percentile' ? 'e.g. 92.5' : 'e.g. 540'}
                            invalid={Boolean(errors.metricValue)}
                            {...register('metricValue')}
                        />
                    </Field>

                    <Field label="Category" htmlFor="category" required>
                        <Select id="category" options={RESERVATION_CATEGORIES.map((c) => ({ label: c, value: c }))} {...register('category')} />
                    </Field>

                    <Field label="Gender" htmlFor="gender">
                        <Select
                            id="gender"
                            placeholder="Any"
                            options={[
                                { label: 'Male', value: 'Male' },
                                { label: 'Female', value: 'Female' },
                                { label: 'Other', value: 'Other' },
                            ]}
                            {...register('gender')}
                        />
                    </Field>

                    <Field label="Quota" htmlFor="quota">
                        <Select id="quota" placeholder="Any quota" options={QUOTA_TYPES.map((q) => ({ label: q, value: q }))} {...register('quota')} />
                    </Field>

                    <Field label="Counselling round" htmlFor="round">
                        <Select
                            id="round"
                            options={(options.rounds.length ? options.rounds : [1, 2, 3]).map((r) => ({
                                label: `Round ${r}`,
                                value: String(r),
                            }))}
                            {...register('round')}
                        />
                    </Field>

                    <Field label="College type" htmlFor="collegeType">
                        <Select
                            id="collegeType"
                            placeholder="Any type"
                            options={options.collegeTypes.map((t) => ({ label: t, value: t }))}
                            {...register('collegeType')}
                        />
                    </Field>

                    {options.states.length > 0 ? (
                        <Field label="Home state (for state quota)" htmlFor="homeState">
                            <Select
                                id="homeState"
                                placeholder="Select state"
                                options={options.states.map((s) => ({ label: s, value: s }))}
                                {...register('homeState')}
                            />
                        </Field>
                    ) : null}

                    {options.branches.length > 0 ? (
                        <Field
                            label="Preferred branches"
                            htmlFor="branches"
                            hint="Hold Ctrl / Cmd to select more than one"
                            className="sm:col-span-2"
                        >
                            <select
                                id="branches"
                                multiple
                                size={4}
                                className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[12.5px] outline-none focus:border-navy-300"
                                {...register('branches')}
                            >
                                {options.branches.map((branch) => (
                                    <option key={branch} value={branch}>
                                        {branch}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    ) : null}
                </div>

                {serverError ? (
                    <p role="alert" className="mt-3 text-[12.5px] font-semibold text-red-alert">
                        {serverError}
                    </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button type="submit" variant="primary" size="lg" loading={isSubmitting} loadingText="Analysing…">
                        <Sparkles className="h-4 w-4" aria-hidden />
                        Predict my colleges
                    </Button>
                    <p className="text-[11.5px] text-ink-soft">Free • No sign-up required</p>
                </div>
            </form>

            <div className="flex gap-2 rounded-[12px] border border-orange-100 bg-orange-50 px-3.5 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden />
                <p className="text-[11.5px] leading-relaxed text-orange-700">{disclaimer}</p>
            </div>

            {isSubmitting ? (
                <div className="flex items-center gap-2 rounded-panel border border-line bg-white p-4 text-[13px] text-ink-soft">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Matching your score against previous-year closing data…
                </div>
            ) : null}

            {result ? (
                <section aria-live="polite" className="space-y-4">
                    <div className="rounded-panel border border-line bg-white p-4 shadow-card">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-[15px] font-extrabold text-navy-800">
                                {result.totalMatched} matching options
                            </h2>
                            <p className="text-[11.5px] text-ink-soft">
                                Based on {result.datasetYear ? `${result.datasetYear} ` : ''}closing data
                                {result.datasetVersion ? ` (dataset v${result.datasetVersion})` : ''}
                            </p>
                        </div>

                        <ul className="mb-4 flex flex-wrap gap-2">
                            {Object.entries(result.summary).map(([band, count]) => (
                                <li key={band}>
                                    <Badge tone={band === 'very_high' || band === 'high' ? 'green' : band === 'moderate' ? 'amber' : 'orange'} size="lg">
                                        {band.replace('_', ' ')}: {count}
                                    </Badge>
                                </li>
                            ))}
                        </ul>

                        {result.rows.length === 0 ? (
                            <EmptyState
                                icon="Gauge"
                                title="No historical matches for these inputs"
                                description="Try a different round, remove the branch filter, or widen the quota."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[12px]">
                                    <thead>
                                        <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-soft">
                                            <th className="py-2 pr-3">College</th>
                                            <th className="py-2 pr-3">Branch</th>
                                            <th className="py-2 pr-3">Chance</th>
                                            <th className="py-2 pr-3">Prev. closing</th>
                                            <th className="py-2 pr-3">Expected</th>
                                            <th className="py-2 pr-3">Quota</th>
                                            <th className="py-2">Fee</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.rows.map((row, index) => (
                                            <tr key={`${row.collegeName}-${row.branchName}-${index}`} className="border-b border-line/70 last:border-0">
                                                <td className="py-2.5 pr-3">
                                                    {row.collegeSlug ? (
                                                        <Link href={`/colleges/${row.collegeSlug}`} className="font-semibold text-ink hover:text-navy-700">
                                                            {row.collegeName}
                                                        </Link>
                                                    ) : (
                                                        <span className="font-semibold text-ink">{row.collegeName}</span>
                                                    )}
                                                    {row.location ? (
                                                        <span className="block text-[10.5px] text-ink-soft">{row.location}</span>
                                                    ) : null}
                                                </td>
                                                <td className="py-2.5 pr-3 text-ink-soft">{row.branchName}</td>
                                                <td className="py-2.5 pr-3">
                                                    <span
                                                        className={`inline-flex rounded-pill border px-2 py-0.5 text-[10px] font-bold ${bandStyles[row.bandTone] ?? bandStyles.amber
                                                            }`}
                                                    >
                                                        {row.bandLabel}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 pr-3 font-semibold text-ink">
                                                    {row.previousClosing?.toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-2.5 pr-3 text-ink-soft">
                                                    {row.expectedClosing?.toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-2.5 pr-3 text-ink-soft">
                                                    {row.quota} • R{row.round}
                                                </td>
                                                <td className="py-2.5 text-ink-soft">{formatCompactINR(row.annualFee)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {message ? <p className="mt-3 text-[12px] text-ink-soft">{message}</p> : null}
                    </div>

                    {/* Lead capture */}
                    <div className="rounded-panel border border-line bg-white p-4 shadow-card">
                        {leadSaved ? (
                            <p className="text-[13px] font-semibold text-green">
                                Saved. Reference {leadSaved}. A counsellor will review your list and call you.
                            </p>
                        ) : (
                            <form
                                onSubmit={leadForm.handleSubmit(async (values) => {
                                    const response = await savePredictorLeadAction({
                                        sessionId: result.sessionId,
                                        name: values.name,
                                        phone: values.phone,
                                        email: values.email,
                                        consent: values.consent,
                                        idempotencyKey,
                                    });
                                    if (response.ok) setLeadSaved(response.data.reference);
                                    else setServerError(response.error);
                                })}
                                className="space-y-3"
                            >
                                <h2 className="text-[14px] font-extrabold text-navy-800">
                                    Want a counsellor to review this list with you?
                                </h2>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <Input placeholder="Your name" aria-label="Your name" {...leadForm.register('name', { required: true })} />
                                    <Input placeholder="Mobile number" aria-label="Mobile number" inputMode="numeric" {...leadForm.register('phone', { required: true })} />
                                    <Input placeholder="Email (optional)" aria-label="Email" type="email" {...leadForm.register('email')} />
                                </div>
                                <label className="flex items-start gap-2 text-[11px] text-ink-soft">
                                    <Checkbox {...leadForm.register('consent', { required: true })} />
                                    {consentText}
                                </label>
                                <Button type="submit" variant="navy" size="md" loading={leadForm.formState.isSubmitting}>
                                    Send my result list to a counsellor
                                </Button>
                            </form>
                        )}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
