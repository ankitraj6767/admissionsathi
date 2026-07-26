import 'server-only';
import { connectToDatabase } from '@/db/connect';
import { SiteSetting, type SiteSettingDoc } from '@/db/models/site.model';
import { findLean } from './base.repository';

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

export async function upsertSetting(
    key: string,
    value: unknown,
    updatedBy?: string,
): Promise<void> {
    await connectToDatabase();
    await SiteSetting.updateOne({ key }, { $set: { value, updatedBy } }).exec();
}
