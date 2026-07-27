import 'server-only';
import {
    createMediaAsset,
    findMediaAsset,
    mediaFolders,
    paginateMedia,
    softDeleteMediaAsset,
    updateMediaAsset,
    type MediaListArgs,
} from '@/db/repositories/site.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { deleteFile } from '@/lib/storage';
import type { MediaAssetDoc } from '@/db/models/site.model';
import type { Paginated } from '@/types/common';

export interface MediaLibraryData {
    result: Paginated<MediaAssetDoc>;
    folders: string[];
}

export async function getMediaLibrary(args: MediaListArgs): Promise<MediaLibraryData> {
    const [result, folders] = await Promise.all([paginateMedia(args), mediaFolders()]);
    return { result: toPlain(result), folders };
}

export async function getMediaAsset(id: string): Promise<MediaAssetDoc | null> {
    const asset = await findMediaAsset(id);
    return asset ? toPlain(asset) : null;
}

export async function registerUploadedAsset(values: {
    fileName: string;
    originalName: string;
    url: string;
    secureUrl?: string;
    provider: 'local' | 'cloudinary' | 's3';
    providerPublicId?: string;
    mimeType: string;
    kind: 'image' | 'document' | 'video' | 'other';
    sizeBytes: number;
    width?: number;
    height?: number;
    folder?: string;
    tags?: string[];
    altText?: string;
    uploadedBy?: string;
}): Promise<MediaAssetDoc> {
    const created = await createMediaAsset({ folder: '/', ...values });
    return toPlain(created);
}

export async function updateAssetMetadata(
    id: string,
    values: { altText?: string; caption?: string; folder?: string; tags?: string[] },
): Promise<void> {
    await updateMediaAsset(id, values);
}

export type RemoveAssetResult =
    | { ok: true; originalName: string }
    | { ok: false; code: 'NOT_FOUND' | 'IN_USE'; reason: string; usageCount: number };

/**
 * Deletes the stored file and soft-deletes the library row.
 *
 * Media referenced by published content is never removed, so pages cannot end up
 * pointing at a missing file. The row itself is only soft-deleted, which keeps
 * the audit trail and lets an operator recover a mistake. Storage failures are
 * swallowed on purpose: an orphaned remote object must not block the delete.
 * Callers surface `reason` and switch on `code`.
 */
export async function removeAsset(id: string, actorId?: string): Promise<RemoveAssetResult> {
    const asset = await findMediaAsset(id);
    if (!asset) {
        return { ok: false, code: 'NOT_FOUND', reason: 'Media asset not found.', usageCount: 0 };
    }

    if (asset.usageCount > 0) {
        return {
            ok: false,
            code: 'IN_USE',
            reason: `This asset is used in ${asset.usageCount} place(s). Replace those references before deleting.`,
            usageCount: asset.usageCount,
        };
    }

    await deleteFile({ provider: asset.provider, providerPublicId: asset.providerPublicId }).catch(
        () => undefined,
    );

    await softDeleteMediaAsset(id, actorId);

    return { ok: true, originalName: asset.originalName };
}
