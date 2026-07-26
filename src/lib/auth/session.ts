import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from './index';
import {
    AuthenticationError,
    AuthorizationError,
    can,
    canAny,
    isStaff,
    type SessionActor,
} from './rbac';
import type { Permission } from '@/config/permissions';

/**
 * Current actor for the request, memoised per render pass.
 * Returns `null` for anonymous visitors.
 */
export const getCurrentActor = cache(async (): Promise<SessionActor | null> => {
    const session = await auth();
    if (!session?.user?.id) return null;

    return {
        id: session.user.id,
        name: session.user.name ?? 'User',
        email: session.user.email ?? '',
        image: session.user.image ?? null,
        roles: session.user.roles ?? ['student'],
        permissions: session.user.permissions ?? [],
    };
});

/** Throws when unauthenticated. Use inside Server Actions. */
export async function requireActor(): Promise<SessionActor> {
    const actor = await getCurrentActor();
    if (!actor) throw new AuthenticationError();
    return actor;
}

/** Throws when the actor lacks the permission. Server-side enforcement. */
export async function requirePermission(permission: Permission): Promise<SessionActor> {
    const actor = await requireActor();
    if (!can(actor, permission)) {
        throw new AuthorizationError(`Missing permission: ${permission}`);
    }
    return actor;
}

export async function requireAnyPermission(permissions: Permission[]): Promise<SessionActor> {
    const actor = await requireActor();
    if (!canAny(actor, permissions)) {
        throw new AuthorizationError(`Missing one of: ${permissions.join(', ')}`);
    }
    return actor;
}

/** Redirect-based guards for pages (layouts / Server Components). */
export async function requireAuthPage(redirectTo = '/login'): Promise<SessionActor> {
    const actor = await getCurrentActor();
    if (!actor) redirect(`${redirectTo}?callbackUrl=/dashboard`);
    return actor;
}

export async function requireStaffPage(): Promise<SessionActor> {
    const actor = await getCurrentActor();
    if (!actor) redirect('/login?callbackUrl=/admin');
    if (!isStaff(actor)) redirect('/403');
    return actor;
}

export async function requirePermissionPage(permission: Permission): Promise<SessionActor> {
    const actor = await requireStaffPage();
    if (!can(actor, permission)) redirect('/403');
    return actor;
}
