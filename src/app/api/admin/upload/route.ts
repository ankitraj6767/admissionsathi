import { NextResponse, type NextRequest } from 'next/server';
import { connectToDatabase } from '@/db/connect';
import { MediaAsset } from '@/db/models/site.model';
import { fileKind, uploadFile, validateUpload } from '@/lib/storage';
import { getCurrentActor } from '@/lib/auth/session';
import { can } from '@/lib/auth/rbac';
import { recordAudit } from '@/services/audit.service';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Authenticated media upload.
 * A Route Handler (not a Server Action) because it streams multipart file data.
 * Validation runs before storage; the DB record is written after a successful upload.
 */
export async function POST(request: NextRequest) {
    const actor = await getCurrentActor();
    if (!actor) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (!can(actor, 'media.manage')) {
        return NextResponse.json({ error: 'You do not have permission to upload media.' }, { status: 403 });
    }

    const limited = await rateLimit({ key: 'media:upload', limit: 40, windowSeconds: 600, identifier: actor.id });
    if (!limited.success) {
        return NextResponse.json({ error: 'Upload limit reached. Try again shortly.' }, { status: 429 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const folder = String(formData.get('folder') ?? '/');
        const altText = String(formData.get('altText') ?? '');
        const tags = String(formData.get('tags') ?? '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file received.' }, { status: 400 });
        }

        const validationError = validateUpload({ type: file.type, size: file.size, name: file.name });
        if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

        const stored = await uploadFile(file, folder);

        await connectToDatabase();
        const asset = await MediaAsset.create({
            fileName: stored.fileName,
            originalName: file.name,
            url: stored.url,
            secureUrl: stored.url,
            provider: stored.provider,
            providerPublicId: stored.providerPublicId,
            mimeType: stored.mimeType,
            kind: fileKind(stored.mimeType),
            sizeBytes: stored.sizeBytes,
            width: stored.width,
            height: stored.height,
            folder,
            tags,
            altText: altText || undefined,
            uploadedBy: actor.id,
        });

        await recordAudit({
            actor,
            action: 'media.upload',
            entity: 'MediaAsset',
            entityId: String(asset._id),
            entityLabel: file.name,
            newValues: { url: stored.url, sizeBytes: stored.sizeBytes, provider: stored.provider },
        });

        return NextResponse.json({
            asset: {
                id: String(asset._id),
                url: asset.url,
                fileName: asset.fileName,
                kind: asset.kind,
                sizeBytes: asset.sizeBytes,
            },
        });
    } catch (error) {
        logger.error('media.upload_failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
    }
}
