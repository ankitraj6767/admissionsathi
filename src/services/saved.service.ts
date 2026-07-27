import 'server-only';
import {
    countSavedItemsForUser,
    createSavedItem,
    deleteAllSavedItemsForUser,
    deleteSavedItem,
    deleteSavedItemByEntity,
    findSavedItem,
    listSavedItemsForUser,
} from '@/db/repositories/system.repository';
import { adjustCollegeSavedCount } from '@/db/repositories/college.repository';
import { toPlain } from '@/db/repositories/base.repository';

/** Public URL prefix per saved entity type. */
const ENTITY_PATHS: Record<string, string> = {
    college: '/colleges',
    course: '/courses',
    exam: '/exams',
    article: '/articles',
    scholarship: '/scholarships',
    resource: '/resources',
    comparison: '/compare-colleges',
};

export interface SavedItemView {
    id: string;
    entityType: string;
    entityId: string;
    entityName: string;
    entitySlug: string;
    href: string;
    createdAt: string;
}

export function savedItemHref(entityType: string, entitySlug: string): string {
    return `${ENTITY_PATHS[entityType] ?? ''}/${entitySlug}`;
}

export async function listSavedItems(
    userId: string,
    options: { limit?: number; entityType?: string } = {},
): Promise<SavedItemView[]> {
    const rows = toPlain(await listSavedItemsForUser(userId, options));
    return rows.map((row) => ({
        id: String(row._id),
        entityType: row.entityType,
        entityId: String(row.entityId),
        entityName: row.entityName,
        entitySlug: row.entitySlug,
        href: savedItemHref(row.entityType, row.entitySlug),
        createdAt: new Date(row.createdAt).toISOString(),
    }));
}

/** Saved items grouped by entity type, preserving recency order inside each group. */
export async function listSavedItemsGrouped(
    userId: string,
    limit = 100,
): Promise<Record<string, SavedItemView[]>> {
    const items = await listSavedItems(userId, { limit });
    return items.reduce<Record<string, SavedItemView[]>>((acc, item) => {
        acc[item.entityType] = [...(acc[item.entityType] ?? []), item];
        return acc;
    }, {});
}

export async function countSavedItems(userId: string): Promise<number> {
    return countSavedItemsForUser(userId);
}

export interface ToggleSavedInput {
    userId: string;
    entityType: string;
    entityId: string;
    entityName: string;
    entitySlug: string;
    note?: string;
}

/**
 * Adds or removes a shortlist entry and keeps the denormalised college counter
 * in step. Returns the resulting state so the UI can flip its label.
 */
export async function toggleSavedItem(input: ToggleSavedInput): Promise<{ saved: boolean }> {
    const existing = await findSavedItem(input.userId, input.entityType, input.entityId);

    if (existing) {
        await deleteSavedItemByEntity(input.userId, input.entityType, input.entityId);
        if (input.entityType === 'college') {
            await adjustCollegeSavedCount(input.entityId, -1);
        }
        return { saved: false };
    }

    await createSavedItem({
        user: input.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        entitySlug: input.entitySlug,
        note: input.note,
    });

    if (input.entityType === 'college') {
        await adjustCollegeSavedCount(input.entityId, 1);
    }

    return { saved: true };
}

export async function removeSavedItem(userId: string, id: string): Promise<boolean> {
    return deleteSavedItem(userId, id);
}

/**
 * Removes every shortlist entry for a user (account closure).
 *
 * The denormalised `College.savedCount` counters are decremented first, so
 * closing an account cannot leave colleges permanently over-reporting how many
 * students shortlisted them.
 */
export async function purgeSavedItems(userId: string): Promise<number> {
    const collegeRows = await listSavedItemsForUser(userId, {
        entityType: 'college',
        limit: 500,
    });

    await Promise.all(
        collegeRows.map((row) => adjustCollegeSavedCount(String(row.entityId), -1)),
    );

    return deleteAllSavedItemsForUser(userId);
}
