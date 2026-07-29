import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { LeadBoard, type BoardLead } from '@/components/admin/lead-board';
import { LeadTable } from '@/components/admin/lead-table';
import { LeadToolbar } from '@/components/admin/lead-toolbar';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import {
    getLeadAnalytics,
    getLeadBoardData,
    getLeadTableData,
} from '@/services/admin/lead-admin.service';
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONES } from '@/config/lead-board';
import { requirePermissionPage } from '@/lib/auth/session';
import { can } from '@/lib/auth/rbac';
import type { LeadQuery } from '@/db/repositories/lead.repository';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Leads' };

interface LeadSearchParams extends Record<string, string | undefined> {
    view?: string;
    q?: string;
    status?: string;
    priority?: string;
    source?: string;
    assignedTo?: string;
    from?: string;
    to?: string;
    page?: string;
}

export default async function AdminLeadsPage({
    searchParams,
}: {
    searchParams: Promise<LeadSearchParams>;
}) {
    const [actor, params] = await Promise.all([requirePermissionPage('lead.read'), searchParams]);

    const view = params.view === 'table' ? 'table' : 'board';
    const query: LeadQuery = {
        q: params.q,
        status: params.status,
        priority: params.priority,
        source: params.source,
        assignedTo: params.assignedTo,
        from: params.from,
        to: params.to,
        page: Number(params.page) || 1,
        pageSize: 25,
    };

    const canUpdate = can(actor, 'lead.update');
    const canAssign = can(actor, 'lead.assign');
    const canExport = can(actor, 'lead.export');
    const canCreate = can(actor, 'lead.create');

    const [analytics, board, table] = await Promise.all([
        getLeadAnalytics(),
        view === 'board' ? getLeadBoardData(query) : null,
        view === 'table' ? getLeadTableData(query) : null,
    ]);

    const counsellors = board?.counsellors ?? table?.counsellors ?? [];

    return (
        <>
            <AdminPageHeader
                title="Leads"
                description="Every enquiry captured across the platform, from first touch to conversion."
                icon="Users"
                breadcrumbs={[{ label: 'Leads' }]}
                actions={
                    canCreate ? (
                        <Link
                            href="/admin/leads/new"
                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                        >
                            New lead
                        </Link>
                    ) : undefined
                }
            />

            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Total leads', value: analytics.total.toLocaleString('en-IN'), tone: 'navy' as const },
                    { label: 'New', value: (analytics.statusCounts.new ?? 0).toLocaleString('en-IN'), tone: 'blue' as const },
                    {
                        label: 'Converted',
                        value: analytics.converted.toLocaleString('en-IN'),
                        tone: 'green' as const,
                    },
                    { label: 'Conversion rate', value: `${analytics.conversionRate}%`, tone: 'orange' as const },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-panel border border-line bg-white p-3.5 shadow-card">
                        <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">{stat.label}</p>
                        <p className="mt-1 text-[22px] font-extrabold leading-none text-ink">{stat.value}</p>
                        <Badge tone={stat.tone} className="mt-2">
                            last 30 days tracked
                        </Badge>
                    </div>
                ))}
            </div>

            <LeadToolbar view={view} counsellors={counsellors} canExport={canExport} />

            {view === 'board' && board ? (
                <LeadBoard
                    columns={board.columns.map((column) => ({
                        status: column.status,
                        total: column.total,
                        items: column.items as unknown as BoardLead[],
                    }))}
                    counsellors={board.counsellors}
                    canUpdate={canUpdate}
                    canAssign={canAssign}
                />
            ) : null}

            {view === 'table' && table ? (
                <LeadTable
                    rows={table.result.items as unknown as BoardLead[]}
                    page={table.result.page}
                    totalPages={table.result.totalPages}
                    total={table.result.total}
                    pageSize={table.result.pageSize}
                    counsellors={table.counsellors}
                    canUpdate={canUpdate}
                    canAssign={canAssign}
                />
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <SectionCard title="Pipeline funnel" icon="BarChart3">
                    <ul className="space-y-1.5">
                        {Object.entries(LEAD_STATUS_LABELS).map(([status, label]) => {
                            const count = analytics.statusCounts[status] ?? 0;
                            const width = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                            return (
                                <li key={status}>
                                    <div className="flex items-center justify-between gap-2 text-[11.5px]">
                                        <span className="text-ink-soft">{label}</span>
                                        <span className="font-bold text-ink">{count}</span>
                                    </div>
                                    <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-muted">
                                        <div
                                            className="h-full rounded-pill bg-navy-600"
                                            style={{ width: `${width}%` }}
                                            aria-hidden
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </SectionCard>

                <SectionCard title="Lead sources (30 days)" icon="Share2">
                    {analytics.sources.length === 0 ? (
                        <p className="text-[12.5px] text-ink-soft">No leads in the last 30 days.</p>
                    ) : (
                        <ul className="divide-y divide-line text-[12.5px]">
                            {analytics.sources.slice(0, 10).map((row) => (
                                <li key={row.source} className="flex items-center justify-between gap-2 py-1.5">
                                    <span className="truncate text-ink-soft">{row.source.replace(/_/g, ' ')}</span>
                                    <span className="font-bold text-navy-700">{row.count}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard title="Counsellor load & conversion" icon="UserCheck">
                    {analytics.counsellors.length === 0 ? (
                        <p className="text-[12.5px] text-ink-soft">No leads assigned yet.</p>
                    ) : (
                        <ul className="divide-y divide-line text-[12.5px]">
                            {analytics.counsellors.map((row) => (
                                <li key={row.counsellorName} className="flex items-center justify-between gap-2 py-1.5">
                                    <span className="truncate text-ink-soft">{row.counsellorName}</span>
                                    <span className="flex items-center gap-1.5">
                                        <Badge tone="neutral">{row.total}</Badge>
                                        <Badge tone={LEAD_STATUS_TONES.converted}>{row.converted}</Badge>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
            </div>
        </>
    );
}
