import 'server-only';
import { cache } from 'react';
import type { HomepageSectionDoc } from '@/db/models/site.model';
import { toPlain } from '@/db/repositories/base.repository';
import {
    findHomepageSection,
    listHomepageSections,
    publishHomepageSectionDraft,
    setHomepageSectionOrder,
    upsertHomepageSection,
} from '@/db/repositories/site.repository';
import { HOMEPAGE_DRAFT_MAP, HOMEPAGE_SECTION_DRAFTS } from '@/config/homepage-defaults';
import { HOMEPAGE_SECTION_KEYS, type HomepageSectionKey } from '@/config/constants';
import { safeSectionConfig } from '@/schemas/homepage.schema';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import { logger } from '@/lib/logger';

export interface ResolvedSection<TConfig = Record<string, unknown>> {
    key: HomepageSectionKey;
    name: string;
    isEnabled: boolean;
    displayOrder: number;
    heading?: string;
    subheading?: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    config: TConfig;
}

export type SectionMap = Record<HomepageSectionKey, ResolvedSection>;

function resolve(
    key: HomepageSectionKey,
    row: HomepageSectionDoc | undefined,
    preview: boolean,
): ResolvedSection {
    const draft = HOMEPAGE_DRAFT_MAP[key];
    const rawConfig = preview ? (row?.draftConfig ?? row?.config) : row?.config;

    return {
        key,
        name: row?.name ?? draft?.name ?? key,
        isEnabled: row?.isEnabled ?? draft?.isEnabled ?? true,
        displayOrder: row?.displayOrder ?? draft?.displayOrder ?? 99,
        heading: row?.heading ?? draft?.heading,
        subheading: row?.subheading ?? draft?.subheading,
        description: row?.description ?? draft?.description,
        ctaLabel: row?.ctaLabel ?? draft?.ctaLabel,
        ctaUrl: row?.ctaUrl ?? draft?.ctaUrl,
        config: safeSectionConfig(
            key as keyof typeof import('@/schemas/homepage.schema').HOMEPAGE_CONFIG_SCHEMAS,
            rawConfig,
            draft?.config ?? {},
        ) as Record<string, unknown>,
    };
}

const loadSections = cached(
    async (previewFlag: string): Promise<SectionMap> => {
        const preview = previewFlag === 'preview';
        let rows: HomepageSectionDoc[] = [];
        try {
            rows = await listHomepageSections(40);
        } catch (error) {
            logger.error('homepage.sections_load_failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        const byKey = new Map(rows.map((r) => [r.key, r]));
        const map = {} as SectionMap;
        for (const key of HOMEPAGE_SECTION_KEYS) {
            map[key] = resolve(key, byKey.get(key), preview);
        }
        return toPlain(map);
    },
    ['homepage-sections'],
    { tags: [CACHE_TAGS.homepage], revalidate: CACHE_TTL.medium },
);

export const getHomepageSections = cache(
    async (preview = false): Promise<SectionMap> => loadSections(preview ? 'preview' : 'live'),
);

/** Ordered, enabled sections — drives the render order of the homepage. */
export function orderedEnabledSections(map: SectionMap): ResolvedSection[] {
    return Object.values(map)
        .filter((s) => s.isEnabled)
        .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getSection<TConfig>(map: SectionMap, key: HomepageSectionKey) {
    return map[key] as ResolvedSection<TConfig>;
}

/** Admin: full rows including draft state (no cache). */
export async function getHomepageSectionRows(): Promise<HomepageSectionDoc[]> {
    const rows = await listHomepageSections(40);
    if (rows.length > 0) return toPlain(rows);
    // Not seeded yet — surface the drafts so the builder is still usable.
    return HOMEPAGE_SECTION_DRAFTS.map(
        (d) =>
            ({
                _id: d.key,
                key: d.key,
                name: d.name,
                isEnabled: d.isEnabled,
                displayOrder: d.displayOrder,
                heading: d.heading,
                subheading: d.subheading,
                description: d.description,
                ctaLabel: d.ctaLabel,
                ctaUrl: d.ctaUrl,
                config: d.config,
                hasUnpublishedChanges: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }) as unknown as HomepageSectionDoc,
    );
}

/* ------------------------------- admin writes ----------------------------- */

export interface SaveHomepageSectionInput {
    key: string;
    isEnabled?: boolean;
    heading?: string;
    subheading?: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    /** Already validated against the section's own config schema by the caller. */
    config?: Record<string, unknown>;
    saveAsDraft?: boolean;
    actorId: string;
}

export interface SavedHomepageSection {
    /** Resolved display name, used as the audit label. */
    name: string;
    /** Absent when the section row did not exist yet. */
    previous?: { heading?: string; isEnabled: boolean };
}

/**
 * Writes section copy and config.
 * Owns the "stored value, else packaged default, else key" name resolution and
 * the draft-vs-publish branch so the Server Action only validates and audits.
 */
export async function saveHomepageSection(
    input: SaveHomepageSectionInput,
): Promise<SavedHomepageSection> {
    const draft = HOMEPAGE_DRAFT_MAP[input.key];
    const previous = await findHomepageSection(input.key);

    const values: Record<string, unknown> = {
        name: previous?.name ?? draft?.name ?? input.key,
        updatedBy: input.actorId,
    };
    if (input.isEnabled !== undefined) values.isEnabled = input.isEnabled;
    if (input.heading !== undefined) values.heading = input.heading;
    if (input.subheading !== undefined) values.subheading = input.subheading;
    if (input.description !== undefined) values.description = input.description;
    if (input.ctaLabel !== undefined) values.ctaLabel = input.ctaLabel;
    if (input.ctaUrl !== undefined) values.ctaUrl = input.ctaUrl;

    if (input.config) {
        if (input.saveAsDraft) {
            values.draftConfig = input.config;
            values.hasUnpublishedChanges = true;
        } else {
            values.config = input.config;
            values.draftConfig = undefined;
            values.hasUnpublishedChanges = false;
            values.publishedAt = new Date();
        }
    }

    await upsertHomepageSection(input.key, values, { displayOrder: draft?.displayOrder ?? 99 });

    return {
        name: values.name as string,
        previous: previous ? { heading: previous.heading, isEnabled: previous.isEnabled } : undefined,
    };
}

/** Drag-and-drop order. Positions are spaced by 10 so single inserts stay cheap. */
export async function reorderHomepageSections(
    order: string[],
    actorId?: string,
): Promise<void> {
    await setHomepageSectionOrder(
        order.map((key, index) => ({ key, displayOrder: (index + 1) * 10 })),
        actorId,
    );
}

export async function setHomepageSectionEnabled(
    key: HomepageSectionKey,
    isEnabled: boolean,
    actorId?: string,
): Promise<void> {
    const draft = HOMEPAGE_DRAFT_MAP[key];
    await upsertHomepageSection(
        key,
        { isEnabled, updatedBy: actorId },
        { name: draft?.name ?? key, displayOrder: draft?.displayOrder ?? 99 },
    );
}

/** Promotes a saved draft config to the live homepage. */
export async function publishSectionDraft(
    key: HomepageSectionKey,
    actorId?: string,
): Promise<'published' | 'no_draft' | 'not_found'> {
    return publishHomepageSectionDraft(key, actorId);
}

/**
 * Restores a section to the packaged default configuration.
 * Returns `false` for a key that has no packaged default, so the caller can
 * report an unknown section instead of writing an empty row.
 */
export async function resetHomepageSection(
    key: HomepageSectionKey,
    actorId?: string,
): Promise<boolean> {
    const draft = HOMEPAGE_DRAFT_MAP[key];
    if (!draft) return false;

    await upsertHomepageSection(key, {
        name: draft.name,
        isEnabled: draft.isEnabled,
        displayOrder: draft.displayOrder,
        heading: draft.heading,
        subheading: draft.subheading,
        description: draft.description,
        ctaLabel: draft.ctaLabel,
        ctaUrl: draft.ctaUrl,
        config: draft.config,
        draftConfig: undefined,
        hasUnpublishedChanges: false,
        updatedBy: actorId,
    });

    return true;
}
