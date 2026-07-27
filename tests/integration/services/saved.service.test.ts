import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { College } from '@/db/models/college.model';
import { SavedItem } from '@/db/models/system.model';
import {
    countSavedItems,
    listSavedItemsGrouped,
    purgeSavedItems,
    removeSavedItem,
    toggleSavedItem,
} from '@/services/saved.service';

const USER_ID = String(new Types.ObjectId());
const OTHER_USER_ID = String(new Types.ObjectId());

async function seedCollege(overrides: Record<string, unknown> = {}) {
    return College.create({
        name: 'IIT Bombay',
        slug: 'iit-bombay',
        state: new Types.ObjectId(),
        stateName: 'Maharashtra',
        city: new Types.ObjectId(),
        cityName: 'Mumbai',
        ownership: 'Government',
        status: 'published',
        ...overrides,
    });
}

function collegeToggle(collegeId: string, overrides: Record<string, unknown> = {}) {
    return {
        userId: USER_ID,
        entityType: 'college',
        entityId: collegeId,
        entityName: 'IIT Bombay',
        entitySlug: 'iit-bombay',
        ...overrides,
    };
}

async function savedCount(collegeId: Types.ObjectId) {
    return (await College.findById(collegeId).lean())?.savedCount;
}

describe('toggleSavedItem', () => {
    it('saves an item on the first call', async () => {
        const college = await seedCollege();

        const result = await toggleSavedItem(collegeToggle(String(college._id)));

        expect(result).toEqual({ saved: true });
        expect(await SavedItem.countDocuments({ user: USER_ID })).toBe(1);
    });

    it('removes the item on the second call', async () => {
        const college = await seedCollege();
        const input = collegeToggle(String(college._id));

        await toggleSavedItem(input);
        const result = await toggleSavedItem(input);

        expect(result).toEqual({ saved: false });
        expect(await SavedItem.countDocuments({ user: USER_ID })).toBe(0);
    });

    it('keeps the college savedCount in step in both directions', async () => {
        const college = await seedCollege();
        const input = collegeToggle(String(college._id));

        await toggleSavedItem(input);
        expect(await savedCount(college._id)).toBe(1);

        await toggleSavedItem(input);
        expect(await savedCount(college._id)).toBe(0);
    });

    it('counts each user separately on the same college', async () => {
        const college = await seedCollege();

        await toggleSavedItem(collegeToggle(String(college._id)));
        await toggleSavedItem(collegeToggle(String(college._id), { userId: OTHER_USER_ID }));

        expect(await savedCount(college._id)).toBe(2);
        expect(await SavedItem.countDocuments({})).toBe(2);
    });

    it('leaves the college counter alone for non-college entities', async () => {
        const college = await seedCollege();

        await toggleSavedItem(
            collegeToggle(String(college._id), {
                entityType: 'article',
                entitySlug: 'how-to-pick-a-branch',
            }),
        );

        expect(await savedCount(college._id)).toBe(0);
        expect(await SavedItem.countDocuments({ entityType: 'article' })).toBe(1);
    });

    it('stores an optional note with the saved row', async () => {
        const college = await seedCollege();

        await toggleSavedItem(collegeToggle(String(college._id), { note: 'Shortlist for round 2' }));

        expect((await SavedItem.findOne({}).lean())?.note).toBe('Shortlist for round 2');
    });

    it('does not remove another user’s row when toggling off', async () => {
        const college = await seedCollege();
        await toggleSavedItem(collegeToggle(String(college._id)));
        await toggleSavedItem(collegeToggle(String(college._id), { userId: OTHER_USER_ID }));

        await toggleSavedItem(collegeToggle(String(college._id)));

        expect(await SavedItem.countDocuments({ user: OTHER_USER_ID })).toBe(1);
    });
});

describe('listSavedItemsGrouped', () => {
    it('groups saved items by entity type', async () => {
        const college = await seedCollege();
        await toggleSavedItem(collegeToggle(String(college._id)));
        await toggleSavedItem(
            collegeToggle(String(college._id), { entityType: 'course', entitySlug: 'btech-cse' }),
        );
        await toggleSavedItem(
            collegeToggle(String(college._id), { entityType: 'exam', entitySlug: 'jee-main' }),
        );

        const grouped = await listSavedItemsGrouped(USER_ID);

        expect(Object.keys(grouped).sort()).toEqual(['college', 'course', 'exam']);
        expect(grouped.college).toHaveLength(1);
    });

    it('builds a public href per entity type', async () => {
        const college = await seedCollege();
        await toggleSavedItem(collegeToggle(String(college._id)));
        await toggleSavedItem(
            collegeToggle(String(college._id), { entityType: 'course', entitySlug: 'btech-cse' }),
        );

        const grouped = await listSavedItemsGrouped(USER_ID);

        expect(grouped.college?.[0]?.href).toBe('/colleges/iit-bombay');
        expect(grouped.course?.[0]?.href).toBe('/courses/btech-cse');
    });

    it('returns an empty object for a user with nothing saved', async () => {
        expect(await listSavedItemsGrouped(USER_ID)).toEqual({});
    });

    it('never includes another user’s saved items', async () => {
        const college = await seedCollege();
        await toggleSavedItem(collegeToggle(String(college._id), { userId: OTHER_USER_ID }));

        expect(await listSavedItemsGrouped(USER_ID)).toEqual({});
    });
});

describe('purgeSavedItems and removeSavedItem', () => {
    it('purges every row for the requesting user and reports how many', async () => {
        const college = await seedCollege();
        await toggleSavedItem(collegeToggle(String(college._id)));
        await toggleSavedItem(
            collegeToggle(String(college._id), { entityType: 'course', entitySlug: 'btech-cse' }),
        );
        await toggleSavedItem(collegeToggle(String(college._id), { userId: OTHER_USER_ID }));

        expect(await purgeSavedItems(USER_ID)).toBe(2);
        expect(await SavedItem.countDocuments({ user: OTHER_USER_ID })).toBe(1);
    });

    it('returns zero when there is nothing to purge', async () => {
        expect(await purgeSavedItems(USER_ID)).toBe(0);
    });

    it('decrements the denormalised college counter on purge', async () => {
        const college = await seedCollege();
        await toggleSavedItem(collegeToggle(String(college._id)));

        await purgeSavedItems(USER_ID);

        expect(await savedCount(college._id)).toBe(0);
    });

    it('leaves another user’s contribution to the counter intact on purge', async () => {
        const college = await seedCollege();
        await toggleSavedItem(collegeToggle(String(college._id)));
        await toggleSavedItem(collegeToggle(String(college._id), { userId: OTHER_USER_ID }));

        await purgeSavedItems(USER_ID);

        expect(await savedCount(college._id)).toBe(1);
    });

    it('removes a single row only for its owner', async () => {
        const college = await seedCollege();
        await toggleSavedItem(collegeToggle(String(college._id)));
        const row = await SavedItem.findOne({}).lean();

        expect(await removeSavedItem(OTHER_USER_ID, String(row?._id))).toBe(false);
        expect(await removeSavedItem(USER_ID, String(row?._id))).toBe(true);
    });
});

describe('countSavedItems', () => {
    it('counts the rows for one user', async () => {
        const college = await seedCollege();
        await toggleSavedItem(collegeToggle(String(college._id)));
        await toggleSavedItem(
            collegeToggle(String(college._id), { entityType: 'exam', entitySlug: 'jee-main' }),
        );
        await toggleSavedItem(collegeToggle(String(college._id), { userId: OTHER_USER_ID }));

        expect(await countSavedItems(USER_ID)).toBe(2);
    });
});
