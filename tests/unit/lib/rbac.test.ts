import { describe, expect, it } from 'vitest';
import {
    AuthenticationError,
    AuthorizationError,
    can,
    canAll,
    canAny,
    getAuthenticatedHomePath,
    hasRole,
    isStaff,
    resolvePermissions,
    type SessionActor,
} from '@/lib/auth/rbac';
import { ROLE_PERMISSIONS, type Permission } from '@/config/permissions';

function actor(overrides: Partial<SessionActor> = {}): SessionActor {
    return {
        id: 'user_1',
        name: 'Test User',
        email: 'test@example.com',
        roles: [],
        permissions: [],
        ...overrides,
    };
}

describe('resolvePermissions', () => {
    it('expands a role into its configured permission set', () => {
        const perms = resolvePermissions(['content_editor']);
        expect(perms).toContain('article.create');
        expect(perms).toContain('media.manage');
        expect(perms).not.toContain('roles.manage');
    });

    it('unions permissions across multiple roles without duplicates', () => {
        const perms = resolvePermissions(['content_editor', 'lead_manager']);
        expect(perms).toContain('article.create');
        expect(perms).toContain('lead.assign');
        expect(new Set(perms).size).toBe(perms.length);
    });

    it('adds extra permissions', () => {
        const perms = resolvePermissions(['student'], ['lead.read']);
        expect(perms).toEqual(['lead.read']);
    });

    it('denied permissions win over both roles and extras', () => {
        const perms = resolvePermissions(['content_editor'], ['lead.read'], ['article.create', 'lead.read']);
        expect(perms).not.toContain('article.create');
        expect(perms).not.toContain('lead.read');
        expect(perms).toContain('article.read');
    });

    it('ignores unknown roles', () => {
        expect(resolvePermissions(['not_a_real_role'])).toEqual([]);
    });

    it('returns an empty set for the student role', () => {
        expect(resolvePermissions(['student'])).toEqual([]);
    });

    it('gives super_admin every permission its role map declares', () => {
        const perms = resolvePermissions(['super_admin']);
        expect(perms).toHaveLength(ROLE_PERMISSIONS.super_admin.length);
        expect(perms).toContain('roles.manage');
    });
});

describe('can', () => {
    it('is true only when the permission is present', () => {
        const staff = actor({ permissions: ['lead.read', 'lead.update'] });
        expect(can(staff, 'lead.read')).toBe(true);
        expect(can(staff, 'lead.delete')).toBe(false);
    });

    it('is false for a null actor', () => {
        expect(can(null, 'lead.read')).toBe(false);
    });

    it('is false when the actor has no permissions', () => {
        expect(can(actor(), 'lead.read')).toBe(false);
    });

    it('does not expand wildcards — permissions are matched exactly', () => {
        // Documented behaviour: matching is a plain membership test, so a stored
        // wildcard grants nothing and must never be treated as "all of lead.*".
        const wildcardActor = { permissions: ['lead.*', '*'] };
        expect(can(wildcardActor, 'lead.read')).toBe(false);
        expect(can(wildcardActor, 'lead.*' as Permission)).toBe(true);
    });
});

describe('canAny', () => {
    it('is true when at least one permission matches', () => {
        const staff = actor({ permissions: ['lead.read'] });
        expect(canAny(staff, ['lead.delete', 'lead.read'])).toBe(true);
    });

    it('is false when none match', () => {
        expect(canAny(actor({ permissions: ['lead.read'] }), ['lead.delete', 'users.manage'])).toBe(false);
    });

    it('is false for an empty permission list (nothing to satisfy)', () => {
        expect(canAny(actor({ permissions: ['lead.read'] }), [])).toBe(false);
    });

    it('is false for a null actor', () => {
        expect(canAny(null, ['lead.read'])).toBe(false);
    });
});

describe('canAll', () => {
    it('requires every permission', () => {
        const staff = actor({ permissions: ['lead.read', 'lead.update'] });
        expect(canAll(staff, ['lead.read', 'lead.update'])).toBe(true);
        expect(canAll(staff, ['lead.read', 'lead.delete'])).toBe(false);
    });

    it('is vacuously true for an empty permission list', () => {
        expect(canAll(actor(), [])).toBe(true);
    });

    it('is false for a null actor even with an empty list', () => {
        expect(canAll(null, [])).toBe(false);
    });
});

describe('isStaff', () => {
    it('is true for any non-student role', () => {
        expect(isStaff(actor({ roles: ['counsellor'] }))).toBe(true);
        expect(isStaff(actor({ roles: ['super_admin'] }))).toBe(true);
        expect(isStaff(actor({ roles: ['student', 'analyst'] }))).toBe(true);
    });

    it('is false for students, unknown roles, no roles and null actors', () => {
        expect(isStaff(actor({ roles: ['student'] }))).toBe(false);
        expect(isStaff(actor({ roles: ['ghost_role'] }))).toBe(false);
        expect(isStaff(actor({ roles: [] }))).toBe(false);
        expect(isStaff(null)).toBe(false);
    });
});

describe('getAuthenticatedHomePath', () => {
    it('routes staff roles to the admin workspace', () => {
        expect(getAuthenticatedHomePath(['super_admin'])).toBe('/admin');
        expect(getAuthenticatedHomePath(['student', 'analyst'])).toBe('/admin');
    });

    it('routes students and unknown roles to the personal dashboard', () => {
        expect(getAuthenticatedHomePath(['student'])).toBe('/dashboard');
        expect(getAuthenticatedHomePath(['unknown_role'])).toBe('/dashboard');
        expect(getAuthenticatedHomePath([])).toBe('/dashboard');
    });
});

describe('hasRole', () => {
    it('checks exact role membership', () => {
        const staff = actor({ roles: ['lead_manager', 'analyst'] });
        expect(hasRole(staff, 'lead_manager')).toBe(true);
        expect(hasRole(staff, 'admin')).toBe(false);
    });

    it('is false for a null actor', () => {
        expect(hasRole(null, 'admin')).toBe(false);
    });
});

describe('error types', () => {
    it('AuthorizationError carries a FORBIDDEN code and a default message', () => {
        const error = new AuthorizationError();
        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe('FORBIDDEN');
        expect(error.name).toBe('AuthorizationError');
        expect(error.message).toMatch(/permission/i);
    });

    it('AuthenticationError carries an UNAUTHENTICATED code and accepts a custom message', () => {
        const error = new AuthenticationError('Sign in first');
        expect(error.code).toBe('UNAUTHENTICATED');
        expect(error.name).toBe('AuthenticationError');
        expect(error.message).toBe('Sign in first');
    });
});
