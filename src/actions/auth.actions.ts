'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/lib/auth';
import { connectToDatabase } from '@/db/connect';
import { User } from '@/db/models/user.model';
import { hashPassword } from '@/lib/auth/password';
import { loginSchema, signUpSchema } from '@/schemas/auth.schema';
import { RATE_LIMITS, clientFingerprint, rateLimit } from '@/lib/rate-limit';
import { logger, newRequestId } from '@/lib/logger';
import { maskEmail } from '@/lib/utils';
import { runAction, succeed, fail } from '@/lib/action-helpers';
import { recordAudit } from '@/services/audit.service';
import { queueNotification } from '@/services/notification.service';
import type { ActionResult } from '@/types/common';

export async function signOutAction(): Promise<void> {
    await signOut({ redirectTo: '/' });
}

export async function signUpAction(input: unknown): Promise<ActionResult<{ email: string }>> {
    return runAction({ action: 'auth.signup' }, async () => {
        const limited = await rateLimit(RATE_LIMITS.authSignup);
        if (!limited.success) {
            return fail('Too many sign-up attempts. Please try again later.', 'RATE_LIMITED');
        }

        const data = signUpSchema.parse(input);
        await connectToDatabase();

        const existing = await User.findOne({ email: data.email }).select('_id').lean().exec();
        if (existing) {
            return fail('An account with this email already exists. Try logging in instead.', 'DUPLICATE', {
                email: ['Email already registered'],
            });
        }

        const { ipHash } = await clientFingerprint();
        const passwordHash = await hashPassword(data.password);

        const user = await User.create({
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
            passwordHash,
            roles: ['student'],
            status: 'active',
            consent: {
                termsAcceptedAt: new Date(),
                marketingOptIn: data.marketingOptIn,
                dataProcessing: true,
            },
        });

        await recordAudit({
            action: 'user.signup',
            entity: 'User',
            entityId: String(user._id),
            entityLabel: data.email,
            newValues: { email: data.email, roles: ['student'], ipHash },
        });

        await queueNotification({
            event: 'account.welcome',
            channel: 'email',
            userId: String(user._id),
            title: 'Welcome to Admission Sathi',
            body: `Hi ${data.name}, your Admission Sathi account is ready. Save colleges, run predictors and book free counselling any time.`,
            actionUrl: '/dashboard',
        });

        return succeed({ email: data.email }, 'Account created. You can now sign in.');
    });
}

export async function loginAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
    return runAction({ action: 'auth.login' }, async () => {
        const data = loginSchema.parse(input);

        const limited = await rateLimit({
            key: 'auth:login',
            limit: 10,
            windowSeconds: 900,
            identifier: data.email,
        });
        if (!limited.success) {
            return fail('Too many failed attempts. Please try again in a few minutes.', 'RATE_LIMITED');
        }

        try {
            await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            });
        } catch (error) {
            if (error instanceof AuthError) {
                /*
                 * Only `CredentialsSignin` means "the email/password was wrong".
                 * Every other AuthError is a server-side fault (a failing callback,
                 * a bad secret, an unencodable JWT payload). Reporting those as bad
                 * credentials sends the user in circles retyping a correct password,
                 * so they are logged and surfaced distinctly instead.
                 */
                if (error.type === 'CredentialsSignin') {
                    return fail('Invalid email or password.', 'VALIDATION', {
                        password: ['Invalid email or password'],
                    });
                }

                const requestId = newRequestId();
                logger.error('auth.login_failed', {
                    requestId,
                    email: maskEmail(data.email),
                    authErrorType: error.type,
                    error: error.message,
                    cause:
                        error.cause && typeof error.cause === 'object' && 'err' in error.cause
                            ? String((error.cause as { err?: unknown }).err)
                            : undefined,
                });

                return fail(
                    `We could not complete sign-in because of a server problem. Please try again. (ref: ${requestId})`,
                    'INTERNAL',
                );
            }
            throw error;
        }

        return succeed({ redirectTo: data.callbackUrl ?? '/dashboard' }, 'Signed in successfully.');
    });
}

export async function googleSignInAction(): Promise<void> {
    await signIn('google', { redirectTo: '/dashboard' });
}

export async function requireLoginRedirect(path: string): Promise<never> {
    redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
}
