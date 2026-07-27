import 'server-only';
import { cache } from 'react';
import {
    getPublicSettings,
    listEditableSettings,
    upsertSetting,
} from '@/db/repositories/settings.repository';
import { SETTING_DEFAULTS } from '@/config/settings-schema';
import { readSubmittedSettingValue } from '@/lib/settings-payload';
import { sanitizeRichText } from '@/lib/html/sanitize';
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

/* -------------------------------- admin write ----------------------------- */

export type SaveSettingsResult =
    | {
        ok: true;
        updated: number;
        previous: Record<string, unknown>;
        next: Record<string, unknown>;
    }
    | { ok: false; code: 'INVALID_JSON'; key: string; label: string };

/**
 * Persists a batch of settings.
 *
 * Iterates the stored, non-secret definitions instead of the submitted keys, so
 * an unknown or secret key in the payload is ignored, and coerces each value to
 * its declared `valueType`. Returns the before/after maps for the audit record.
 */
export async function saveSettings(
    values: Record<string, unknown>,
    actorId?: string,
): Promise<SaveSettingsResult> {
    const definitions = await listEditableSettings();

    let updated = 0;
    const previous: Record<string, unknown> = {};
    const next: Record<string, unknown> = {};

    for (const definition of definitions) {
        const submitted = readSubmittedSettingValue(values, definition.key);
        if (!submitted.found) continue;

        const key = definition.key;
        const raw = submitted.value;

        let value: unknown = raw;
        if (definition.valueType === 'boolean') value = raw === true || raw === 'true' || raw === 'on';
        else if (definition.valueType === 'number') value = Number(raw);
        else if (definition.valueType === 'json' && typeof raw === 'string') {
            try {
                value = JSON.parse(raw) as unknown;
            } catch {
                return { ok: false, code: 'INVALID_JSON', key, label: definition.label };
            }
        } else if (definition.valueType === 'richtext') {
            // Public settings are rendered as HTML (the footer summary), so the
            // same allow-list that guards resource content has to apply here.
            value = sanitizeRichText(raw) ?? '';
        } else value = typeof raw === 'string' ? raw : String(raw ?? '');

        previous[key] = definition.value;
        next[key] = value;

        await upsertSetting(key, value, actorId);
        updated += 1;
    }

    return { ok: true, updated, previous, next };
}
