import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Next.js 16 requires a cache-life profile with `revalidateTag`.
 * These wrappers keep every call site consistent (and easy to change later).
 */
export function invalidateTag(tag: string): void {
    revalidateTag(tag, 'max');
}

export function invalidateTags(tags: string[]): void {
    tags.forEach((tag) => revalidateTag(tag, 'max'));
}

export function invalidatePaths(paths: string[]): void {
    paths.forEach((path) => revalidatePath(path));
}
