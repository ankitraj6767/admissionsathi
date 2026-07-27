import { Types } from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import { Notification, SavedItem } from '@/db/models/system.model';
import {
    claimDueNotifications,
    countSavedItemsForUser,
    createNotification,
    createSavedItem,
    deleteAllSavedItemsForUser,
    deleteSavedItem,
    deleteSavedItemByEntity,
    findSavedItem,
    listSavedItemsForUser,
    markNotificationFailed,
    markNotificationSent,
    markNotificationsRead,
} from '@/db/repositories/system.repository';

const OWNER = String(new Types.ObjectId());
const ATTACKER = String(new Types.ObjectId());
const COLLEGE_ID = String(new Types.ObjectId());

function savedItemInput(overrides: Partial<Record<string, string>> = {}) {
    return {
        user: OWNER,
        entityType: 'college',
        entityId: COLLEGE_ID,
        entityName: 'IIT Bombay',
        entitySlug: 'iit-bombay',
        ...overrides,
    };
}

async function seedNotification(overrides: Record<string, unknown> = {}) {
    return Notification.create({
        event: 'lead.acknowledgement',
        channel: 'email',
        title: 'We received your request',
        body: 'A counsellor will call you shortly.',
        state: 'queued',
        scheduledFor: new Date(Date.now() - 60_000),
        ...overrides,
    });
}

// The unique/sparse indexes are what these behaviours rely on, so wait for them.
beforeAll(async () => {
    await SavedItem.init();
    await Notification.init();
});

describe('saved items', () => {
    it('creates a saved row and returns its id', async () => {
        const id = await createSavedItem(savedItemInput());

        expect(Types.ObjectId.isValid(id)).toBe(true);
        expect(await SavedItem.countDocuments({ user: OWNER })).toBe(1);
    });

    it('finds a saved row for its owner', async () => {
        await createSavedItem(savedItemInput());

        const row = await findSavedItem(OWNER, 'college', COLLEGE_ID);

        expect(row?.entitySlug).toBe('iit-bombay');
    });

    it('does not surface another user’s saved row', async () => {
        await createSavedItem(savedItemInput());

        expect(await findSavedItem(ATTACKER, 'college', COLLEGE_ID)).toBeNull();
    });

    it('rejects the same entity twice for one user', async () => {
        await createSavedItem(savedItemInput());

        await expect(createSavedItem(savedItemInput())).rejects.toThrow(/E11000/);
        expect(await SavedItem.countDocuments({})).toBe(1);
    });

    it('allows the same entity id under a different entity type', async () => {
        await createSavedItem(savedItemInput());
        await createSavedItem(savedItemInput({ entityType: 'course', entitySlug: 'btech-cse' }));

        expect(await SavedItem.countDocuments({ user: OWNER })).toBe(2);
    });

    it('allows two users to save the same entity', async () => {
        await createSavedItem(savedItemInput());
        await createSavedItem(savedItemInput({ user: ATTACKER }));

        expect(await SavedItem.countDocuments({ entityId: COLLEGE_ID })).toBe(2);
    });

    it('deletes a saved row for its owner', async () => {
        const id = await createSavedItem(savedItemInput());

        expect(await deleteSavedItem(OWNER, id)).toBe(true);
        expect(await SavedItem.countDocuments({})).toBe(0);
    });

    it('refuses to delete a row owned by someone else', async () => {
        const id = await createSavedItem(savedItemInput());

        // IDOR guard: knowing the row id is not enough, the query is owner-scoped.
        expect(await deleteSavedItem(ATTACKER, id)).toBe(false);
        expect(await SavedItem.countDocuments({ _id: id })).toBe(1);
    });

    it('scopes the delete-by-entity path to the owner as well', async () => {
        await createSavedItem(savedItemInput());

        expect(await deleteSavedItemByEntity(ATTACKER, 'college', COLLEGE_ID)).toBe(false);
        expect(await deleteSavedItemByEntity(OWNER, 'college', COLLEGE_ID)).toBe(true);
    });

    it('purges only the requesting user’s rows', async () => {
        await createSavedItem(savedItemInput());
        await createSavedItem(savedItemInput({ entityType: 'exam', entitySlug: 'jee-main' }));
        await createSavedItem(savedItemInput({ user: ATTACKER }));

        expect(await deleteAllSavedItemsForUser(OWNER)).toBe(2);
        expect(await SavedItem.countDocuments({ user: ATTACKER })).toBe(1);
    });

    it('lists a user’s rows newest first and can filter by entity type', async () => {
        await createSavedItem(savedItemInput());
        await createSavedItem(savedItemInput({ entityType: 'course', entitySlug: 'btech-cse' }));

        const all = await listSavedItemsForUser(OWNER);
        const courses = await listSavedItemsForUser(OWNER, { entityType: 'course' });

        expect(all).toHaveLength(2);
        expect(courses.map((row) => row.entitySlug)).toEqual(['btech-cse']);
    });

    it('counts only the requesting user’s rows', async () => {
        await createSavedItem(savedItemInput());
        await createSavedItem(savedItemInput({ user: ATTACKER }));

        expect(await countSavedItemsForUser(OWNER)).toBe(1);
    });
});

describe('notification queue — create', () => {
    it('returns the id of the queued row', async () => {
        const id = await createNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            title: 'Welcome',
            body: 'Thanks for reaching out.',
        });

        expect(id).not.toBeNull();
        expect(await Notification.countDocuments({})).toBe(1);
    });

    it('returns null instead of throwing when the dedupeKey already exists', async () => {
        const first = await createNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            title: 'Welcome',
            body: 'Thanks for reaching out.',
            dedupeKey: 'lead-ack-email-1',
        });

        const second = await createNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            title: 'Welcome again',
            body: 'Duplicate of the same message.',
            dedupeKey: 'lead-ack-email-1',
        });

        expect(first).not.toBeNull();
        expect(second).toBeNull();
        expect(await Notification.countDocuments({})).toBe(1);
    });

    it('does not dedupe rows that carry no dedupeKey', async () => {
        await createNotification({
            event: 'lead.new_internal',
            channel: 'in_app',
            title: 'New lead',
            body: 'One',
        });
        await createNotification({
            event: 'lead.new_internal',
            channel: 'in_app',
            title: 'New lead',
            body: 'Two',
        });

        expect(await Notification.countDocuments({})).toBe(2);
    });
});

describe('notification queue — claiming', () => {
    it('claims only rows whose schedule is due', async () => {
        await seedNotification({ title: 'Due now' });
        await seedNotification({ title: 'Later', scheduledFor: new Date(Date.now() + 3_600_000) });

        const claimed = await claimDueNotifications(10);

        expect(claimed.map((row) => row.title)).toEqual(['Due now']);
    });

    it('ignores rows that are not queued', async () => {
        await seedNotification({ title: 'Already sent', state: 'sent' });
        await seedNotification({ title: 'Cancelled', state: 'cancelled' });
        await seedNotification({ title: 'In flight', state: 'processing' });

        expect(await claimDueNotifications(10)).toEqual([]);
    });

    it('moves claimed rows to processing', async () => {
        const row = await seedNotification();

        await claimDueNotifications(10);

        expect((await Notification.findById(row._id).lean())?.state).toBe('processing');
    });

    it('increments attempts and returns the persisted value', async () => {
        const row = await seedNotification({ attempts: 1 });

        const [claimed] = await claimDueNotifications(10);

        expect(claimed?.attempts).toBe(2);
        expect((await Notification.findById(row._id).lean())?.attempts).toBe(2);
    });

    it('skips rows that already hit the attempt ceiling', async () => {
        await seedNotification({ title: 'Exhausted', attempts: 4 });
        await seedNotification({ title: 'Retryable', attempts: 3 });

        const claimed = await claimDueNotifications(10, 4);

        expect(claimed.map((row) => row.title)).toEqual(['Retryable']);
    });

    it('claims the oldest schedule first and honours the limit', async () => {
        await seedNotification({ title: 'Second', scheduledFor: new Date(Date.now() - 60_000) });
        await seedNotification({ title: 'First', scheduledFor: new Date(Date.now() - 120_000) });

        const claimed = await claimDueNotifications(1);

        expect(claimed.map((row) => row.title)).toEqual(['First']);
    });

    it('does not hand the same row to a second worker run', async () => {
        await seedNotification();

        expect(await claimDueNotifications(10)).toHaveLength(1);
        expect(await claimDueNotifications(10)).toEqual([]);
    });

    it('returns an empty list when nothing is due', async () => {
        expect(await claimDueNotifications(10)).toEqual([]);
    });
});

describe('notification queue — outcomes', () => {
    it('marks a row sent with a timestamp', async () => {
        const row = await seedNotification();

        await markNotificationSent(row._id);

        const stored = await Notification.findById(row._id).lean();
        expect(stored?.state).toBe('sent');
        expect(stored?.sentAt).toBeInstanceOf(Date);
    });

    it('re-queues a retryable failure at the backoff time', async () => {
        const row = await seedNotification({ state: 'processing' });
        const retryAt = new Date(Date.now() + 120_000);

        await markNotificationFailed(row._id, 'provider timeout', true, retryAt);

        const stored = await Notification.findById(row._id).lean();
        expect(stored?.state).toBe('queued');
        expect(stored?.lastError).toBe('provider timeout');
        expect(stored?.scheduledFor?.getTime()).toBe(retryAt.getTime());
    });

    it('parks a failure that has run out of retries', async () => {
        const row = await seedNotification({ state: 'processing', attempts: 4 });

        await markNotificationFailed(row._id, 'permanent bounce', false);

        const stored = await Notification.findById(row._id).lean();
        expect(stored?.state).toBe('failed');
        expect(stored?.lastError).toBe('permanent bounce');
    });

    it('keeps the current schedule when no retry time is given', async () => {
        const scheduledFor = new Date(Date.now() - 60_000);
        const row = await seedNotification({ state: 'processing', scheduledFor });

        await markNotificationFailed(row._id, 'transient', true);

        const stored = await Notification.findById(row._id).lean();
        expect(stored?.scheduledFor?.getTime()).toBe(scheduledFor.getTime());
    });

    it('truncates a very long error message', async () => {
        const row = await seedNotification({ state: 'processing' });

        await markNotificationFailed(row._id, 'x'.repeat(2_000), false);

        expect((await Notification.findById(row._id).lean())?.lastError).toHaveLength(1_000);
    });
});

describe('markNotificationsRead', () => {
    it('marks every unread in-app row for the user and reports the count', async () => {
        await seedNotification({ user: OWNER, channel: 'in_app' });
        await seedNotification({ user: OWNER, channel: 'in_app' });

        expect(await markNotificationsRead(OWNER)).toBe(2);
        expect(await Notification.countDocuments({ readAt: { $exists: true } })).toBe(2);
    });

    it('never touches another user’s notifications', async () => {
        const other = await seedNotification({ user: ATTACKER, channel: 'in_app' });
        await seedNotification({ user: OWNER, channel: 'in_app' });

        await markNotificationsRead(OWNER);

        expect((await Notification.findById(other._id).lean())?.readAt).toBeUndefined();
    });

    it('restricts the update to the given ids', async () => {
        const first = await seedNotification({ user: OWNER, channel: 'in_app' });
        const second = await seedNotification({ user: OWNER, channel: 'in_app' });

        expect(await markNotificationsRead(OWNER, [String(first._id)])).toBe(1);
        expect((await Notification.findById(second._id).lean())?.readAt).toBeUndefined();
    });

    it('skips rows that were already read', async () => {
        await seedNotification({ user: OWNER, channel: 'in_app', readAt: new Date() });

        expect(await markNotificationsRead(OWNER)).toBe(0);
    });
});
