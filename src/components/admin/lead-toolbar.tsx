'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, KanbanSquare, Loader2, Rows3, Search, SlidersHorizontal } from 'lucide-react';
import { LEAD_PRIORITIES, LEAD_SOURCES } from '@/config/constants';
import { LEAD_STATUS_OPTIONS } from '@/config/lead-board';
import { exportLeadsAction } from '@/actions/admin/lead.actions';
import type { CounsellorOption } from '@/services/admin/lead-admin.service';

/** Filter bar shared by both lead views, plus the view toggle and CSV export. */
export function LeadToolbar({
    view,
    counsellors,
    canExport,
}: {
    view: 'board' | 'table';
    counsellors: CounsellorOption[];
    canExport: boolean;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [term, setTerm] = useState(searchParams?.get('q') ?? '');
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const push = (mutate: (params: URLSearchParams) => void) => {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        mutate(params);
        params.delete('page');
        startTransition(() => router.push(`/admin/leads?${params.toString()}`));
    };

    const setParam = (key: string, value: string) =>
        push((params) => {
            if (value) params.set(key, value);
            else params.delete(key);
        });

    const runExport = () => {
        setError(null);
        startTransition(async () => {
            const filters = Object.fromEntries(searchParams?.entries() ?? []);
            const result = await exportLeadsAction(filters);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            // Assembled client-side so the download stays behind the action's
            // permission check instead of a guessable file URL.
            const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.data.filename;
            link.click();
            URL.revokeObjectURL(url);
        });
    };

    const selectClass =
        'h-9 rounded-[9px] border border-line bg-white px-2.5 text-[12px] text-ink outline-none focus:border-navy-300';

    // Filter params that are currently narrowing the list, for the mobile badge.
    const activeFilterCount = ['status', 'priority', 'source', 'assignedTo', 'from', 'to'].filter(
        (key) => searchParams?.get(key),
    ).length;

    return (
        <div className="mb-3 rounded-panel border border-line bg-white p-3 shadow-card">
            {/* Row one stays a single line on every width so the view toggle and export
                never get pushed below the fold on a narrow screen. */}
            <div className="flex flex-wrap items-center gap-2">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        setParam('q', term);
                    }}
                    className="relative min-w-[180px] flex-1"
                >
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft"
                        aria-hidden
                    />
                    <input
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        placeholder="Name, phone, email or reference…"
                        aria-label="Search leads"
                        className="h-9 w-full rounded-[9px] border border-line bg-page pl-9 pr-3 text-[12.5px] outline-none focus:border-navy-300"
                    />
                </form>

                <div
                    role="group"
                    aria-label="Lead view"
                    className="inline-flex overflow-hidden rounded-[9px] border border-line"
                >
                    <button
                        type="button"
                        aria-pressed={view === 'board'}
                        onClick={() => setParam('view', 'board')}
                        className={`inline-flex h-9 items-center gap-1.5 px-3 text-[12px] font-bold ${view === 'board' ? 'bg-navy text-white' : 'bg-white text-ink-soft hover:text-navy-700'
                            }`}
                    >
                        <KanbanSquare className="h-3.5 w-3.5" aria-hidden />
                        Board
                    </button>
                    <button
                        type="button"
                        aria-pressed={view === 'table'}
                        onClick={() => setParam('view', 'table')}
                        className={`inline-flex h-9 items-center gap-1.5 border-l border-line px-3 text-[12px] font-bold ${view === 'table' ? 'bg-navy text-white' : 'bg-white text-ink-soft hover:text-navy-700'
                            }`}
                    >
                        <Rows3 className="h-3.5 w-3.5" aria-hidden />
                        Table
                    </button>
                </div>

                {canExport ? (
                    <button
                        type="button"
                        onClick={runExport}
                        disabled={pending}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line px-3 text-[12px] font-bold text-ink hover:border-navy-200 disabled:opacity-60"
                    >
                        <Download className="h-3.5 w-3.5" aria-hidden />
                        <span className="hidden sm:inline">Export CSV</span>
                        <span className="sm:hidden">CSV</span>
                    </button>
                ) : null}

                {/* Below `lg` the six filter controls would stack into a very tall block,
                    so they collapse behind this disclosure instead. */}
                <button
                    type="button"
                    aria-expanded={filtersOpen}
                    aria-controls="lead-filters"
                    onClick={() => setFiltersOpen((open) => !open)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line px-3 text-[12px] font-bold text-ink hover:border-navy-200 lg:hidden"
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                    Filters
                    {activeFilterCount > 0 ? (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-orange px-1 text-[10px] text-white">
                            {activeFilterCount}
                        </span>
                    ) : null}
                </button>

                {pending ? <Loader2 className="h-4 w-4 animate-spin text-ink-soft" aria-hidden /> : null}
            </div>

            <div
                id="lead-filters"
                className={`mt-2 flex-wrap items-center gap-2 ${filtersOpen ? 'flex' : 'hidden'} lg:flex`}
            >
                <select
                    aria-label="Filter by stage"
                    value={searchParams?.get('status') ?? ''}
                    onChange={(event) => setParam('status', event.target.value)}
                    className={selectClass}
                >
                    <option value="">All stages</option>
                    {LEAD_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <select
                    aria-label="Filter by priority"
                    value={searchParams?.get('priority') ?? ''}
                    onChange={(event) => setParam('priority', event.target.value)}
                    className={selectClass}
                >
                    <option value="">Any priority</option>
                    {LEAD_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                            {priority}
                        </option>
                    ))}
                </select>

                <select
                    aria-label="Filter by source"
                    value={searchParams?.get('source') ?? ''}
                    onChange={(event) => setParam('source', event.target.value)}
                    className={selectClass}
                >
                    <option value="">Any source</option>
                    {LEAD_SOURCES.map((source) => (
                        <option key={source} value={source}>
                            {source.replace(/_/g, ' ')}
                        </option>
                    ))}
                </select>

                <select
                    aria-label="Filter by counsellor"
                    value={searchParams?.get('assignedTo') ?? ''}
                    onChange={(event) => setParam('assignedTo', event.target.value)}
                    className={selectClass}
                >
                    <option value="">Any counsellor</option>
                    {counsellors.map((counsellor) => (
                        <option key={counsellor.id} value={counsellor.id}>
                            {counsellor.name}
                        </option>
                    ))}
                </select>

                <label className="sr-only" htmlFor="lead-from">
                    Received from
                </label>
                <input
                    id="lead-from"
                    type="date"
                    value={searchParams?.get('from') ?? ''}
                    onChange={(event) => setParam('from', event.target.value)}
                    className={selectClass}
                />
                <label className="sr-only" htmlFor="lead-to">
                    Received until
                </label>
                <input
                    id="lead-to"
                    type="date"
                    value={searchParams?.get('to') ?? ''}
                    onChange={(event) => setParam('to', event.target.value)}
                    className={selectClass}
                />
            </div>

            {error ? (
                <p role="alert" className="mt-2 text-[12px] font-semibold text-red-alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
