import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';
import { authConfig } from './auth.config';
import { verifyPassword } from './password';
import { resolvePermissions } from './rbac';
import { connectToDatabase } from '@/db/connect';
import { User } from '@/db/models/user.model';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/**
 * Converts a hydrated Mongoose user into a plain, structured-cloneable object.
 *
 * This is not cosmetic. `jose` runs `structuredClone()` over the JWT payload
 * before encrypting it, and Mongoose 8 hands back document arrays wrapped in a
 * `Proxy` (for change tracking). The proxy is transparent enough that
 * `Array.isArray()`, `constructor.name` and the prototype all say "Array", but
 * `structuredClone()` refuses to clone a proxy and throws
 * `DataCloneError: [object Array] could not be cloned`.
 *
 * Passing `user.roles` straight through therefore made *every* credentials
 * sign-in fail, and Auth.js reported it as a generic `CallbackRouteError` — which
 * the login action then relabelled "Invalid email or password". Copying the
 * arrays out of the proxy and coercing the scalars keeps the payload cloneable.
 */
function toSessionUser(user: {
    _id: unknown;
    name: string;
    email: string;
    image?: string | null;
    roles: string[];
    extraPermissions?: string[];
    deniedPermissions?: string[];
}) {
    const roles = Array.from(user.roles ?? [], (role) => String(role));

    return {
        id: String(user._id),
        name: String(user.name),
        email: String(user.email),
        image: user.image ? String(user.image) : null,
        roles,
        permissions: resolvePermissions(
            roles,
            Array.from(user.extraPermissions ?? [], String),
            Array.from(user.deniedPermissions ?? [], String),
        ).map((permission) => String(permission)),
    };
}

const googleEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    secret: env.AUTH_SECRET,
    providers: [
        ...(googleEnabled
            ? [
                Google({
                    clientId: env.AUTH_GOOGLE_ID!,
                    clientSecret: env.AUTH_GOOGLE_SECRET!,
                    allowDangerousEmailAccountLinking: true,
                }),
            ]
            : []),
        Credentials({
            name: 'Email and password',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(raw) {
                const parsed = credentialsSchema.safeParse(raw);
                if (!parsed.success) return null;

                const { email, password } = parsed.data;
                await connectToDatabase();

                const user = await User.findOne({ email: email.toLowerCase() })
                    .select('+passwordHash')
                    .exec();

                if (!user || !user.passwordHash) return null;
                if (user.status !== 'active') return null;

                if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
                    logger.warn('auth.locked_account_attempt', { userId: String(user._id) });
                    return null;
                }

                const ok = await verifyPassword(password, user.passwordHash);

                if (!ok) {
                    const attempts = (user.failedLoginAttempts ?? 0) + 1;
                    const update: Record<string, unknown> = { failedLoginAttempts: attempts };
                    if (attempts >= MAX_FAILED_ATTEMPTS) {
                        update.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
                        update.failedLoginAttempts = 0;
                    }
                    await User.updateOne({ _id: user._id }, { $set: update });
                    return null;
                }

                await User.updateOne(
                    { _id: user._id },
                    { $set: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } },
                );

                return toSessionUser(user);
            },
        }),
    ],
    events: {
        async signIn({ user, account }) {
            logger.info('auth.sign_in', { userId: user.id, provider: account?.provider });
        },
    },
    callbacks: {
        ...authConfig.callbacks,
        /** Creates/links the Mongoose user document for OAuth sign-ins. */
        async signIn({ user, account }) {
            if (!account || account.provider === 'credentials') return true;
            if (!user.email) return false;

            await connectToDatabase();
            const existing = await User.findOne({ email: user.email.toLowerCase() }).exec();

            if (!existing) {
                const created = await User.create({
                    name: user.name ?? user.email.split('@')[0],
                    email: user.email.toLowerCase(),
                    image: user.image ?? undefined,
                    emailVerified: new Date(),
                    roles: ['student'],
                    consent: { dataProcessing: true, marketingOptIn: false, termsAcceptedAt: new Date() },
                });

                // Same DataCloneError trap as the credentials path: never assign a
                // Mongoose array onto the object that becomes the JWT payload.
                const session = toSessionUser(created);
                user.id = session.id;
                user.roles = session.roles;
                user.permissions = session.permissions;
                return true;
            }

            if (existing.status !== 'active') return false;

            await User.updateOne({ _id: existing._id }, { $set: { lastLoginAt: new Date() } });

            const session = toSessionUser(existing);
            user.id = session.id;
            user.roles = session.roles;
            user.permissions = session.permissions;
            return true;
        },
    },
});

export const authProviders = {
    google: googleEnabled,
    credentials: true,
};
