'use server';

import { randomBytes, createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/db/connect';
import { User, VerificationToken } from '@/db/models/user.model';
import { SavedItem } from '@/db/models/system.model';
import { Lead } from '@/db/models/lead.model';
import { hashPassword } from '@/lib/auth/password';
import {
    forgotPasswordSchema,
    notificationPreferencesSchema,
    resetPasswordSchema,
    updateProfileSchema,
} from '@/schemas/auth.schema';
import { requireActor } from '@/lib/auth/session';
import { queueNotification } from '@/services/notification.service';
import { recordAudit } from '@/services/audit.service';
import { rateLimit } from '@/lib/rate-limit';
import { NotFoundError, fail, runAction, succeed } from '@/lib/action-helpers';
import { absoluteUrl } from '@/lib/utils';
import { Types } from 'mongoose';
import type { ActionResult } from '@/types/common';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

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

        await connectToDatabase();
        const user = await User.findOne({ email: data.email }).select('_id name email').lean().exec();

        // Always answer the same way so the endpoint cannot be used to enumerate accounts.
        if (user) {
            const token = randomBytes(32).toString('hex');
            await VerificationToken.create({
                identifier: data.email,
                token: hashToken(token),
                purpose: 'password_reset',
                expires: new Date(Date.now() + 60 * 60 * 1000),
            });

            await queueNotification({
                event: 'account.password_reset',
                channel: 'email',
                to: data.email,
                title: 'Reset your Admission Sathi password',
                body: `Hi ${user.name}, use this link within the next hour to reset your password: ${absoluteUrl(`/reset-password?token=${token}&email=${encodeURIComponent(data.email)}`)}`,
            });
        }

        return succeed(null, 'If that email is registered, a reset link is on its way.');
    });
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
    return runAction({ action: 'account.reset' }, async () => {
        const data = resetPasswordSchema.parse(input);
        await connectToDatabase();

        const record = await VerificationToken.findOne({
            token: hashToken(data.token),
            purpose: 'password_reset',
            expires: { $gt: new Date() },
        }).exec();

        if (!record) return fail('This reset link is invalid or has expired.', 'VALIDATION');

        const user = await User.findOne({ email: record.identifier }).exec();
        if (!user) throw new NotFoundError('Account not found.');

        user.passwordHash = await hashPassword(data.password);
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        await user.save();

        await VerificationToken.deleteOne({ _id: record._id }).exec();

        await recordAudit({
            action: 'account.password_reset',
            entity: 'User',
            entityId: String(user._id),
            entityLabel: user.email,
        });

        return succeed(null, 'Password updated. You can now sign in.');
    });
}

export async function updateProfileAction(input: unknown): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'account.update_profile' }, async () => {
        const actor = await requireActor();
        const data = updateProfileSchema.parse(input);

        await connectToDatabase();
        await User.updateOne(
            { _id: actor.id },
            {
                $set: {
                    name: data.name,
                    phone: data.phone || undefined,
                    'profile.state': data.stateId && Types.ObjectId.isValid(data.stateId) ? data.stateId : undefined,
                    'profile.city': data.cityId && Types.ObjectId.isValid(data.cityId) ? data.cityId : undefined,
                    'profile.currentQualification': data.currentQualification,
                    'profile.passingYear': data.passingYear,
                    'profile.gender': data.gender,
                    'profile.category': data.category,
                    updatedBy: actor.id,
                },
            },
        ).exec();

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

        await connectToDatabase();
        await User.updateOne({ _id: actor.id }, { $set: { notificationPreferences: data } }).exec();

        revalidatePath('/dashboard/profile');
        return succeed({ id: actor.id }, 'Notification preferences saved.');
    });
}

/** GDPR-style export of everything we hold for the signed-in user. */
export async function exportMyDataAction(): Promise<ActionResult<{ json: string }>> {
    return runAction({ action: 'account.export' }, async () => {
        const actor = await requireActor();
        await connectToDatabase();

        const [user, saved, leads] = await Promise.all([
            User.findById(actor.id).lean().exec(),
            SavedItem.find({ user: actor.id }).lean().exec(),
            Lead.find({ email: actor.email }).select('-consent.ipHash -userAgent').lean().exec(),
        ]);

        const payload = {
            exportedAt: new Date().toISOString(),
            account: user ? { ...user, passwordHash: undefined } : null,
            savedItems: saved,
            enquiries: leads,
        };

        await recordAudit({
            actor,
            action: 'account.export',
            entity: 'User',
            entityId: actor.id,
            entityLabel: actor.email,
        });

        return succeed({ json: JSON.stringify(payload, null, 2) }, 'Your data export is ready.');
    });
}

/** Soft-deletes the account and anonymises the profile. */
export async function deleteMyAccountAction(): Promise<ActionResult<null>> {
    return runAction({ action: 'account.delete' }, async () => {
        const actor = await requireActor();
        await connectToDatabase();

        await User.updateOne(
            { _id: actor.id },
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    status: 'suspended',
                    name: 'Deleted user',
                    phone: undefined,
                    image: undefined,
                    email: `deleted-${actor.id}@admissionsathi.invalid`,
                },
            },
        ).exec();

        await SavedItem.deleteMany({ user: actor.id }).exec();

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
