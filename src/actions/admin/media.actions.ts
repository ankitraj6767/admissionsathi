'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { removeAsset, updateAssetMetadata } from '@/services/media.service';
import { requirePermission } from '@/lib/auth/session';
import { recordAudit } from '@/services/audit.service';
import { NotFoundError, fail, runAction, succeed } from '@/lib/action-helpers';
import type { ActionResult } from '@/types/common';

/** Soft-deletes a media asset. Assets referenced elsewhere are protected. */
export async function deleteMediaAction(id: string): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'admin.media.delete' }, async () => {
        const actor = await requirePermission('media.manage');

        const result = await removeAsset(id, actor.id);
        if (!result.ok) {
            if (result.code === 'NOT_FOUND') throw new NotFoundError(result.reason);
            return fail(result.reason, 'CONFLICT');
        }

        await recordAudit({
            actor,
            action: 'media.delete',
            entity: 'MediaAsset',
            entityId: id,
            entityLabel: result.originalName,
        });

        revalidatePath('/admin/media');
        return succeed({ id }, 'Media asset deleted.');
    });
}

const updateMediaSchema = z.object({
    id: z.string().min(1),
    altText: z.string().max(300).optional(),
    caption: z.string().max(300).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    folder: z.string().max(120).optional(),
});

export async function updateMediaAction(input: unknown): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'admin.media.update' }, async () => {
        const actor = await requirePermission('media.manage');
        const data = updateMediaSchema.parse(input);

        await updateAssetMetadata(data.id, {
            altText: data.altText,
            caption: data.caption,
            tags: data.tags,
            folder: data.folder,
        });

        await recordAudit({
            actor,
            action: 'media.update',
            entity: 'MediaAsset',
            entityId: data.id,
            newValues: { altText: data.altText, tags: data.tags },
        });

        revalidatePath('/admin/media');
        return succeed({ id: data.id }, 'Media details saved.');
    });
}
