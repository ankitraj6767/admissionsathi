'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import { Pagination } from '@/components/shared/pagination';
import { bulkUpdateLeadsAction } from '@/actions/admin/lead.actions';
import { LEAD_PRIORITIES } from '@/config/constants';
import { LEAD_STATUS_LABELS, LEAD_STATUS_OPTIONS, LEAD_STATUS_TONES } from '@/config/lead-board';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import type { BoardLead } from './lead-board';
import type { CounsellorOption } from '@/services/admin/lead-admin.service';

const PRIORITY_TONES: Record<string, 'red' | 'amber' | 'blue' | 'neutral'> = {
    urgent: 'red',
    high: 'amber',
    medium: 'blue',
    low: 'neutral',
};

/** Table view with row selection and a bulk action bar. */
export function LeadTable({
    rows,
    page,
    totalPages,
    total,
    pageSize,
    counsellors,
    canUpdate,
    canAssign,
}: {
    rows: BoardLead[];
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    counsellors: CounsellorOption[];
    canUpdate: boolean;
    canAssign: boolean;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
    const [pending, startTransition] = useTransition();

    const selectedIds = Object.entries(selected)
        .filter(([, value]) => value)
        .map(([id]) => id);

    const allSelected = rows.length > 0 && rows.every((row) => selected[row._id]);

    const applyBulk = (patch: { status?: string; priority?: string; assignedTo?: string }) => {
        startTransition(async () => {
            const result = await bulkUpdateLeadsAction({ ids: selectedIds, ...patch });
            setNotice(
                result.ok
                    ? { tone: 'ok', text: result.message ?? 'Updated.' }
                    : { tone: 'error', text: result.error },
            );
            setSelected({});
            router.refresh();
        });
    };

    const bulkSelectClass =
        'h-8 rounded-[8px] border border-orange-200 bg-orange-50 px-2 text-[11.5px] font-semibold text-orange-700';

    return (
        <div className="rounded-panel border border-line bg-white shadow-card">
            {selectedIds.length > 0 && canUpdate ? (
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-orange-50/50 p-3">
                    <span className="text-[11.5px] font-bold text-orange-700">{selectedIds.length} selected</span>

                    <select
                        aria-label="Bulk set stage"
                        defaultValue=""
                        onChange={(event) => event.target.value && applyBulk({ status: event.target.value })}
                        className={bulkSelectClass}
                    >
                        <option value="">Set stage…</option>
                        {LEAD_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label="Bulk set priority"
                        defaultValue=""
                        onChange={(event) => event.target.value && applyBulk({ priority: event.target.value })}
                        className={bulkSelectClass}
                    >
                        <option value="">Set priority…</option>
                        {LEAD_PRIORITIES.map((priority) => (
                            <option key={priority} value={priority}>
                                {priority}
                            </option>
                        ))}
                    </select>

                    {canAssign ? (
                        <select
                            aria-label="Bulk assign counsellor"
                            defaultValue=""
                            onChange={(event) => event.target.value && applyBulk({ assignedTo: event.target.value })}
                            className={bulkSelectClass}
                        >
                            <option value="">Assign to…</option>
                            {counsellors.map((counsellor) => (
                                <option key={counsellor.id} value={counsellor.id}>
                                    {counsellor.name} ({counsellor.activeLeadCount})
                                </option>
                            ))}
                        </select>
                    ) : null}

                    {pending ? <Loader2 className="h-4 w-4 animate-spin text-orange-700" aria-hidden /> : null}
                </div>
            ) : null}

            {notice ? (
                <p
                    role="status"
                    className={
                        notice.tone === 'ok'
                            ? 'border-b border-line bg-green-50 px-3 py-2 text-[12px] font-semibold text-green'
                            : 'border-b border-line bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-alert'
                    }
                >
                    {notice.text}
                </p>
            ) : null}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                    <caption className="sr-only">Leads with stage, priority, source and assigned counsellor</caption>
                    <thead>
                        <tr className="border-b border-line">
                            <th scope="col" className="px-3 py-2.5">
                                <input
                                    type="checkbox"
                                    aria-label="Select all rows"
                                    checked={allSelected}
                                    onChange={(event) =>
                                        setSelected(
                                            event.target.checked
                                                ? Object.fromEntries(rows.map((row) => [row._id, true]))
                                                : {},
                                        )
                                    }
                                    className="h-3.5 w-3.5 accent-orange"
                                />
                            </th>
                            {['Ref', 'Lead', 'Interest', 'Source', 'Counsellor', 'Stage', 'Follow-up', 'Received'].map(
                                (label) => (
                                    <th
                                        key={label}
                                        scope="col"
                                        className="whitespace-nowrap px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft"
                                    >
                                        {label}
                                    </th>
                                ),
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-3 py-10 text-center text-[13px] text-ink-soft">
                                    No leads match these filters.
                                </td>
                            </tr>
                        ) : (
                            rows.map((lead) => (
                                <tr key={lead._id} className="border-b border-line/70 last:border-0 hover:bg-muted/40">
                                    <td className="px-3 py-2.5">
                                        <input
                                            type="checkbox"
                                            aria-label={`Select ${lead.name}`}
                                            checked={Boolean(selected[lead._id])}
                                            onChange={(event) =>
                                                setSelected((prev) => ({ ...prev, [lead._id]: event.target.checked }))
                                            }
                                            className="h-3.5 w-3.5 accent-orange"
                                        />
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-ink-soft">
                                        {lead.reference}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <Link href={`/admin/leads/${lead._id}`} className="font-bold text-ink hover:text-navy-700">
                                            {lead.name}
                                        </Link>
                                        <span className="block text-[11px] text-ink-soft">
                                            {lead.phone}
                                            {lead.cityName ? ` • ${lead.cityName}` : ''}
                                        </span>
                                    </td>
                                    <td className="max-w-[180px] px-3 py-2.5">
                                        <span className="block truncate">
                                            {lead.courseInterestName ?? lead.collegeInterestName ?? '—'}
                                        </span>
                                        <Badge tone={PRIORITY_TONES[lead.priority] ?? 'neutral'}>{lead.priority}</Badge>
                                    </td>
                                    <td className="px-3 py-2.5 text-ink-soft">{lead.source.replace(/_/g, ' ')}</td>
                                    <td className="px-3 py-2.5">{lead.assignedToName ?? '—'}</td>
                                    <td className="px-3 py-2.5">
                                        <Badge tone={LEAD_STATUS_TONES[lead.status] ?? 'neutral'}>
                                            {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                                        </Badge>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">
                                        {lead.followUpAt ? formatDate(lead.followUpAt) : '—'}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">
                                        {formatRelativeTime(lead.createdAt)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-line p-3">
                <Pagination
                    basePath="/admin/leads"
                    params={Object.fromEntries(searchParams?.entries() ?? [])}
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    pageSize={pageSize}
                />
            </div>
        </div>
    );
}
