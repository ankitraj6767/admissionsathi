import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '@/lib/env';
import { slugify } from '@/lib/utils';

/**
 * Storage adapter.
 * `local` writes into /public/uploads (development). `cloudinary` and `s3` use
 * signed uploads. The interface is identical so callers never change.
 */
export interface StoredFile {
    url: string;
    provider: 'local' | 'cloudinary' | 's3';
    providerPublicId?: string;
    fileName: string;
    sizeBytes: number;
    mimeType: string;
    width?: number;
    height?: number;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'];
export const ALLOWED_DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOC_BYTES = 15 * 1024 * 1024;

export function fileKind(mimeType: string): 'image' | 'document' | 'video' | 'other' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (ALLOWED_DOC_TYPES.includes(mimeType)) return 'document';
    return 'other';
}

/** Validates MIME type and size before anything touches storage. */
export function validateUpload(file: { type: string; size: number; name: string }): string | null {
    const kind = fileKind(file.type);

    if (kind === 'image') {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Unsupported image type.';
        if (file.size > MAX_IMAGE_BYTES) return 'Images must be 5 MB or smaller.';
        return null;
    }

    if (kind === 'document') {
        if (file.size > MAX_DOC_BYTES) return 'Documents must be 15 MB or smaller.';
        return null;
    }

    return 'This file type is not allowed.';
}

function safeName(original: string): string {
    const ext = path.extname(original).toLowerCase().slice(0, 8);
    const base = slugify(path.basename(original, path.extname(original))).slice(0, 60) || 'file';
    return `${base}-${Date.now().toString(36)}${ext}`;
}

/** True when running on a serverless host with a read-only filesystem. */
function isEphemeralFilesystem(): boolean {
    return Boolean(process.env.VERCEL) || env.NODE_ENV === 'production';
}

async function uploadLocal(file: File, folder: string): Promise<StoredFile> {
    /*
     * Fail loudly rather than with a raw `EROFS` deep inside fs/promises.
     * On Vercel the filesystem is read-only apart from /tmp, and anything
     * written there vanishes with the invocation — so a "successful" local
     * upload would leave a media record pointing at a URL that 404s forever.
     */
    if (isEphemeralFilesystem()) {
        throw new Error(
            'Local file storage cannot be used on this host: the filesystem is ephemeral, so uploads would be lost. ' +
            'Set STORAGE_PROVIDER=cloudinary and configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
        );
    }

    const fileName = safeName(file.name);
    const relativeDir = path.posix.join('uploads', folder.replace(/^\/+|\.\./g, ''));
    const absoluteDir = path.join(process.cwd(), 'public', relativeDir);

    await mkdir(absoluteDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(absoluteDir, fileName), buffer);

    return {
        url: `/${relativeDir}/${fileName}`,
        provider: 'local',
        fileName,
        sizeBytes: file.size,
        mimeType: file.type,
    };
}

async function uploadCloudinary(file: File, folder: string): Promise<StoredFile> {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary credentials are not configured.');
    }

    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    const uploaded = await cloudinary.uploader.upload(dataUri, {
        folder: `admission-sathi/${folder.replace(/^\/+/, '')}`,
        resource_type: 'auto',
    });

    return {
        url: uploaded.secure_url,
        provider: 'cloudinary',
        providerPublicId: uploaded.public_id,
        fileName: uploaded.original_filename ?? safeName(file.name),
        sizeBytes: uploaded.bytes ?? file.size,
        mimeType: file.type,
        width: uploaded.width,
        height: uploaded.height,
    };
}

export async function uploadFile(file: File, folder = '/'): Promise<StoredFile> {
    if (env.STORAGE_PROVIDER === 'cloudinary') return uploadCloudinary(file, folder);

    if (env.STORAGE_PROVIDER === 's3') {
        // No S3 adapter yet. Say so instead of quietly writing to a local path
        // the operator believes is a bucket.
        throw new Error(
            'STORAGE_PROVIDER=s3 is not implemented yet. Use STORAGE_PROVIDER=cloudinary, or local for development.',
        );
    }

    return uploadLocal(file, folder);
}

export async function deleteFile(stored: {
    provider: string;
    providerPublicId?: string;
}): Promise<void> {
    if (stored.provider === 'cloudinary' && stored.providerPublicId) {
        const { v2: cloudinary } = await import('cloudinary');
        cloudinary.config({
            cloud_name: env.CLOUDINARY_CLOUD_NAME,
            api_key: env.CLOUDINARY_API_KEY,
            api_secret: env.CLOUDINARY_API_SECRET,
            secure: true,
        });
        await cloudinary.uploader.destroy(stored.providerPublicId);
    }
    // Local files are left in place deliberately; the DB record is the source of truth.
}
