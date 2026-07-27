import 'server-only';
import type { FilterQuery } from 'mongoose';
import { connectToDatabase } from '@/db/connect';
import {
    User,
    VerificationToken,
    type UserDoc,
    type VerificationTokenDoc,
} from '@/db/models/user.model';
import { countDocs, findLean, findOneLean } from './base.repository';

/** Projection that never includes `passwordHash`. */
const SAFE_PROJECTION = {
    name: 1,
    email: 1,
    emailVerified: 1,
    phone: 1,
    image: 1,
    roles: 1,
    status: 1,
    profile: 1,
    notificationPreferences: 1,
    consent: 1,
    lastLoginAt: 1,
    createdAt: 1,
} as const;

export async function findUserById(id: string): Promise<UserDoc | null> {
    return findOneLean<UserDoc>(User, { _id: id, isDeleted: { $ne: true } } as FilterQuery<UserDoc>, {
        projection: SAFE_PROJECTION,
    });
}

/** Includes `passwordHash` — only for the credentials provider. */
export async function findUserForAuth(email: string): Promise<UserDoc | null> {
    return findOneLean<UserDoc>(User, {
        email: email.toLowerCase(),
        isDeleted: { $ne: true },
    } as FilterQuery<UserDoc>);
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
    return findOneLean<UserDoc>(
        User,
        { email: email.toLowerCase(), isDeleted: { $ne: true } } as FilterQuery<UserDoc>,
        { projection: SAFE_PROJECTION },
    );
}

export async function emailExists(email: string): Promise<boolean> {
    const count = await countDocs<UserDoc>(User, {
        email: email.toLowerCase(),
    } as FilterQuery<UserDoc>);
    return count > 0;
}

export async function createUser(values: Record<string, unknown>): Promise<string> {
    await connectToDatabase();
    const created = await User.create(values);
    return String(created._id);
}

export async function updateUser(id: string, values: Record<string, unknown>): Promise<void> {
    await connectToDatabase();
    await User.updateOne({ _id: id }, { $set: values }).exec();
}

/**
 * Just the delivery addresses for an account.
 * The notification worker needs somewhere to send a queued message and nothing
 * else about the user.
 */
export async function findUserContact(
    id: unknown,
): Promise<Pick<UserDoc, 'email' | 'phone'> | null> {
    return findOneLean<UserDoc>(User, { _id: id } as FilterQuery<UserDoc>, {
        projection: { email: 1, phone: 1 },
    });
}

/** Display names for a known set of ids, so admin lists avoid per-row populates. */
export async function listUserNamesByIds(
    ids: unknown[],
): Promise<Pick<UserDoc, '_id' | 'name' | 'email'>[]> {
    if (ids.length === 0) return [];
    return findLean<UserDoc>(User, { _id: { $in: ids } } as FilterQuery<UserDoc>, {
        projection: { name: 1, email: 1 },
        limit: ids.length,
    });
}

export async function countUsers(filter: FilterQuery<UserDoc> = {}): Promise<number> {
    return countDocs<UserDoc>(User, filter);
}

export async function countUsersByRole(roleKey: string): Promise<number> {
    return countDocs<UserDoc>(User, { roles: roleKey } as FilterQuery<UserDoc>);
}

export async function listStaffUsers(limit = 100): Promise<UserDoc[]> {
    return findLean<UserDoc>(
        User,
        { roles: { $ne: [] }, isDeleted: { $ne: true } } as FilterQuery<UserDoc>,
        { sort: { createdAt: -1 }, limit, projection: { name: 1, email: 1, roles: 1, status: 1 } },
    );
}

/* --------------------------- login attempt guard -------------------------- */

export async function registerFailedLogin(
    email: string,
    maxAttempts: number,
    lockMinutes: number,
): Promise<void> {
    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase() })
        .select('failedLoginAttempts')
        .lean<{ _id: unknown; failedLoginAttempts: number }>()
        .exec();
    if (!user) return;

    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    await User.updateOne(
        { _id: user._id },
        {
            $set: {
                failedLoginAttempts: attempts,
                ...(attempts >= maxAttempts
                    ? { lockedUntil: new Date(Date.now() + lockMinutes * 60_000) }
                    : {}),
            },
        },
    ).exec();
}

export async function registerSuccessfulLogin(id: string): Promise<void> {
    await connectToDatabase();
    await User.updateOne(
        { _id: id },
        { $set: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } },
    ).exec();
}

/* ------------------------------ soft deletion ----------------------------- */

/**
 * Anonymises and soft-deletes an account. The row is retained so historical
 * leads and bookings keep referential integrity, but every identifier is cleared.
 */
export async function anonymiseUser(id: string): Promise<void> {
    await connectToDatabase();
    await User.updateOne(
        { _id: id },
        {
            $set: {
                name: 'Deleted user',
                email: `deleted-${id}@deleted.invalid`,
                phone: undefined,
                image: undefined,
                passwordHash: undefined,
                status: 'suspended',
                roles: [],
                isDeleted: true,
                deletedAt: new Date(),
            },
        },
    ).exec();
}

/* --------------------------- verification tokens -------------------------- */

export async function createVerificationToken(values: {
    identifier: string;
    token: string;
    expires: Date;
    purpose?: string;
}): Promise<void> {
    await connectToDatabase();
    await VerificationToken.create(values);
}

export async function consumeVerificationToken(
    token: string,
): Promise<VerificationTokenDoc | null> {
    await connectToDatabase();
    // findOneAndDelete makes the token single-use even under concurrent requests.
    return VerificationToken.findOneAndDelete({ token, expires: { $gt: new Date() } })
        .lean<VerificationTokenDoc>()
        .exec();
}

export async function deleteVerificationTokensFor(identifier: string): Promise<void> {
    await connectToDatabase();
    await VerificationToken.deleteMany({ identifier }).exec();
}
