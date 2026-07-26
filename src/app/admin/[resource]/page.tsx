import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { DataTable } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/primitives';
import { getAdminResource } from '@/config/admin-resources';
import { countByStatus, listResourceDocs } from '@/services/admin/crud.service';
import { requirePermissionPage } from '@/lib/auth/session';
import { can } from '@/lib/auth/rbac';
import { CONTENT_STATUS, ENTITY_STATUS, LEAD_STATUSES, MODERATION_STATUSES } from '@/config/constants';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ resource: string }>;
}): Promise<Metadata> {
    const { resource } = await params;
    const config = getAdminResource(resource);
    return { title: config?.label ?? 'Admin' };
}

function statusOptionsFor(model: string): string[] {
    if (model === 'Lead') return [...LEAD_STATUSES];
    if (model === 'Review') return [...MODERATION_STATUSES];
    if (
        ['College', 'Course', 'Exam', 'Article', 'NewsPost', 'Resource', 'Scholarship', 'LoanProvider', 'Predictor'].includes(
            model,
        )
    ) {
        return [...CONTENT_STATUS];
    }
    if (['CounsellingBooking', 'ContactSubmission', 'User'].includes(model)) return [];
    return [...ENTITY_STATUS];
}

export default async function AdminResourceListPage({
    params,
    searchParams,
}: {
    params: Promise<{ resource: string }>;
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const [{ resource: resourceKey }, query] = await Promise.all([params, searchParams]);
    const resource = getAdminResource(resourceKey);
    if (!resource) notFound();

    const actor = await requirePermissionPage(resource.permissions.read);

    const [result, statusCounts] = await Promise.all([
        listResourceDocs(resource, {
            q: query.q,
            status: query.status,
            page: Number(query.page) || 1,
            pageSize: 20,
            sort: query.sort,
            order: query.order === 'asc' ? 'asc' : 'desc',
        }),
        countByStatus(resource).catch(() => ({})),
    ]);

    const statusOptions = statusOptionsFor(resource.model);
    const canCreate = can(actor, resource.permissions.create);

    return (
        <>
            <AdminPageHeader
                title={resource.label}
                description={resource.description}
                icon={resource.icon}
                breadcrumbs={[{ label: resource.label }]}
                actions={
                    canCreate ? (
                        <Link
                            href={`/admin/${resource.key}/new`}
                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-orange px-4 text-[13px] font-bold text-white hover:bg-orange-600"
                        >
                            New {resource.labelSingular.toLowerCase()}
                        </Link>
                    ) : undefined
                }
            />

            {Object.keys(statusCounts).length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                    <Link href={`/admin/${resource.key}`}>
                        <Badge tone={!query.status ? 'solidNavy' : 'neutral'} size="lg">
                            All {result.total}
                        </Badge>
                    </Link>
                    {Object.entries(statusCounts).map(([status, count]) => (
                        <Link key={status} href={`/admin/${resource.key}?status=${status}`}>
                            <Badge tone={query.status === status ? 'solidNavy' : 'neutral'} size="lg">
                                {status.replace(/_/g, ' ')} {count}
                            </Badge>
                        </Link>
                    ))}
                </div>
            ) : null}

            <DataTable
                resourceKey={resource.key}
                columns={resource.columns}
                rows={result.items}
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                pageSize={result.pageSize}
                statusOptions={statusOptions}
                canUpdate={can(actor, resource.permissions.update)}
                canDelete={can(actor, resource.permissions.delete)}
            />
        </>
    );
}
