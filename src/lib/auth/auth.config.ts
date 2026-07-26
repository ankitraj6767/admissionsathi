import type { NextAuthConfig } from 'next-auth';

/**
 * Copies any array-like into a plain `string[]`.
 * Guarantees the result is structured-cloneable, which the JWT encoder requires.
 */
function toStringArray(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) return [...fallback];
    return Array.from(value, (item) => String(item));
}

/**
 * Edge-safe Auth.js configuration.
 * Contains no database or Node-only code so it can be used by middleware.
 * The full configuration (providers that touch MongoDB) lives in `./index.ts`.
 */
export const authConfig = {
    pages: {
        signIn: '/login',
        newUser: '/account',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
    },
    trustHost: true,
    providers: [],
    callbacks: {
        /**
         * Coarse route protection. Fine-grained permission checks always run again
         * inside Server Actions / services — never rely on this alone.
         */
        authorized({ auth, request }) {
            const { pathname } = request.nextUrl;
            const isLoggedIn = Boolean(auth?.user);
            const roles = (auth?.user as { roles?: string[] } | undefined)?.roles ?? [];
            const isStaff = roles.some((r) => r !== 'student');

            if (pathname.startsWith('/admin')) return isLoggedIn && isStaff;
            if (pathname.startsWith('/dashboard')) return isLoggedIn;
            return true;
        },
        /**
         * Last stop before the payload is encrypted.
         *
         * `jose` runs `structuredClone()` over the token, which throws
         * `DataCloneError` on a proxied value — exactly what Mongoose 8 returns
         * for a document array. Normalising here means no provider, adapter or
         * callback upstream can break sign-in by handing us a value the JWT
         * encoder cannot clone.
         */
        jwt({ token, user }) {
            if (user) {
                const u = user as unknown as {
                    id?: string;
                    roles?: string[];
                    permissions?: string[];
                    image?: string | null;
                };
                token.uid = u.id ? String(u.id) : token.uid;
                token.roles = toStringArray(u.roles, ['student']);
                token.permissions = toStringArray(u.permissions, []);
                token.picture = u.image ? String(u.image) : token.picture;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = (token.uid as string) ?? token.sub ?? '';
                session.user.roles = toStringArray(token.roles, ['student']);
                session.user.permissions = toStringArray(token.permissions, []);
            }
            return session;
        },
    },
} satisfies NextAuthConfig;
