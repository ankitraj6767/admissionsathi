'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GripVertical, Loader2, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import { updateLeadWorkflowAction } from '@/actions/admin/lead.actions';
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONES } from '@/config/lead-board';
import { formatRelativeTime } from '@/lib/utils';
import type { CounsellorOption } from '@/services/admin/lead-admin.service';

export interface BoardLead {
    _id: string;
    reference: string;
    name: string;
    phone: string;
    email?: string;
    cityName?: string;
    stateName?: string;
    courseInterestName?: string;
    collegeInterestName?: string;
    source: string;
    status: string;
    priority: string;
    score?: number;
    assignedToName?: string;
    followUpAt?: string;
    isDuplicate?: boolean;
    createdAt: string;
}

export interface BoardColumn {
    status: string;
    total: number;
    items: BoardLead[];
}

const PRIORITY_TONES: Record<string, 'red' | 'amber' | 'neutral' | 'blue'> = {
    urgent: 'red',
    high: 'amber',
    medium: 'blue',
    low: 'neutral',
};

/**
 * Lead pipeline board.
 *
 * Uses the native HTML drag-and-drop API rather than a drag library: a card only
 * ever moves between columns, and native DnD gives us that with keyboard-accessible
 * fallbacks (each card also carries a status `<select>`, so the board is fully
 * operable without a pointer).
 */
export function LeadBoard({
    columns,
    counsellors,
    canUpdate,
    canAssign,
}: {
    columns: BoardColumn[];
    counsellors: CounsellorOption[];
    canUpdate: boolean;
    canAssign: boolean;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [dragging, setDragging] = useState<BoardLead | null>(null);
    const [hoverStatus, setHoverStatus] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

    const move = (leadId: string, status: string) => {
        startTransition(async () => {
            const result = await updateLeadWorkflowAction({ id: leadId, status });
            setNotice(
                result.ok
                    ? { tone: 'ok', text: result.message ?? 'Lead moved.' }
                    : { tone: 'error', text: result.error },
            );
            router.refresh();
        });
    };

    const assign = (leadId: string, assignedTo: string) => {
        startTransition(async () => {
            const result = await updateLeadWorkflowAction({ id: leadId, assignedTo });
            setNotice(
                result.ok
                    ? { tone: 'ok', text: result.message ?? 'Lead assigned.' }
                    : { tone: 'error', text: result.error },
            );
            router.refresh();
        });
    };

    return (
        <div className="space-y-3">
            <div aria-live="polite" className="min-h-0">
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

            <div className="flex items-center gap-2 text-[11.5px] text-ink-soft">
                <GripVertical className="h-3.5 w-3.5" aria-hidden />
                Drag a card to change its stage, or use the stage dropdown on the card.
                {pending ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            </div>

            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3">
                {columns.map((column) => {
                    const isTarget = hoverStatus === column.status && dragging?.status !== column.status;
                    return (
                        <section
                            key={column.status}
                            aria-label={LEAD_STATUS_LABELS[column.status] ?? column.status}
                            onDragOver={(event) => {
                                if (!canUpdate || !dragging) return;
                                event.preventDefault();
                                setHoverStatus(column.status);
                            }}
                            onDragLeave={() => setHoverStatus((prev) => (prev === column.status ? null : prev))}
                            onDrop={(event) => {
                                event.preventDefault();
                                setHoverStatus(null);
                                if (!canUpdate || !dragging || dragging.status === column.status) return;
                                move(dragging._id, column.status);
                                setDragging(null);
                            }}
                            className={`flex w-[268px] shrink-0 snap-start flex-col rounded-panel border bg-page/60 ${isTarget ? 'border-orange bg-orange-50/60' : 'border-line'
                                }`}
                        >
                            <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
                                <h3 className="truncate text-[12px] font-extrabold uppercase tracking-wide text-ink">
                                    {LEAD_STATUS_LABELS[column.status] ?? column.status}
                                </h3>
                                <Badge tone={LEAD_STATUS_TONES[column.status] ?? 'neutral'}>{column.total}</Badge>
                            </header>

                            <div className="flex-1 space-y-2 p-2">
                                {column.items.length === 0 ? (
                                    <p className="px-1 py-6 text-center text-[11.5px] text-ink-soft">No leads here.</p>
                                ) : (
                                    column.items.map((lead) => (
                                        <article
                                            key={lead._id}
                                            draggable={canUpdate}
                                            onDragStart={() => setDragging(lead)}
                                            onDragEnd={() => {
                                                setDragging(null);
                                                setHoverStatus(null);
                                            }}
                                            className="rounded-[12px] border border-line bg-white p-2.5 shadow-card"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <Link
                                                    href={`/admin/leads/${lead._id}`}
                                                    className="min-w-0 text-[12.5px] font-bold text-ink hover:text-navy-700"
                                                >
                                                    <span className="block truncate">{lead.name}</span>
                                                    <span className="block truncate text-[10.5px] font-semibold text-ink-soft">
                                                        {lead.reference}
                                                    </span>
                                                </Link>
                                                <Badge tone={PRIORITY_TONES[lead.priority] ?? 'neutral'}>{lead.priority}</Badge>
                                            </div>

                                            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                                                <Phone className="h-3 w-3" aria-hidden />
                                                <a href={`tel:${lead.phone}`} className="hover:text-navy-700">
                                                    {lead.phone}
                                                </a>
                                            </p>

                                            {lead.courseInterestName || lead.collegeInterestName ? (
                                                <p className="mt-1 line-clamp-1 text-[11px] text-ink-soft">
                                                    {lead.courseInterestName ?? lead.collegeInterestName}
                                                </p>
                                            ) : null}

                                            <div className="mt-2 flex flex-wrap items-center gap-1">
                                                {lead.isDuplicate ? <Badge tone="amber">Duplicate</Badge> : null}
                                                <Badge tone="neutral">{lead.source.replace(/_/g, ' ')}</Badge>
                                                {lead.score ? <Badge tone="navy">{lead.score}</Badge> : null}
                                            </div>

                                            {canUpdate ? (
                                                <div className="mt-2 space-y-1.5 border-t border-line pt-2">
                                                    <label className="sr-only" htmlFor={`stage-${lead._id}`}>
                                                        Stage for {lead.name}
                                                    </label>
                                                    <select
                                                        id={`stage-${lead._id}`}
                                                        value={lead.status}
                                                        disabled={pending}
                                                        onChange={(event) => move(lead._id, event.target.value)}
                                                        className="h-8 w-full rounded-[8px] border border-line bg-white px-2 text-[11.5px] outline-none focus:border-navy-300"
                                                    >
                                                        {columns.map((option) => (
                                                            <option key={option.status} value={option.status}>
                                                                {LEAD_STATUS_LABELS[option.status] ?? option.status}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    {canAssign ? (
                                                        <>
                                                            <label className="sr-only" htmlFor={`assign-${lead._id}`}>
                                                                Counsellor for {lead.name}
                                                            </label>
                                                            <select
                                                                id={`assign-${lead._id}`}
                                                                defaultValue=""
                                                                disabled={pending}
                                                                onChange={(event) =>
                                                                    event.target.value && assign(lead._id, event.target.value)
                                                                }
                                                                className="h-8 w-full rounded-[8px] border border-line bg-white px-2 text-[11.5px] outline-none focus:border-navy-300"
                                                            >
                                                                <option value="">
                                                                    {lead.assignedToName ?? 'Unassigned'} — reassign…
                                                                </option>
                                                                {counsellors.map((counsellor) => (
                                                                    <option key={counsellor.id} value={counsellor.id}>
                                                                        {counsellor.name} ({counsellor.activeLeadCount})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            <p className="mt-2 text-[10.5px] text-ink-soft">
                                                {lead.assignedToName ? `${lead.assignedToName} • ` : 'Unassigned • '}
                                                {formatRelativeTime(lead.createdAt)}
                                            </p>
                                        </article>
                                    ))
                                )}

                                {column.total > column.items.length ? (
                                    <Link
                                        href={`/admin/leads?view=table&status=${column.status}`}
                                        className="block rounded-[10px] border border-dashed border-line px-2 py-2 text-center text-[11.5px] font-semibold text-navy-600 hover:border-navy-200"
                                    >
                                        View all {column.total} in table
                                    </Link>
                                ) : null}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
