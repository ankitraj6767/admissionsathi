'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getRoleByKey, updateRolePermissions } from '@/services/role.service';
import { PERMISSIONS, ROLES } from '@/config/permissions';
import { requirePermission } from '@/lib/auth/session';
import { recordAudit } from '@/services/audit.service';
import { NotFoundError, fail, runAction, succeed } from '@/lib/action-helpers';
import type { ActionResult } from '@/types/common';

const schema = z.object({
    roleKey: z.enum(ROLES),
    permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length),
});

/**
 * Updates the permission set for a role.
 * Super admin always keeps every permission so the platform can never be locked out.
 */
export async function updateRolePermissionsAction(
    input: unknown,
): Promise<ActionResult<{ roleKey: string; count: number }>> {
    return runAction({ action: 'admin.roles.update' }, async () => {
        const actor = await requirePermission('roles.manage');
        const data = schema.parse(input);

        if (data.roleKey === 'super_admin') {
            return fail('The Super Admin role always holds every permission and cannot be reduced.', 'CONFLICT');
        }

        const role = await getRoleByKey(data.roleKey);
        if (!role) throw new NotFoundError('Role not found.');

        const previous = role.permissions;

        // The data layer refuses the immutable super admin row; anything else that
        // fails to match here disappeared between the read and the write.
        const result = await updateRolePermissions(data.roleKey, data.permissions, actor.id);
        if (!result.ok) throw new NotFoundError('Role not found.');

        await recordAudit({
            actor,
            action: 'role.update_permissions',
            entity: 'Role',
            entityId: role.id,
            entityLabel: role.name,
            previousValues: { permissions: previous },
            newValues: { permissions: data.permissions },
        });

        revalidatePath('/admin/roles');

        return succeed(
            { roleKey: data.roleKey, count: data.permissions.length },
            `${role.name} now has ${data.permissions.length} permission(s). Users must sign in again for changes to take effect in their session.`,
        );
    });
}
