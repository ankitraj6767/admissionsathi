import {
    permissionsForRoles,
    isStaffRole,
    type Permission,
    type RoleKey,
} from '@/config/permissions';

export interface SessionActor {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    roles: string[];
    permissions: string[];
}

/** Effective permission set = role permissions + extras − denied. */
export function resolvePermissions(
    roles: string[],
    extraPermissions: string[] = [],
    deniedPermissions: string[] = [],
): Permission[] {
    const base = new Set<string>(permissionsForRoles(roles));
    extraPermissions.forEach((p) => base.add(p));
    deniedPermissions.forEach((p) => base.delete(p));
    return Array.from(base) as Permission[];
}

export function can(actor: Pick<SessionActor, 'permissions'> | null, permission: Permission): boolean {
    if (!actor) return false;
    return actor.permissions.includes(permission);
}

export function canAny(
    actor: Pick<SessionActor, 'permissions'> | null,
    permissions: Permission[],
): boolean {
    if (!actor) return false;
    return permissions.some((p) => actor.permissions.includes(p));
}

export function canAll(
    actor: Pick<SessionActor, 'permissions'> | null,
    permissions: Permission[],
): boolean {
    if (!actor) return false;
    return permissions.every((p) => actor.permissions.includes(p));
}

export function isStaff(actor: Pick<SessionActor, 'roles'> | null): boolean {
    if (!actor) return false;
    return actor.roles.some((r) => isStaffRole(r));
}

export function hasRole(actor: Pick<SessionActor, 'roles'> | null, role: RoleKey): boolean {
    if (!actor) return false;
    return actor.roles.includes(role);
}

/** Thrown by server-side guards; surfaced as a friendly message in the UI. */
export class AuthorizationError extends Error {
    readonly code = 'FORBIDDEN';
    constructor(message = 'You do not have permission to perform this action.') {
        super(message);
        this.name = 'AuthorizationError';
    }
}

export class AuthenticationError extends Error {
    readonly code = 'UNAUTHENTICATED';
    constructor(message = 'Please sign in to continue.') {
        super(message);
        this.name = 'AuthenticationError';
    }
}
