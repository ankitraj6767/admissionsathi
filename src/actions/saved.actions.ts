'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { removeSavedItem, toggleSavedItem } from '@/services/saved.service';
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

        const { saved } = await toggleSavedItem({ userId: actor.id, ...data });

        revalidatePath('/dashboard/saved');
        return saved
            ? succeed({ saved: true }, 'Saved to your dashboard.')
            : succeed({ saved: false }, 'Removed from your saved items.');
    });
}

export async function removeSavedItemAction(id: string): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'saved.remove' }, async () => {
        const actor = await getCurrentActor();
        if (!actor) return fail('Please sign in to continue.', 'UNAUTHENTICATED');

        // Owner-scoped inside the service so a stolen id cannot delete another user's row.
        await removeSavedItem(actor.id, id);
        revalidatePath('/dashboard/saved');
        return succeed({ id }, 'Removed.');
    });
}
