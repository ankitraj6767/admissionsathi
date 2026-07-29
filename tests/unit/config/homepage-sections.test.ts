import { describe, expect, it } from 'vitest';
import { HOMEPAGE_SECTION_KEYS } from '@/config/constants';
import { HOMEPAGE_DRAFT_MAP, HOMEPAGE_SECTION_DRAFTS } from '@/config/homepage-defaults';
import { HOMEPAGE_CONFIG_SCHEMAS, parseSectionConfig, safeSectionConfig } from '@/schemas/homepage.schema';

/**
 * Registry integrity for the homepage builder.
 *
 * A section key is a three-way contract: the enum, a config schema, and a packaged
 * draft. `loan_promo` once existed as a database row with none of the three, which
 * left it listed in the admin, un-editable (the action's `z.enum` rejected the key)
 * and never rendered. These tests make that class of drift a failing build.
 */
describe('homepage section registry', () => {
    it('gives every key a config schema', () => {
        const missing = HOMEPAGE_SECTION_KEYS.filter((key) => !(key in HOMEPAGE_CONFIG_SCHEMAS));
        expect(missing).toEqual([]);
    });

    it('gives every key a packaged draft', () => {
        const missing = HOMEPAGE_SECTION_KEYS.filter((key) => !HOMEPAGE_DRAFT_MAP[key]);
        expect(missing).toEqual([]);
    });

    it('has no schema for a key that is not in the enum', () => {
        const orphans = Object.keys(HOMEPAGE_CONFIG_SCHEMAS).filter(
            (key) => !(HOMEPAGE_SECTION_KEYS as readonly string[]).includes(key),
        );
        expect(orphans).toEqual([]);
    });

    it('has no draft for a key that is not in the enum', () => {
        const orphans = HOMEPAGE_SECTION_DRAFTS.map((d) => d.key).filter(
            (key) => !(HOMEPAGE_SECTION_KEYS as readonly string[]).includes(key),
        );
        expect(orphans).toEqual([]);
    });

    it('declares each key exactly once', () => {
        expect(new Set(HOMEPAGE_SECTION_KEYS).size).toBe(HOMEPAGE_SECTION_KEYS.length);
    });

    it('declares each draft exactly once', () => {
        const keys = HOMEPAGE_SECTION_DRAFTS.map((d) => d.key);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('gives every draft a unique display order, so the builder list is deterministic', () => {
        const orders = HOMEPAGE_SECTION_DRAFTS.map((d) => d.displayOrder);
        expect(new Set(orders).size).toBe(orders.length);
    });

    it('gives every draft a human-readable name for the builder row', () => {
        for (const draft of HOMEPAGE_SECTION_DRAFTS) {
            expect(draft.name.length, `${draft.key} needs a name`).toBeGreaterThan(3);
        }
    });
});

describe('packaged draft configs', () => {
    it.each(HOMEPAGE_SECTION_DRAFTS.map((d) => [d.key, d] as const))(
        'validates the %s draft against its own schema',
        (key, draft) => {
            expect(() =>
                parseSectionConfig(key as keyof typeof HOMEPAGE_CONFIG_SCHEMAS, draft.config),
            ).not.toThrow();
        },
    );

    it('falls back to the draft rather than throwing on a corrupt stored config', () => {
        const config = safeSectionConfig('featured_colleges', { limit: 'not-a-number' }, {
            limit: 6,
            collegeSlugs: [],
        });
        expect(config.limit).toBe(6);
    });

    it('applies schema defaults for a section stored with an empty config', () => {
        const config = safeSectionConfig('faq', {}, {});
        expect(config).toMatchObject({ limit: 6, scope: 'homepage', emitStructuredData: true });
    });
});

describe('sections that must ship enabled', () => {
    /** Turning any of these off would leave the page without its primary content. */
    const required = ['hero', 'top_courses', 'college_predictor', 'platform_stats'] as const;

    it.each(required)('%s is enabled by default', (key) => {
        expect(HOMEPAGE_DRAFT_MAP[key]?.isEnabled).toBe(true);
    });

    it('ships the app download band disabled until store links exist', () => {
        expect(HOMEPAGE_DRAFT_MAP.app_download?.isEnabled).toBe(false);
    });
});
