'use server';

import { revalidatePath } from 'next/cache';
import { Types } from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from '@/db/connect';
import { MediaAsset } from '@/db/models/site.model';
import { deleteFile } from '@/lib/storage';
import { requirePermission } from '@/lib/auth/session';
import { recordAudit } from '@/services/audit.service';
import { NotFoundError, fail, runAction, succeed } from '@/lib/action-helpers';
import type { ActionResult } from '@/types/common';

/** Soft-deletes a media asset. Assets referenced elsewhere are protected. */
export async function deleteMediaAction(id: string): Promise<ActionResult<{ id: string }>> {
    return runAction({ action: 'admin.media.delete' }, async () => {
        const actor = await requirePermission('media.manage');
        await connectToDatabase();

        const asset = await MediaAsset.findById(id).exec();
        if (!asset) throw new NotFoundError('Media asset not found.');

        if (asset.usageCount > 0) {
            return fail(
                `This asset is used in ${asset.usageCount} place(s). Replace those references before deleting.`,
                'CONFLICT',
            );
        }

        await deleteFile({ provider: asset.provider, providerPublicId: asset.providerPublicId }).catch(
            () => undefined,
        );

        asset.isDeleted = true;
        asset.deletedAt = new Date();
        asset.deletedBy = new Types.ObjectId(actor.id);
        await asset.save();

        await recordAudit({
            actor,
            action: 'media.delete',
            entity: 'MediaAsset',
            entityId: id,
            entityLabel: asset.originalName,
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

        await connectToDatabase();
        await MediaAsset.updateOne(
            { _id: data.id },
            {
                $set: {
                    altText: data.altText,
                    caption: data.caption,
                    tags: data.tags,
                    folder: data.folder,
                },
            },
        ).exec();

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
