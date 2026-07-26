import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Pagination } from '@/components/shared/pagination';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { connectToDatabase } from '@/db/connect';
import { AuditLog } from '@/db/models/system.model';
import { paginate, toPlain } from '@/db/repositories/base.repository';
import { requirePermissionPage } from '@/lib/auth/session';
import { escapeRegex, formatDate } from '@/lib/utils';
import type { AuditLogDoc } from '@/db/models/system.model';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Audit logs' };

export default async function AdminAuditLogsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; entity?: string; outcome?: string; page?: string }>;
}) {
    await requirePermissionPage('audit.view');
    const params = await searchParams;
    await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (params.q) {
        const rx = new RegExp(escapeRegex(params.q), 'i');
        filter.$or = [{ action: rx }, { entityLabel: rx }, { actorName: rx }];
    }
    if (params.entity) filter.entity = params.entity;
    if (params.outcome) filter.outcome = params.outcome;

    const [result, entities] = await Promise.all([
        paginate<AuditLogDoc>(AuditLog, {
            filter,
            page: Number(params.page) || 1,
            pageSize: 30,
            sort: { createdAt: -1 },
        }).then(toPlain),
        AuditLog.distinct('entity').exec().then((rows) => (rows as string[]).sort()),
    ]);

    return (
        <>
            <AdminPageHeader
                title="Audit logs"
                description="Every admin mutation with actor, entity, before/after values, hashed IP, user agent and request id. Passwords, tokens and secrets are never stored here."
                icon="Eye"
                breadcrumbs={[{ label: 'Audit logs' }]}
            />

            <form className="mb-3 flex flex-wrap gap-2 rounded-panel border border-line bg-white p-3 shadow-card">
                <label className="sr-only" htmlFor="audit-q">
                    Search audit logs
                </label>
                <input
                    id="audit-q"
                    name="q"
                    defaultValue={params.q}
                    placeholder="Search action, entity or actor…"
                    className="h-9 min-w-[220px] flex-1 rounded-[9px] border border-line bg-page px-3 text-[12.5px] outline-none focus:border-navy-300"
                />
                <select
                    name="entity"
                    defaultValue={params.entity ?? ''}
                    aria-label="Filter by entity"
                    className="h-9 rounded-[9px] border border-line bg-white px-2.5 text-[12.5px]"
                >
                    <option value="">All entities</option>
                    {entities.map((entity) => (
                        <option key={entity} value={entity}>
                            {entity}
                        </option>
                    ))}
                </select>
                <select
                    name="outcome"
                    defaultValue={params.outcome ?? ''}
                    aria-label="Filter by outcome"
                    className="h-9 rounded-[9px] border border-line bg-white px-2.5 text-[12.5px]"
                >
                    <option value="">All outcomes</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                    <option value="denied">Denied</option>
                </select>
                <button
                    type="submit"
                    className="inline-flex h-9 items-center rounded-[9px] bg-navy px-4 text-[12.5px] font-bold text-white"
                >
                    Filter
                </button>
            </form>

            <div className="rounded-panel border border-line bg-white shadow-card">
                {result.items.length === 0 ? (
                    <div className="p-4">
                        <EmptyState icon="Eye" title="No audit entries match this filter" />
                    </div>
                ) : (
                    <ul className="divide-y divide-line">
                        {result.items.map((log) => (
                            <li key={String(log._id)} className="p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                        tone={log.outcome === 'success' ? 'green' : log.outcome === 'denied' ? 'amber' : 'red'}
                                    >
                                        {log.outcome}
                                    </Badge>
                                    <span className="font-mono text-[11.5px] font-bold text-navy-700">{log.action}</span>
                                    <span className="text-[12px] text-ink">{log.entity}</span>
                                    {log.entityLabel ? (
                                        <span className="truncate text-[12px] text-ink-soft">— {log.entityLabel}</span>
                                    ) : null}
                                    <span className="ml-auto text-[11px] text-ink-soft">
                                        {log.actorName ?? 'System'} • {formatDate(log.createdAt, {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>

                                {log.previousValues || log.newValues ? (
                                    <details className="mt-1.5">
                                        <summary className="cursor-pointer text-[11px] font-semibold text-ink-soft">
                                            View change payload
                                        </summary>
                                        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                                            {log.previousValues ? (
                                                <pre className="overflow-x-auto rounded-[8px] bg-red-50 p-2 text-[10.5px] text-ink">
                                                    {JSON.stringify(log.previousValues, null, 2)}
                                                </pre>
                                            ) : null}
                                            {log.newValues ? (
                                                <pre className="overflow-x-auto rounded-[8px] bg-green-50 p-2 text-[10.5px] text-ink">
                                                    {JSON.stringify(log.newValues, null, 2)}
                                                </pre>
                                            ) : null}
                                        </div>
                                        <p className="mt-1 font-mono text-[10px] text-ink-soft">
                                            request {log.requestId ?? '—'} • ip hash {log.ipHash?.slice(0, 12) ?? '—'}
                                        </p>
                                    </details>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}

                <div className="border-t border-line p-3">
                    <Pagination
                        basePath="/admin/audit-logs"
                        params={params as Record<string, string | undefined>}
                        page={result.page}
                        totalPages={result.totalPages}
                        total={result.total}
                        pageSize={result.pageSize}
                    />
                </div>
            </div>
        </>
    );
}
