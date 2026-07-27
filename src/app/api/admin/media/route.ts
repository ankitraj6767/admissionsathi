import { NextResponse, type NextRequest } from 'next/server';
import { getMediaLibrary } from '@/services/media.service';
import { getCurrentActor } from '@/lib/auth/session';
import { can } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Media library listing for the admin picker.
 *
 * A Route Handler rather than a Server Action because the picker searches and
 * pages as the user types — that is a read that wants to be cancellable and
 * cacheable per query, which `fetch` gives us and an action does not.
 */
export async function GET(request: NextRequest) {
    const actor = await getCurrentActor();
    if (!actor) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (!can(actor, 'media.read')) {
        return NextResponse.json({ error: 'You cannot browse the media library.' }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;

    try {
        const { result, folders } = await getMediaLibrary({
            q: params.get('q')?.slice(0, 80) || undefined,
            folder: params.get('folder')?.slice(0, 120) || undefined,
            kind: params.get('kind')?.slice(0, 20) || undefined,
            page: Number(params.get('page')) || 1,
            pageSize: 24,
        });

        return NextResponse.json({
            items: result.items.map((asset) => ({
                id: String(asset._id),
                url: asset.url,
                fileName: asset.fileName,
                originalName: asset.originalName,
                kind: asset.kind,
                mimeType: asset.mimeType,
                sizeBytes: asset.sizeBytes,
                width: asset.width,
                height: asset.height,
                altText: asset.altText,
                folder: asset.folder,
            })),
            page: result.page,
            totalPages: result.totalPages,
            total: result.total,
            folders,
        });
    } catch (error) {
        logger.error('media.list_failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Could not load the media library.' }, { status: 500 });
    }
}
