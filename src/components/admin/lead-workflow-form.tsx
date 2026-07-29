'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Select, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { updateLeadWorkflowAction } from '@/actions/admin/lead.actions';
import { CALL_OUTCOMES } from '@/schemas/lead.schema';
import { LEAD_PRIORITIES } from '@/config/constants';
import { LEAD_STATUS_OPTIONS } from '@/config/lead-board';
import type { CounsellorOption } from '@/services/admin/lead-admin.service';

export interface LeadWorkflowState {
    id: string;
    status: string;
    priority: string;
    assignedTo?: string;
    followUpAt?: string;
    lostReason?: string;
}

/** Converts a stored date into the `datetime-local` value shape. */
function toLocalInput(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Workflow panel on the lead detail screen.
 *
 * One submit covers stage, priority, assignment, follow-up, call outcome and an
 * internal note, because a counsellor typically changes several of those in the
 * same breath after a call. The action records each as its own timeline entry.
 */
export function LeadWorkflowForm({
    lead,
    counsellors,
    canAssign,
}: {
    lead: LeadWorkflowState;
    counsellors: CounsellorOption[];
    canAssign: boolean;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

    const [status, setStatus] = useState(lead.status);
    const [priority, setPriority] = useState(lead.priority);
    const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? '');
    const [followUpAt, setFollowUpAt] = useState(toLocalInput(lead.followUpAt));
    const [callOutcome, setCallOutcome] = useState('');
    const [note, setNote] = useState('');
    const [lostReason, setLostReason] = useState(lead.lostReason ?? '');

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        startTransition(async () => {
            const result = await updateLeadWorkflowAction({
                id: lead.id,
                status,
                priority,
                // Only send assignment when the actor may change it, so a
                // lead.update-only role never trips the lead.assign check.
                ...(canAssign ? { assignedTo } : {}),
                followUpAt: followUpAt || undefined,
                callOutcome: callOutcome || undefined,
                note: note || undefined,
                lostReason: lostReason || undefined,
            });

            if (result.ok) {
                setNotice({ tone: 'ok', text: result.message ?? 'Lead updated.' });
                setNote('');
                setCallOutcome('');
                router.refresh();
            } else {
                setNotice({ tone: 'error', text: result.error });
            }
        });
    };

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Stage" htmlFor="lead-status">
                    <Select
                        id="lead-status"
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        options={LEAD_STATUS_OPTIONS}
                    />
                </Field>

                <Field label="Priority" htmlFor="lead-priority">
                    <Select
                        id="lead-priority"
                        value={priority}
                        onChange={(event) => setPriority(event.target.value)}
                        options={LEAD_PRIORITIES.map((value) => ({ label: value, value }))}
                    />
                </Field>

                {canAssign ? (
                    <Field
                        label="Assigned counsellor"
                        htmlFor="lead-assigned"
                        hint="Number in brackets is the counsellor's current open load."
                    >
                        <Select
                            id="lead-assigned"
                            value={assignedTo}
                            onChange={(event) => setAssignedTo(event.target.value)}
                            placeholder="Unassigned"
                            options={counsellors.map((counsellor) => ({
                                label: `${counsellor.name} (${counsellor.activeLeadCount})`,
                                value: counsellor.id,
                                disabled: !counsellor.isAcceptingLeads && counsellor.id !== lead.assignedTo,
                            }))}
                        />
                    </Field>
                ) : null}

                <Field label="Follow-up reminder" htmlFor="lead-followup" hint="Queues an in-app reminder for the team.">
                    <input
                        id="lead-followup"
                        type="datetime-local"
                        value={followUpAt}
                        onChange={(event) => setFollowUpAt(event.target.value)}
                        className="h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none focus:border-navy-300 focus:ring-2 focus:ring-navy-100"
                    />
                </Field>

                <Field label="Call outcome" htmlFor="lead-call" hint="Logs a call attempt on the timeline.">
                    <Select
                        id="lead-call"
                        value={callOutcome}
                        onChange={(event) => setCallOutcome(event.target.value)}
                        placeholder="No call to log"
                        options={CALL_OUTCOMES.map((value) => ({ label: value.replace(/_/g, ' '), value }))}
                    />
                </Field>

                {status === 'lost' || lostReason ? (
                    <Field label="Lost reason" htmlFor="lead-lost">
                        <Select
                            id="lead-lost"
                            value={lostReason}
                            onChange={(event) => setLostReason(event.target.value)}
                            placeholder="Select a reason"
                            options={[
                                'Not reachable',
                                'Budget mismatch',
                                'Chose another platform',
                                'Admission already secured',
                                'Not eligible',
                                'Not interested',
                            ].map((value) => ({ label: value, value }))}
                        />
                    </Field>
                ) : null}
            </div>

            <Field label="Internal note" htmlFor="lead-note" hint="Visible to staff only. Never shown to the student.">
                <Textarea
                    id="lead-note"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="What did the student say? What is the next step?"
                    maxLength={4000}
                />
            </Field>

            <div aria-live="polite">
                {notice ? (
                    <p
                        className={
                            notice.tone === 'ok'
                                ? 'rounded-[10px] border border-green-50 bg-green-50 px-3 py-2 text-[12px] font-semibold text-green'
                                : 'rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-alert'
                        }
                    >
                        {notice.text}
                    </p>
                ) : null}
            </div>

            <Button type="submit" loading={pending} loadingText="Saving…" className="w-full sm:w-auto">
                Save update
            </Button>
        </form>
    );
}
