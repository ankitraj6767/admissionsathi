import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { ResourceFormLoader } from '@/components/admin/resource-form-loader';
import { Badge } from '@/components/ui/primitives';
import { getAdminResource } from '@/config/admin-resources';
import { getResourceDoc } from '@/services/admin/crud.service';
import { requirePermissionPage } from '@/lib/auth/session';
import { can } from '@/lib/auth/rbac';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ resource: string; id: string }>;
}): Promise<Metadata> {
    const { resource } = await params;
    const config = getAdminResource(resource);
    return { title: `Edit ${config?.labelSingular ?? 'record'}` };
}

export default async function AdminResourceEditPage({
    params,
}: {
    params: Promise<{ resource: string; id: string }>;
}) {
    const { resource: resourceKey, id } = await params;
    const resource = getAdminResource(resourceKey);
    if (!resource) notFound();

    const actor = await requirePermissionPage(resource.permissions.read);
    const doc = await getResourceDoc(resource, id);
    if (!doc) notFound();

    const title = String(doc[resource.titleField] ?? id);
    const publicUrl = resource.publicPath ? resource.publicPath(doc) : undefined;

    return (
        <>
            <AdminPageHeader
                title={title}
                description={`${resource.labelSingular} • last updated ${formatDate(doc.updatedAt as string, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                })}`}
                icon={resource.icon}
                breadcrumbs={[{ label: resource.label, href: `/admin/${resource.key}` }, { label: title }]}
                actions={
                    <>
                        {doc.status ? <Badge tone="navy" size="lg">{String(doc.status).replace(/_/g, ' ')}</Badge> : null}
                        {doc.isDeleted ? <Badge tone="red" size="lg">Archived</Badge> : null}
                    </>
                }
            />

            <ResourceFormLoader
                resource={resource}
                mode="edit"
                docId={id}
                initialValues={doc}
                publicUrl={publicUrl}
                canDelete={can(actor, resource.permissions.delete)}
            />
        </>
    );
}
