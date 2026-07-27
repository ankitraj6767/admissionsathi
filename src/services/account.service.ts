import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import {
    anonymiseUser,
    consumeVerificationToken,
    createVerificationToken,
    findUserByEmail,
    findUserById,
    updateUser,
} from '@/db/repositories/user.repository';
import { listSavedItemsForUser } from '@/db/repositories/system.repository';
import { listLeadsForEmail } from '@/db/repositories/lead.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { hashPassword } from '@/lib/auth/password';
import { purgeSavedItems } from '@/services/saved.service';
import type { UpdateProfileInput, NotificationPreferencesInput } from '@/schemas/auth.schema';

/** Reset tokens are stored hashed so a database leak cannot be replayed. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface ProfileScreenData {
    name: string;
    phone: string;
    stateId: string;
    cityId: string;
    currentQualification: string;
    passingYear?: number;
    gender: string;
    category: string;
    preferences: {
        channels: ('email' | 'whatsapp' | 'sms' | 'in_app')[];
        examAlerts: boolean;
        admissionAlerts: boolean;
        savedCollegeUpdates: boolean;
        marketing: boolean;
    };
}

/** Profile form defaults, falling back to session values when a field is unset. */
export async function getProfileScreenData(
    userId: string,
    fallbackName: string,
): Promise<ProfileScreenData> {
    const user = await findUserById(userId);

    return {
        name: user?.name ?? fallbackName,
        phone: user?.phone ?? '',
        stateId: user?.profile?.state ? String(user.profile.state) : '',
        cityId: user?.profile?.city ? String(user.profile.city) : '',
        currentQualification: user?.profile?.currentQualification ?? '',
        passingYear: user?.profile?.passingYear,
        gender: user?.profile?.gender ?? '',
        category: user?.profile?.category ?? '',
        preferences: {
            channels:
                (user?.notificationPreferences?.channels as ProfileScreenData['preferences']['channels']) ?? [
                    'email',
                    'in_app',
                ],
            examAlerts: user?.notificationPreferences?.examAlerts ?? true,
            admissionAlerts: user?.notificationPreferences?.admissionAlerts ?? true,
            savedCollegeUpdates: user?.notificationPreferences?.savedCollegeUpdates ?? true,
            marketing: user?.notificationPreferences?.marketing ?? false,
        },
    };
}

const asObjectId = (value?: string) =>
    value && Types.ObjectId.isValid(value) ? value : undefined;

export async function saveProfile(
    userId: string,
    data: UpdateProfileInput,
): Promise<void> {
    await updateUser(userId, {
        name: data.name,
        phone: data.phone || undefined,
        'profile.state': asObjectId(data.stateId),
        'profile.city': asObjectId(data.cityId),
        'profile.currentQualification': data.currentQualification,
        'profile.passingYear': data.passingYear,
        'profile.gender': data.gender,
        'profile.category': data.category,
        updatedBy: userId,
    });
}

export async function saveNotificationPreferences(
    userId: string,
    data: NotificationPreferencesInput,
): Promise<void> {
    await updateUser(userId, { notificationPreferences: data });
}

/* ---------------------------- password recovery --------------------------- */

export interface ResetRequestOutcome {
    /** Absent when the email is not registered — callers must still answer identically. */
    token?: string;
    userName?: string;
}

/**
 * Issues a reset token when the email exists.
 *
 * The caller always returns the same message regardless of the outcome, so this
 * endpoint cannot be used to enumerate registered accounts.
 */
export async function requestPasswordReset(email: string): Promise<ResetRequestOutcome> {
    const user = await findUserByEmail(email);
    if (!user) return {};

    const token = randomBytes(32).toString('hex');
    await createVerificationToken({
        identifier: email,
        token: hashToken(token),
        purpose: 'password_reset',
        expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    return { token, userName: user.name };
}

export type ResetResult =
    | { ok: true; email: string; userId: string }
    | { ok: false; reason: 'invalid_token' | 'account_missing' };

/** Consumes a reset token (single use) and sets the new password. */
export async function completePasswordReset(
    token: string,
    password: string,
): Promise<ResetResult> {
    const record = await consumeVerificationToken(hashToken(token));
    if (!record || record.purpose !== 'password_reset') return { ok: false, reason: 'invalid_token' };

    const user = await findUserByEmail(record.identifier);
    if (!user) return { ok: false, reason: 'account_missing' };

    await updateUser(String(user._id), {
        passwordHash: await hashPassword(password),
        failedLoginAttempts: 0,
        lockedUntil: null,
    });

    return { ok: true, email: user.email, userId: String(user._id) };
}

/* --------------------------- export and deletion -------------------------- */

/** Everything the platform holds for one account, as portable JSON. */
export async function buildDataExport(userId: string, email: string): Promise<string> {
    const [user, saved, leads] = await Promise.all([
        findUserById(userId),
        listSavedItemsForUser(userId, { limit: 500 }),
        listLeadsForEmail(email),
    ]);

    return JSON.stringify(
        {
            exportedAt: new Date().toISOString(),
            account: user ? toPlain({ ...user, passwordHash: undefined }) : null,
            savedItems: toPlain(saved),
            enquiries: toPlain(leads),
        },
        null,
        2,
    );
}

/**
 * Closes an account: the row is anonymised rather than removed so leads and
 * bookings keep their references, and the shortlist is purged.
 */
export async function closeAccount(userId: string): Promise<void> {
    await anonymiseUser(userId);
    await purgeSavedItems(userId);
}
