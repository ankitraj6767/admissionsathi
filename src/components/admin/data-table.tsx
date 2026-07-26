'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Loader2, Pencil, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/shared/pagination';
import { deleteResourceAction, bulkStatusAction } from '@/actions/admin/crud.actions';
import { formatCompactINR, formatDate } from '@/lib/utils';
import type { AdminColumn } from '@/config/admin-resources';

export interface DataTableProps {
    resourceKey: string;
    columns: AdminColumn[];
    rows: Record<string, unknown>[];
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    statusOptions?: string[];
    canUpdate: boolean;
    canDelete: boolean;
    publicPathTemplate?: string;
}

function readPath(row: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
        if (value && typeof value === 'object') return (value as Record<string, unknown>)[key];
        return undefined;
    }, row);
}

function renderCell(column: AdminColumn, row: Record<string, unknown>) {
    const value = readPath(row, column.name);
    if (value === undefined || value === null || value === '') return <span className="text-ink-soft">—</span>;

    switch (column.type) {
        case 'badge':
            return Array.isArray(value) ? (
                <span className="flex flex-wrap gap-1">
                    {value.slice(0, 2).map((item) => (
                        <Badge key={String(item)} tone="neutral">
                            {String(item).replace(/_/g, ' ')}
                        </Badge>
                    ))}
                </span>
            ) : (
                <Badge
                    tone={
                        value === 'published' || value === 'active' || value === 'approved'
                            ? 'green'
                            : value === 'draft' || value === 'pending' || value === 'requested'
                                ? 'amber'
                                : value === 'archived' || value === 'rejected' || value === 'cancelled'
                                    ? 'red'
                                    : 'neutral'
                    }
                >
                    {String(value).replace(/_/g, ' ')}
                </Badge>
            );
        case 'currency':
            return <span className="font-semibold">{formatCompactINR(Number(value))}</span>;
        case 'date':
            return <span className="text-ink-soft">{formatDate(value as string)}</span>;
        case 'boolean':
            return value ? <Badge tone="green">Yes</Badge> : <Badge tone="neutral">No</Badge>;
        case 'number':
            return <span className="font-semibold">{Number(value).toLocaleString('en-IN')}</span>;
        default:
            return <span className="truncate">{String(value)}</span>;
    }
}

/** Admin data table: sortable columns, search, bulk status and row actions. */
export function DataTable({
    resourceKey,
    columns,
    rows,
    page,
    totalPages,
    total,
    pageSize,
    statusOptions = [],
    canUpdate,
    canDelete,
}: DataTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [term, setTerm] = useState(searchParams?.get('q') ?? '');
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(
        () => [
            {
                id: 'select',
                header: () => <span className="sr-only">Select</span>,
                cell: ({ row }) => {
                    const id = String(row.original._id);
                    return (
                        <input
                            type="checkbox"
                            aria-label="Select row"
                            checked={Boolean(selected[id])}
                            onChange={(e) => setSelected((prev) => ({ ...prev, [id]: e.target.checked }))}
                            className="h-3.5 w-3.5 accent-orange"
                        />
                    );
                },
            },
            ...columns.map<ColumnDef<Record<string, unknown>>>((column) => ({
                id: column.name,
                accessorFn: (row) => readPath(row, column.name),
                header: column.label,
                cell: ({ row }) => renderCell(column, row.original),
            })),
            {
                id: 'actions',
                header: () => <span className="sr-only">Actions</span>,
                cell: ({ row }) => {
                    const id = String(row.original._id);
                    return (
                        <span className="flex items-center justify-end gap-1.5">
                            {canUpdate ? (
                                <Link
                                    href={`/admin/${resourceKey}/${id}`}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-line text-ink-soft hover:border-navy-200 hover:text-navy-700"
                                    aria-label="Edit"
                                >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                                </Link>
                            ) : null}
                            {canDelete ? (
                                <button
                                    type="button"
                                    aria-label="Delete"
                                    onClick={() => {
                                        if (!window.confirm('Delete this record? Soft-deletable records can be restored.')) return;
                                        startTransition(async () => {
                                            const result = await deleteResourceAction(resourceKey, id);
                                            setNotice(result.ok ? (result.message ?? 'Deleted.') : result.error);
                                            router.refresh();
                                        });
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-line text-ink-soft hover:border-red-alert/40 hover:text-red-alert"
                                >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                </button>
                            ) : null}
                        </span>
                    );
                },
            },
        ],
        [columns, resourceKey, selected, canUpdate, canDelete, router],
    );

    const table = useReactTable({
        data: rows,
        columns: tableColumns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const selectedIds = Object.entries(selected)
        .filter(([, value]) => value)
        .map(([id]) => id);

    const submitSearch = (event: React.FormEvent) => {
        event.preventDefault();
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        if (term) params.set('q', term);
        else params.delete('q');
        params.delete('page');
        startTransition(() => router.push(`/admin/${resourceKey}?${params.toString()}`));
    };

    const applyStatusFilter = (status: string) => {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        if (status) params.set('status', status);
        else params.delete('status');
        params.delete('page');
        startTransition(() => router.push(`/admin/${resourceKey}?${params.toString()}`));
    };

    const applyBulkStatus = (status: string) => {
        startTransition(async () => {
            const result = await bulkStatusAction(resourceKey, { ids: selectedIds, status });
            setNotice(result.ok ? (result.message ?? 'Updated.') : result.error);
            setSelected({});
            router.refresh();
        });
    };

    return (
        <div className="rounded-panel border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
                <form onSubmit={submitSearch} className="relative min-w-[220px] flex-1">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft"
                        aria-hidden
                    />
                    <input
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="Search…"
                        aria-label="Search records"
                        className="h-9 w-full rounded-[9px] border border-line bg-page pl-9 pr-3 text-[12.5px] outline-none focus:border-navy-300"
                    />
                </form>

                {statusOptions.length > 0 ? (
                    <select
                        aria-label="Filter by status"
                        defaultValue={searchParams?.get('status') ?? ''}
                        onChange={(e) => applyStatusFilter(e.target.value)}
                        className="h-9 rounded-[9px] border border-line bg-white px-2.5 text-[12.5px] outline-none focus:border-navy-300"
                    >
                        <option value="">All statuses</option>
                        {statusOptions.map((status) => (
                            <option key={status} value={status}>
                                {status.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                ) : null}

                {selectedIds.length > 0 && statusOptions.length > 0 && canUpdate ? (
                    <span className="flex items-center gap-2">
                        <span className="text-[11.5px] font-semibold text-ink-soft">{selectedIds.length} selected</span>
                        <select
                            aria-label="Bulk set status"
                            defaultValue=""
                            onChange={(e) => e.target.value && applyBulkStatus(e.target.value)}
                            className="h-9 rounded-[9px] border border-orange-200 bg-orange-50 px-2.5 text-[12px] font-semibold text-orange-700"
                        >
                            <option value="">Set status…</option>
                            {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                    {status.replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>
                    </span>
                ) : null}

                {pending ? <Loader2 className="h-4 w-4 animate-spin text-ink-soft" aria-hidden /> : null}
            </div>

            {notice ? (
                <p role="status" className="border-b border-line bg-green-50 px-3 py-2 text-[12px] font-semibold text-green">
                    {notice}
                </p>
            ) : null}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-line">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="whitespace-nowrap px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft"
                                    >
                                        {header.column.getCanSort() && header.id !== 'select' && header.id !== 'actions' ? (
                                            <button
                                                type="button"
                                                onClick={header.column.getToggleSortingHandler()}
                                                className="inline-flex items-center gap-1 hover:text-navy-700"
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <ArrowUpDown className="h-3 w-3" aria-hidden />
                                            </button>
                                        ) : (
                                            flexRender(header.column.columnDef.header, header.getContext())
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={tableColumns.length} className="px-3 py-10 text-center text-[13px] text-ink-soft">
                                    No records found.
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className="border-b border-line/70 last:border-0 hover:bg-muted/40">
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="max-w-[280px] px-3 py-2.5">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-line p-3">
                <Pagination
                    basePath={`/admin/${resourceKey}`}
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
