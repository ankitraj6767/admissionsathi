import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { MediaLibrary, type MediaRow } from '@/components/admin/media-library';
import { connectToDatabase } from '@/db/connect';
import { MediaAsset } from '@/db/models/site.model';
import { toPlain } from '@/db/repositories/base.repository';
import { requirePermissionPage } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Media library' };

export default async function AdminMediaPage() {
    await requirePermissionPage('media.read');
    await connectToDatabase();

    const assets = toPlain(
        await MediaAsset.find().sort({ createdAt: -1 }).limit(120).lean().exec(),
    );

    const rows: MediaRow[] = assets.map((asset) => ({
        id: String(asset._id),
        url: asset.url,
        fileName: asset.fileName,
        originalName: asset.originalName,
        kind: asset.kind,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        folder: asset.folder,
        altText: asset.altText,
        tags: asset.tags ?? [],
        usageCount: asset.usageCount ?? 0,
        createdAt: String(asset.createdAt),
    }));

    return (
        <>
            <AdminPageHeader
                title="Media library"
                description="Upload images and documents, organise them into folders, add alt text and tags. Assets in use are protected from deletion."
                icon="Palette"
                breadcrumbs={[{ label: 'Media library' }]}
            />

            <MediaLibrary assets={rows} />
        </>
    );
}
