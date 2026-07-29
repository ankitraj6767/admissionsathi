'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { createLeadAction } from '@/actions/admin/lead.actions';
import { LEAD_PRIORITIES, LEAD_SOURCES } from '@/config/constants';
import type { CounsellorOption } from '@/services/admin/lead-admin.service';
import type { FieldErrors } from '@/types/common';

export interface GeoOption {
    id: string;
    name: string;
}

/** Manual lead entry for phone enquiries, walk-ins and event capture. */
export function LeadCreateForm({
    counsellors,
    states,
    canAssign,
}: {
    counsellors: CounsellorOption[];
    states: GeoOption[];
    canAssign: boolean;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = Object.fromEntries(formData.entries());

        startTransition(async () => {
            setError(null);
            setFieldErrors({});
            const result = await createLeadAction(payload);

            if (result.ok) {
                router.push(`/admin/leads/${result.data.leadId}`);
                return;
            }
            setError(result.error);
            setFieldErrors(result.fieldErrors ?? {});
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4 rounded-panel border border-line bg-white p-4 shadow-card md:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Student name" htmlFor="name" required error={fieldErrors.name?.[0]}>
                    <Input id="name" name="name" required maxLength={120} autoComplete="off" />
                </Field>

                <Field label="Phone" htmlFor="phone" required error={fieldErrors.phone?.[0]}>
                    <Input id="phone" name="phone" required inputMode="tel" placeholder="10-digit mobile number" />
                </Field>

                <Field label="Email" htmlFor="email" error={fieldErrors.email?.[0]}>
                    <Input id="email" name="email" type="email" autoComplete="off" />
                </Field>

                <Field label="Course interest" htmlFor="courseInterest" error={fieldErrors.courseInterest?.[0]}>
                    <Input id="courseInterest" name="courseInterest" placeholder="e.g. B.Tech Computer Science" />
                </Field>

                <Field label="State" htmlFor="stateId" error={fieldErrors.stateId?.[0]}>
                    <Select
                        id="stateId"
                        name="stateId"
                        placeholder="Not specified"
                        options={states.map((state) => ({ label: state.name, value: state.id }))}
                    />
                </Field>

                <Field label="Source" htmlFor="source" error={fieldErrors.source?.[0]}>
                    <Select
                        id="source"
                        name="source"
                        defaultValue="admin_manual"
                        options={LEAD_SOURCES.map((source) => ({ label: source.replace(/_/g, ' '), value: source }))}
                    />
                </Field>

                <Field label="Priority" htmlFor="priority" error={fieldErrors.priority?.[0]}>
                    <Select
                        id="priority"
                        name="priority"
                        defaultValue="medium"
                        options={LEAD_PRIORITIES.map((priority) => ({ label: priority, value: priority }))}
                    />
                </Field>

                {canAssign ? (
                    <Field label="Assign to" htmlFor="assignedTo" error={fieldErrors.assignedTo?.[0]}>
                        <Select
                            id="assignedTo"
                            name="assignedTo"
                            placeholder="Leave unassigned"
                            options={counsellors.map((counsellor) => ({
                                label: `${counsellor.name} (${counsellor.activeLeadCount})`,
                                value: counsellor.id,
                            }))}
                        />
                    </Field>
                ) : null}
            </div>

            <Field
                label="Notes"
                htmlFor="message"
                error={fieldErrors.message?.[0]}
                hint="What the student asked for. Recorded as the first timeline entry."
            >
                <Textarea id="message" name="message" rows={3} maxLength={2000} />
            </Field>

            <p className="rounded-[10px] border border-orange-100 bg-orange-50 px-3 py-2 text-[11.5px] leading-relaxed text-orange-700">
                Only create a lead when the student has agreed to be contacted. Consent is recorded against your account as
                verbal consent taken by staff.
            </p>

            <div aria-live="polite">
                {error ? (
                    <p role="alert" className="text-[12.5px] font-semibold text-red-alert">
                        {error}
                    </p>
                ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={pending} loadingText="Creating…">
                    Create lead
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push('/admin/leads')}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
