'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { connectToDatabase } from '@/db/connect';
import { Role } from '@/db/models/role.model';
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

        await connectToDatabase();
        const role = await Role.findOne({ key: data.roleKey }).exec();
        if (!role) throw new NotFoundError('Role not found.');

        const previous = [...role.permissions];
        role.permissions = data.permissions;
        role.updatedBy = actor.id as never;
        await role.save();

        await recordAudit({
            actor,
            action: 'role.update_permissions',
            entity: 'Role',
            entityId: String(role._id),
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
