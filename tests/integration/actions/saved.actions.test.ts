import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionActor } from '@/lib/auth/rbac';

/** The signed-in actor is the only thing these tests control. */
const session = vi.hoisted(() => ({ actor: null as SessionActor | null }));

vi.mock('@/lib/auth/session', () => ({
    getCurrentActor: async () => session.actor,
}));

vi.mock('next/cache', () => ({
    revalidatePath: () => undefined,
    revalidateTag: () => undefined,
    updateTag: () => undefined,
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { removeSavedItemAction, toggleSavedItemAction } from '@/actions/saved.actions';
import { College } from '@/db/models/college.model';
import { SavedItem } from '@/db/models/system.model';

const STUDENT: SessionActor = {
    id: String(new Types.ObjectId()),
    name: 'Riya Sharma',
    email: 'riya@example.com',
    roles: ['student'],
    permissions: [],
};

async function seedCollege() {
    return College.create({
        name: 'IIT Bombay',
        slug: 'iit-bombay',
        state: new Types.ObjectId(),
        stateName: 'Maharashtra',
        city: new Types.ObjectId(),
        cityName: 'Mumbai',
        ownership: 'Government',
        status: 'published',
    });
}

function toggleInput(collegeId: string) {
    return {
        entityType: 'college',
        entityId: collegeId,
        entityName: 'IIT Bombay',
        entitySlug: 'iit-bombay',
    };
}

beforeEach(() => {
    session.actor = null;
});

describe('toggleSavedItemAction', () => {
    it('refuses an anonymous caller and writes nothing', async () => {
        const college = await seedCollege();

        const result = await toggleSavedItemAction(toggleInput(String(college._id)));

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.code).toBe('UNAUTHENTICATED');
        expect(await SavedItem.countDocuments({})).toBe(0);
        expect((await College.findById(college._id).lean())?.savedCount).toBe(0);
    });

    it('saves the item for a signed-in student', async () => {
        session.actor = STUDENT;
        const college = await seedCollege();

        const result = await toggleSavedItemAction(toggleInput(String(college._id)));

        expect(result).toMatchObject({ ok: true, data: { saved: true } });
        const row = await SavedItem.findOne({}).lean();
        expect(String(row?.user)).toBe(STUDENT.id);
        expect((await College.findById(college._id).lean())?.savedCount).toBe(1);
    });

    it('removes the item when called a second time', async () => {
        session.actor = STUDENT;
        const college = await seedCollege();

        await toggleSavedItemAction(toggleInput(String(college._id)));
        const result = await toggleSavedItemAction(toggleInput(String(college._id)));

        expect(result).toMatchObject({ ok: true, data: { saved: false } });
        expect(await SavedItem.countDocuments({})).toBe(0);
    });

    it('rejects an unsupported entity type before touching the database', async () => {
        session.actor = STUDENT;

        const result = await toggleSavedItemAction({
            entityType: 'counsellor',
            entityId: String(new Types.ObjectId()),
            entityName: 'Someone',
            entitySlug: 'someone',
        });

        expect(result.ok === false && result.code).toBe('VALIDATION');
        expect(await SavedItem.countDocuments({})).toBe(0);
    });

    it('checks authentication before validating the payload', async () => {
        const result = await toggleSavedItemAction({ entityType: 'nonsense' });

        expect(result.ok === false && result.code).toBe('UNAUTHENTICATED');
    });
});

describe('removeSavedItemAction', () => {
    it('refuses an anonymous caller and leaves the row in place', async () => {
        session.actor = STUDENT;
        const college = await seedCollege();
        await toggleSavedItemAction(toggleInput(String(college._id)));
        const row = await SavedItem.findOne({}).lean();

        session.actor = null;
        const result = await removeSavedItemAction(String(row?._id));

        expect(result.ok === false && result.code).toBe('UNAUTHENTICATED');
        expect(await SavedItem.countDocuments({})).toBe(1);
    });

    it('removes the signed-in user’s own row', async () => {
        session.actor = STUDENT;
        const college = await seedCollege();
        await toggleSavedItemAction(toggleInput(String(college._id)));
        const row = await SavedItem.findOne({}).lean();

        const result = await removeSavedItemAction(String(row?._id));

        expect(result.ok).toBe(true);
        expect(await SavedItem.countDocuments({})).toBe(0);
    });

    it('cannot remove a row owned by another account', async () => {
        session.actor = STUDENT;
        const college = await seedCollege();
        await toggleSavedItemAction(toggleInput(String(college._id)));
        const row = await SavedItem.findOne({}).lean();

        session.actor = { ...STUDENT, id: String(new Types.ObjectId()) };
        await removeSavedItemAction(String(row?._id));

        expect(await SavedItem.countDocuments({ _id: row?._id })).toBe(1);
    });
});
