import { describe, expect, it } from 'vitest';
import { authConfig } from '@/lib/auth/auth.config';
import type { JWT } from 'next-auth/jwt';

/**
 * Regression guard for the sign-in outage caused by `DataCloneError`.
 *
 * Auth.js encodes the JWT with `jose`, which runs `structuredClone()` over the
 * payload. Mongoose 8 returns document arrays wrapped in a `Proxy`, and
 * `structuredClone()` refuses to clone a proxy — so returning `user.roles`
 * straight from a hydrated document made every credentials sign-in fail with a
 * `CallbackRouteError`.
 *
 * These tests assert the failure mode is real and that the `jwt` / `session`
 * callbacks neutralise it.
 */

/** Stands in for a Mongoose document array: a transparent proxy over an array. */
function mongooseLikeArray<T>(items: T[]): T[] {
    return new Proxy(items, {});
}

const jwtCallback = authConfig.callbacks.jwt;
const sessionCallback = authConfig.callbacks.session;

type JwtArgs = Parameters<typeof jwtCallback>[0];
type SessionArgs = Parameters<typeof sessionCallback>[0];

function runJwt(user: unknown, token: JWT = {}): JWT {
    return jwtCallback({ token, user } as unknown as JwtArgs) as JWT;
}

describe('structuredClone hazard', () => {
    it('a proxied array is not structured-cloneable', () => {
        // If this ever stops throwing, the guard below is no longer load-bearing.
        expect(() => structuredClone(mongooseLikeArray(['super_admin']))).toThrow(
            /could not be cloned/i,
        );
    });

    it('a copied array is structured-cloneable', () => {
        expect(() => structuredClone([...mongooseLikeArray(['super_admin'])])).not.toThrow();
    });
});

describe('jwt callback', () => {
    it('produces a token the JWT encoder can clone, even from proxied arrays', () => {
        const token = runJwt({
            id: '6a647bb04a9a6303e5d22078',
            roles: mongooseLikeArray(['super_admin']),
            permissions: mongooseLikeArray(['college.read', 'users.manage']),
            image: null,
        });

        expect(() => structuredClone(token)).not.toThrow();
        expect(token.roles).toEqual(['super_admin']);
        expect(token.permissions).toEqual(['college.read', 'users.manage']);
    });

    it('copies rather than references the incoming arrays', () => {
        const roles = mongooseLikeArray(['super_admin']);
        const token = runJwt({ id: 'u1', roles });

        expect(token.roles).not.toBe(roles);
        expect(Array.isArray(token.roles)).toBe(true);
    });

    it('carries the user id and image across', () => {
        const token = runJwt({ id: 'u1', roles: ['student'], image: 'https://cdn/x.png' });

        expect(token.uid).toBe('u1');
        expect(token.picture).toBe('https://cdn/x.png');
    });

    it('defaults to the student role when none is supplied', () => {
        const token = runJwt({ id: 'u1' });

        expect(token.roles).toEqual(['student']);
        expect(token.permissions).toEqual([]);
    });

    it('coerces non-string members to strings', () => {
        const token = runJwt({ id: 'u1', roles: [1, 'student'] as unknown as string[] });

        expect(token.roles).toEqual(['1', 'student']);
    });

    it('survives a malformed roles value instead of throwing', () => {
        const token = runJwt({ id: 'u1', roles: 'super_admin' as unknown as string[] });

        expect(token.roles).toEqual(['student']);
        expect(() => structuredClone(token)).not.toThrow();
    });

    it('leaves an existing token untouched when no user is present', () => {
        const existing: JWT = { uid: 'u1', roles: ['super_admin'], permissions: ['college.read'] };
        const token = jwtCallback({ token: existing } as unknown as JwtArgs) as JWT;

        expect(token.uid).toBe('u1');
        expect(token.roles).toEqual(['super_admin']);
    });
});

describe('session callback', () => {
    it('exposes plain, cloneable arrays on the session', () => {
        const session = sessionCallback({
            session: { user: { id: '', email: 'a@b.co', name: 'A', roles: [], permissions: [] } },
            token: {
                uid: 'u1',
                roles: mongooseLikeArray(['content_manager']),
                permissions: mongooseLikeArray(['article.publish']),
            },
        } as unknown as SessionArgs) as { user: { id: string; roles: string[]; permissions: string[] } };

        expect(() => structuredClone(session)).not.toThrow();
        expect(session.user.id).toBe('u1');
        expect(session.user.roles).toEqual(['content_manager']);
        expect(session.user.permissions).toEqual(['article.publish']);
    });

    it('falls back to the student role when the token has none', () => {
        const session = sessionCallback({
            session: { user: { id: '', email: 'a@b.co', name: 'A', roles: [], permissions: [] } },
            token: { sub: 'fallback-id' },
        } as unknown as SessionArgs) as { user: { id: string; roles: string[] } };

        expect(session.user.id).toBe('fallback-id');
        expect(session.user.roles).toEqual(['student']);
    });
});
