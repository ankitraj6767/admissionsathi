import 'server-only';
import type { FilterQuery } from 'mongoose';
import { connectToDatabase } from '@/db/connect';
import { Permission, Role, type PermissionDoc, type RoleDoc } from '@/db/models/role.model';
import { findLean, findOneLean } from './base.repository';

export async function listRoles(limit = 60): Promise<RoleDoc[]> {
    return findLean<RoleDoc>(Role, {}, { sort: { isStaff: -1, name: 1 }, limit });
}

export async function findRoleByKey(key: string): Promise<RoleDoc | null> {
    return findOneLean<RoleDoc>(Role, { key });
}

export async function findRolesByKeys(keys: string[]): Promise<RoleDoc[]> {
    if (keys.length === 0) return [];
    return findLean<RoleDoc>(Role, { key: { $in: keys } } as FilterQuery<RoleDoc>, { limit: 60 });
}

export async function listPermissions(limit = 300): Promise<PermissionDoc[]> {
    return findLean<PermissionDoc>(Permission, {}, { sort: { group: 1, key: 1 }, limit });
}

/**
 * Replaces a role's permission list.
 *
 * `super_admin` is refused at the data layer, not just in the UI: it must always
 * keep the full permission set or the platform can be locked out. Guarding on
 * `isSystem` instead is not an option because every seeded role is a system
 * role, which would make the whole matrix read-only. Returns `false` when
 * nothing matched.
 */
export async function setRolePermissions(
    key: string,
    permissions: string[],
    actorId?: string,
): Promise<boolean> {
    if (key === 'super_admin') return false;

    await connectToDatabase();
    const result = await Role.updateOne(
        { key },
        { $set: { permissions, updatedBy: actorId } },
    ).exec();
    return result.matchedCount > 0;
}

export async function upsertRole(key: string, values: Record<string, unknown>): Promise<void> {
    await connectToDatabase();
    await Role.updateOne({ key }, { $set: values, $setOnInsert: { key } }, { upsert: true }).exec();
}
