import 'server-only';
import { cache } from 'react';
import { HomepageSection, type HomepageSectionDoc } from '@/db/models/site.model';
import { findLean, toPlain } from '@/db/repositories/base.repository';
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
            rows = await findLean<HomepageSectionDoc>(HomepageSection, {}, { sort: { displayOrder: 1 }, limit: 40 });
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
    const rows = await findLean<HomepageSectionDoc>(
        HomepageSection,
        {},
        { sort: { displayOrder: 1 }, limit: 40 },
    );
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
