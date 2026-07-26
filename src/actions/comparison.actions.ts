'use server';

import { z } from 'zod';
import { saveComparison } from '@/services/comparison.service';
import { getCurrentActor } from '@/lib/auth/session';
import { fail, runAction, succeed } from '@/lib/action-helpers';
import type { ActionResult } from '@/types/common';

const saveComparisonSchema = z.object({
    slugs: z.array(z.string().min(1).max(160)).min(2, 'Select at least two colleges').max(4),
    title: z.string().max(200).optional(),
    anonymousId: z.string().max(80).optional(),
});

/** Persists the comparison and returns a short share id. */
export async function saveComparisonAction(
    input: unknown,
): Promise<ActionResult<{ shareId: string }>> {
    return runAction({ action: 'comparison.save' }, async () => {
        const parsed = saveComparisonSchema.safeParse(input);
        if (!parsed.success) {
            return fail('Select at least two colleges to share a comparison.', 'VALIDATION');
        }

        const actor = await getCurrentActor();
        const shareId = await saveComparison({
            slugs: parsed.data.slugs,
            title: parsed.data.title,
            userId: actor?.id,
            anonymousId: parsed.data.anonymousId,
        });

        return succeed({ shareId }, 'Comparison saved.');
    });
}
