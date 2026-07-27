'use server';

import { revalidatePath } from 'next/cache';
import {
    forgotPasswordSchema,
    notificationPreferencesSchema,
    resetPasswordSchema,
    updateProfileSchema,
} from '@/schemas/auth.schema';
import { requireActor } from '@/lib/auth/session';
import {
    buildDataExport,
    closeAccount,
    completePasswordReset,
    requestPasswordReset,
    saveNotificationPreferences,
    saveProfile,
} from '@/services/account.service';
import { queueNotification } from '@/services/notification.service';
import { recordAudit } from '@/services/audit.service';
import { rateLimit } from '@/lib/rate-limit';
import { fail, runAction, succeed } from '@/lib/action-helpers';
import { absoluteUrl } from '@/lib/utils';
import type { ActionResult } from '@/types/common';

/** Identical response whether or not the email is registered (no account enumeration). */
const RESET_REQUESTED_MESSAGE = 'If that email is registered, a reset link is on its way.';

export async function requestPasswordResetAction(input: unknown): Promise<ActionResult<null>> {
    return runAction({ action: 'account.reset_request' }, async () => {
        const data = forgotPasswordSchema.parse(input);

        const limited = await rateLimit({
            key: 'auth:reset',
            limit: 3,
            windowSeconds: 900,
            identifier: data.email,
        });
        if (!limited.success) {
            return fail('Too many reset requests. Please try again later.', 'RATE_LIMITED');
        }

        const outcome = await requestPasswordReset(data.email);

        if (outcome.token) {
            const link = absoluteUrl(
                `/reset-password?token=${outcome.token}&email=${encodeURIComponent(data.email)}`,
            );
            await queueNotification({
                event: 'account.password_reset',
                channel: 'email',
                to: data.email,
                title: 'Reset your Admission Sathi password',
                body: `Hi ${outcome.userName}, use this link within the next hour to reset your password: ${link}`,
            });
        }

        return succeed(null, RESET_REQUESTED_MESSAGE);
    });
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
    return runAction({ action: 'account.reset' }, async () => {
        const data = resetPasswordSchema.parse(input);
        const result = await completePasswordReset(data.token, data.password);

        if (!result.ok) {
            return fail('This reset link is invalid or has expired.', 'VALIDATION');
        }

        await recordAudit({
            action: 'account.password_reset',
            entity: 'User',
            entityId: result.userId,
            entityLabel: result.email,
        });

        return succeed(null, 'Password updated. You can now sign in.');
    });
}

export async function updateProfileAction(input: unknown): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'account.update_profile' }, async () => {
        const actor = await requireActor();
        const data = updateProfileSchema.parse(input);

        await saveProfile(actor.id, data);

        revalidatePath('/dashboard/profile');
        return succeed({ id: actor.id }, 'Profile updated.');
    });
}

export async function updateNotificationPreferencesAction(
    input: unknown,
): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'account.update_notifications' }, async () => {
        const actor = await requireActor();
        const data = notificationPreferencesSchema.parse(input);

        await saveNotificationPreferences(actor.id, data);

        revalidatePath('/dashboard/profile');
        return succeed({ id: actor.id }, 'Notification preferences saved.');
    });
}

/** GDPR-style export of everything we hold for the signed-in user. */
export async function exportMyDataAction(): Promise<ActionResult<{ json: string }>> {
    return runAction({ action: 'account.export' }, async () => {
        const actor = await requireActor();
        const json = await buildDataExport(actor.id, actor.email);

        await recordAudit({
            actor,
            action: 'account.export',
            entity: 'User',
            entityId: actor.id,
            entityLabel: actor.email,
        });

        return succeed({ json }, 'Your data export is ready.');
    });
}

/** Soft-deletes the account and anonymises the profile. */
export async function deleteMyAccountAction(): Promise<ActionResult<null>> {
    return runAction({ action: 'account.delete' }, async () => {
        const actor = await requireActor();
        await closeAccount(actor.id);

        await recordAudit({
            actor,
            action: 'account.delete',
            entity: 'User',
            entityId: actor.id,
            entityLabel: actor.email,
            message: 'Account soft-deleted at user request',
        });

        return succeed(null, 'Your account has been closed.');
    });
}
