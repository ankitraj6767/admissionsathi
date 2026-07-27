import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge } from '@/components/ui/primitives';
import { RolePermissionEditor } from '@/components/admin/role-permission-editor';
import { getRolesScreenData } from '@/services/role.service';
import { requirePermissionPage } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Roles & permissions' };

export default async function AdminRolesPage() {
    await requirePermissionPage('roles.manage');

    const { roles, groups } = await getRolesScreenData();

    return (
        <>
            <AdminPageHeader
                title="Roles & permissions"
                description="Granular permission matrix. Authorization is enforced server-side in every Server Action and service — this screen only decides which permissions a role carries."
                icon="Shield"
                breadcrumbs={[{ label: 'Roles & permissions' }]}
            />

            <SectionCard className="mb-4" title="Roles" icon="Users">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px]">
                        <thead>
                            <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-soft">
                                <th className="py-2 pr-3">Role</th>
                                <th className="py-2 pr-3">Key</th>
                                <th className="py-2 pr-3">Type</th>
                                <th className="py-2 pr-3">Permissions</th>
                                <th className="py-2">Users</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map((role) => (
                                <tr key={role.id} className="border-b border-line/70 last:border-0">
                                    <td className="py-2.5 pr-3 font-bold text-ink">{role.name}</td>
                                    <td className="py-2.5 pr-3 font-mono text-[11.5px] text-ink-soft">{role.key}</td>
                                    <td className="py-2.5 pr-3">
                                        {role.isStaff ? <Badge tone="navy">Staff</Badge> : <Badge tone="neutral">Public</Badge>}
                                    </td>
                                    <td className="py-2.5 pr-3 text-ink-soft">{role.permissions.length}</td>
                                    <td className="py-2.5 font-semibold text-ink">{role.userCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            <RolePermissionEditor
                roles={roles.map((role) => ({
                    id: role.id,
                    key: role.key,
                    name: role.name,
                    permissions: role.permissions,
                    isSystem: role.isSystem,
                }))}
                groups={groups}
            />
        </>
    );
}
