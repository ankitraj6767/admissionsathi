'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { connectToDatabase } from '@/db/connect';
import { SavedItem } from '@/db/models/system.model';
import { College } from '@/db/models/college.model';
import { getCurrentActor } from '@/lib/auth/session';
import { fail, runAction, succeed } from '@/lib/action-helpers';
import type { ActionResult } from '@/types/common';

const savedItemSchema = z.object({
    entityType: z.enum(['college', 'course', 'exam', 'article', 'scholarship', 'comparison', 'resource']),
    entityId: z.string().min(1),
    entityName: z.string().min(1).max(240),
    entitySlug: z.string().min(1).max(160),
    note: z.string().max(600).optional(),
});

/** Toggles a saved item for the signed-in user. */
export async function toggleSavedItemAction(
    input: unknown,
): Promise<ActionResult<{ saved: boolean }>> {
    return runAction({ action: 'saved.toggle' }, async () => {
        const actor = await getCurrentActor();
        if (!actor) {
            return fail('Please sign in to save items to your dashboard.', 'UNAUTHENTICATED');
        }

        const data = savedItemSchema.parse(input);
        await connectToDatabase();

        const existing = await SavedItem.findOne({
            user: actor.id,
            entityType: data.entityType,
            entityId: data.entityId,
        })
            .select('_id')
            .lean()
            .exec();

        if (existing) {
            await SavedItem.deleteOne({ _id: existing._id }).exec();
            if (data.entityType === 'college') {
                await College.updateOne({ _id: data.entityId }, { $inc: { savedCount: -1 } }).exec();
            }
            revalidatePath('/dashboard/saved');
            return succeed({ saved: false }, 'Removed from your saved items.');
        }

        await SavedItem.create({
            user: actor.id,
            entityType: data.entityType,
            entityId: data.entityId,
            entityName: data.entityName,
            entitySlug: data.entitySlug,
            note: data.note,
        });

        if (data.entityType === 'college') {
            await College.updateOne({ _id: data.entityId }, { $inc: { savedCount: 1 } }).exec();
        }

        revalidatePath('/dashboard/saved');
        return succeed({ saved: true }, 'Saved to your dashboard.');
    });
}

export async function removeSavedItemAction(id: string): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'saved.remove' }, async () => {
        const actor = await getCurrentActor();
        if (!actor) return fail('Please sign in to continue.', 'UNAUTHENTICATED');

        await connectToDatabase();
        await SavedItem.deleteOne({ _id: id, user: actor.id }).exec();
        revalidatePath('/dashboard/saved');
        return succeed({ id }, 'Removed.');
    });
}
