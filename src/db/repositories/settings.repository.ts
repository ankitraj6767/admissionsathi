import 'server-only';
import { connectToDatabase } from '@/db/connect';
import { SiteSetting, type SiteSettingDoc } from '@/db/models/site.model';
import { findLean, findOneLean } from './base.repository';

export type SettingsMap = Record<string, unknown>;

/** All public settings as a flat key → value map. */
export async function getPublicSettings(): Promise<SettingsMap> {
    const rows = await findLean<SiteSettingDoc>(
        SiteSetting,
        { isPublic: true, isSecret: false },
        { projection: { key: 1, value: 1 }, limit: 500, sort: { displayOrder: 1 } },
    );
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getSettingsByGroup(group: string): Promise<SiteSettingDoc[]> {
    return findLean<SiteSettingDoc>(SiteSetting, { group }, { sort: { displayOrder: 1 }, limit: 200 });
}

export async function getAllSettings(): Promise<SiteSettingDoc[]> {
    return findLean<SiteSettingDoc>(SiteSetting, {}, { sort: { displayOrder: 1 }, limit: 500 });
}

/**
 * Definitions an admin is allowed to edit.
 * Secrets are excluded here rather than in the caller so a submitted payload can
 * never reach a secret row.
 */
export async function listEditableSettings(): Promise<SiteSettingDoc[]> {
    return findLean<SiteSettingDoc>(
        SiteSetting,
        { isSecret: false },
        { sort: { displayOrder: 1 }, limit: 500 },
    );
}

/**
 * Raw value of a single setting, including non-public ones.
 * Used for server-side settings (like the AI system prompt) that must never be
 * exposed through the public settings map.
 */
export async function findSettingValue(key: string): Promise<unknown> {
    const row = await findOneLean<SiteSettingDoc>(SiteSetting, { key }, { projection: { value: 1 } });
    return row?.value;
}

export async function upsertSetting(
    key: string,
    value: unknown,
    updatedBy?: string,
): Promise<void> {
    await connectToDatabase();
    await SiteSetting.updateOne({ key }, { $set: { value, updatedBy } }).exec();
}
