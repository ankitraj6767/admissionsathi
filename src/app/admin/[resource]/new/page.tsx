import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { ResourceFormLoader } from '@/components/admin/resource-form-loader';
import { getAdminResource } from '@/config/admin-resources';
import { requirePermissionPage } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ resource: string }>;
}): Promise<Metadata> {
    const { resource } = await params;
    const config = getAdminResource(resource);
    return { title: `New ${config?.labelSingular ?? 'record'}` };
}

export default async function AdminResourceCreatePage({
    params,
}: {
    params: Promise<{ resource: string }>;
}) {
    const { resource: resourceKey } = await params;
    const resource = getAdminResource(resourceKey);
    if (!resource) notFound();

    await requirePermissionPage(resource.permissions.create);

    return (
        <>
            <AdminPageHeader
                title={`New ${resource.labelSingular.toLowerCase()}`}
                description={`Create a new ${resource.labelSingular.toLowerCase()}. Required fields are marked with an asterisk.`}
                icon={resource.icon}
                breadcrumbs={[
                    { label: resource.label, href: `/admin/${resource.key}` },
                    { label: `New ${resource.labelSingular.toLowerCase()}` },
                ]}
            />

            <ResourceFormLoader resource={resource} mode="create" initialValues={{}} canDelete={false} />
        </>
    );
}
