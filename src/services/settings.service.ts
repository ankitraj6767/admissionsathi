import 'server-only';
import { cache } from 'react';
import { getPublicSettings } from '@/db/repositories/settings.repository';
import { SETTING_DEFAULTS } from '@/config/settings-schema';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import { logger } from '@/lib/logger';

export type PublicSettings = Record<string, unknown>;

const loadPublicSettings = cached(
    async (): Promise<PublicSettings> => {
        try {
            const stored = await getPublicSettings();
            return { ...SETTING_DEFAULTS, ...stored };
        } catch (error) {
            // The site must still render if MongoDB is unreachable.
            logger.error('settings.load_failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return { ...SETTING_DEFAULTS };
        }
    },
    ['public-settings'],
    { tags: [CACHE_TAGS.settings], revalidate: CACHE_TTL.long },
);

/** Memoised per request, cached across requests via the data cache. */
export const getSettings = cache(async (): Promise<PublicSettings> => loadPublicSettings());

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
    const settings = await getSettings();
    const value = settings[key];
    return (value === undefined || value === null ? fallback : value) as T;
}

export function readSetting<T>(settings: PublicSettings, key: string, fallback: T): T {
    const value = settings[key];
    return (value === undefined || value === null ? fallback : value) as T;
}

export function readBool(settings: PublicSettings, key: string, fallback = false): boolean {
    const value = settings[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return fallback;
}

export function readNumber(settings: PublicSettings, key: string, fallback = 0): number {
    const value = settings[key];
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
}

export function readString(settings: PublicSettings, key: string, fallback = ''): string {
    const value = settings[key];
    return typeof value === 'string' && value.length > 0 ? value : fallback;
}
