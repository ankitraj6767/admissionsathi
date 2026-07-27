import 'server-only';
import {
    findRoleByKey,
    listPermissions,
    listRoles,
    setRolePermissions,
} from '@/db/repositories/role.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { aggregateUserCountsByRole } from '@/db/repositories/user-stats.repository';
import { PERMISSION_GROUPS, ROLE_LABELS, type RoleKey } from '@/config/permissions';

export interface RoleRow {
    id: string;
    key: string;
    name: string;
    description?: string;
    permissions: string[];
    isSystem: boolean;
    isStaff: boolean;
    userCount: number;
}

export interface PermissionGroupView {
    label: string;
    permissions: string[];
}

export interface RolesScreenData {
    roles: RoleRow[];
    groups: PermissionGroupView[];
}

/** Roles with their permission sets and how many accounts currently hold each. */
export async function getRolesScreenData(): Promise<RolesScreenData> {
    const [roles, counts] = await Promise.all([
        listRoles().then(toPlain),
        aggregateUserCountsByRole(),
    ]);

    const countByRole = new Map(counts.map((row) => [row._id, row.count]));

    return {
        roles: roles.map((role) => ({
            id: String(role._id),
            key: role.key,
            name: ROLE_LABELS[role.key as RoleKey] ?? role.name,
            description: role.description,
            permissions: role.permissions,
            isSystem: role.isSystem,
            isStaff: role.isStaff,
            userCount: countByRole.get(role.key) ?? 0,
        })),
        groups: PERMISSION_GROUPS.map((group) => ({
            label: group.label,
            permissions: [...group.permissions],
        })),
    };
}

export interface RoleSummary {
    id: string;
    key: string;
    name: string;
    permissions: string[];
    isSystem: boolean;
}

/**
 * A single role by key.
 * The update flow needs the stored name and the current permission list so the
 * audit record can show what changed.
 */
export async function getRoleByKey(key: string): Promise<RoleSummary | null> {
    const role = await findRoleByKey(key);
    if (!role) return null;
    return {
        id: String(role._id),
        key: role.key,
        name: role.name,
        permissions: [...role.permissions],
        isSystem: role.isSystem,
    };
}

/** All permission keys registered in the database (source of truth is config). */
export async function getRegisteredPermissions(): Promise<string[]> {
    const rows = await listPermissions();
    return rows.map((row) => row.key);
}

/**
 * Replaces a role's permission list.
 * System roles are immutable so a misconfiguration cannot lock every admin out.
 */
export async function updateRolePermissions(
    key: string,
    permissions: string[],
    actorId?: string,
): Promise<{ ok: boolean }> {
    const matched = await setRolePermissions(key, permissions, actorId);
    return { ok: matched };
}
