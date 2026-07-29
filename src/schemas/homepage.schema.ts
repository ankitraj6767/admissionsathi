import { z } from 'zod';
import { HOMEPAGE_SECTION_KEYS, THEME_COLORS } from '@/config/constants';

/** Shared primitives */
const tone = z.enum(THEME_COLORS);
const url = z.string().min(1).max(400);
const label = z.string().min(1).max(120);

const imageRefSchema = z.object({
    url: z.string().min(1).max(500),
    alt: z.string().max(300).optional(),
    mediaId: z.string().optional(),
});

const statSchema = z.object({
    label: z.string().min(1).max(60),
    value: z.string().min(1).max(20),
    icon: z.string().max(40).optional(),
    tone: tone.optional(),
});

const linkChipSchema = z.object({ label, url });

const actionCardSchema = z.object({
    title: label,
    subtitle: z.string().max(160).optional(),
    icon: z.string().max(40),
    url,
    tone: tone.optional(),
});

/** hero */
export const heroConfigSchema = z.object({
    eyebrow: z.string().max(80).optional(),
    headingBeforeHighlight: z.string().max(160).optional(),
    highlightText: z.string().max(80).optional(),
    trustStats: z.array(statSchema).max(6).default([]),
    searchTitle: z.string().max(120).optional(),
    searchPlaceholder: z.string().max(160).optional(),
    popularSearchesLabel: z.string().max(60).optional(),
    popularSearches: z.array(linkChipSchema).max(12).default([]),
    heroImage: imageRefSchema.optional(),
    heroImageMobile: imageRefSchema.optional(),
    form: z
        .object({
            title: z.string().max(120),
            subtitle: z.string().max(200).optional(),
            submitLabel: z.string().max(60),
            badges: z.array(z.object({ label: z.string().max(40), icon: z.string().max(40).optional() })).max(4).default([]),
            showEmail: z.boolean().default(false),
            showState: z.boolean().default(true),
            showCity: z.boolean().default(false),
        })
        .optional(),
});

/** quick_actions */
export const quickActionsConfigSchema = z.object({
    cards: z.array(actionCardSchema).max(6).default([]),
});

/** top_courses */
export const topCoursesConfigSchema = z.object({
    limit: z.number().int().min(2).max(16).default(8),
    categorySlugs: z.array(z.string().max(140)).max(16).default([]),
});

/** compare_colleges */
export const compareCollegesConfigSchema = z.object({
    maxColleges: z.number().int().min(2).max(4).default(4),
    defaultCollegeSlugs: z.array(z.string().max(140)).max(4).default([]),
    suggestionLimit: z.number().int().min(0).max(4).default(3),
});

/** college_predictor */
export const collegePredictorConfigSchema = z.object({
    /**
     * Cards shown on the navy strip, excluding the trailing "More" card.
     * 4 keeps a single row of 5 on desktop with titles fully legible; higher
     * values still render, wrapping onto a second row rather than shrinking.
     */
    limit: z.number().int().min(1).max(8).default(4),
    predictorSlugs: z.array(z.string().max(140)).max(12).default([]),
    moreCardLabel: z.string().max(60).default('More Predictors'),
    moreCardCtaLabel: z.string().max(40).default('View All'),
});

/** guidance_tools */
export const guidanceToolsConfigSchema = z.object({
    groups: z
        .array(
            z.object({
                title: label,
                tone: tone.optional(),
                ctaLabel: z.string().max(40).optional(),
                ctaUrl: url.optional(),
                items: z.array(actionCardSchema).max(8).default([]),
            }),
        )
        .max(6)
        .default([]),
});

/** trending */
export const trendingConfigSchema = z.object({
    limit: z.number().int().min(1).max(10).default(4),
    categories: z.array(z.string().max(40)).max(10).default([]),
});

/** ai_assistant */
export const aiAssistantConfigSchema = z.object({
    suggestions: z.array(z.string().max(200)).max(6).default([]),
});

/** whatsapp_community */
export const whatsappConfigSchema = z.object({
    showQr: z.boolean().default(true),
});

/**
 * loan_promo — the compact promo card that sits under the WhatsApp panel.
 *
 * Copy lives on the section row (`heading` / `description` / `ctaLabel`), so this
 * config only carries presentation and the optional figure strip.
 */
export const loanPromoConfigSchema = z.object({
    icon: z.string().max(40).default('Calculator'),
    tone: tone.default('teal'),
    /** Two or three short proof points, e.g. "From 8.5% p.a." */
    highlights: z.array(z.object({ label: z.string().max(40), value: z.string().max(24) })).max(3).default([]),
});

/** featured_colleges */
export const featuredCollegesConfigSchema = z.object({
    limit: z.number().int().min(2).max(12).default(6),
    /** Empty means "whatever is flagged featured", in display order. */
    collegeSlugs: z.array(z.string().max(140)).max(12).default([]),
    showRating: z.boolean().default(true),
    showFees: z.boolean().default(true),
    showPlacement: z.boolean().default(true),
});

/** upcoming_dates */
export const upcomingDatesConfigSchema = z.object({
    limit: z.number().int().min(3).max(12).default(6),
    /** Only key dates (registration, exam, result) rather than every event row. */
    keyDatesOnly: z.boolean().default(true),
    showTentativeBadge: z.boolean().default(true),
});

/** scholarships */
export const scholarshipsConfigSchema = z.object({
    limit: z.number().int().min(2).max(9).default(3),
    scholarshipSlugs: z.array(z.string().max(140)).max(9).default([]),
});

/** student_reviews */
export const studentReviewsConfigSchema = z.object({
    limit: z.number().int().min(2).max(9).default(3),
    minRating: z.number().min(1).max(5).default(4),
    showAggregate: z.boolean().default(true),
});

/** latest_articles */
export const latestArticlesConfigSchema = z.object({
    limit: z.number().int().min(2).max(9).default(3),
    category: z.string().max(80).optional(),
    featuredOnly: z.boolean().default(false),
});

/** counsellors */
export const counsellorsConfigSchema = z.object({
    limit: z.number().int().min(2).max(8).default(4),
    counsellorSlugs: z.array(z.string().max(140)).max(8).default([]),
    showRating: z.boolean().default(true),
});

/** why_choose_us */
export const whyChooseUsConfigSchema = z.object({
    items: z
        .array(
            z.object({
                title: label,
                description: z.string().max(220),
                icon: z.string().max(40),
                tone: tone.optional(),
            }),
        )
        .max(8)
        .default([]),
});

/**
 * explore_directory — the SEO link block.
 *
 * Column links are editable rather than derived so an editor controls exactly which
 * landing pages get homepage link equity; `stateLimit` / `cityLimit` top the block up
 * from live geography data.
 */
export const exploreDirectoryConfigSchema = z.object({
    columns: z
        .array(
            z.object({
                title: label,
                icon: z.string().max(40).optional(),
                links: z.array(linkChipSchema).max(12).default([]),
            }),
        )
        .max(4)
        .default([]),
    stateLimit: z.number().int().min(0).max(20).default(8),
    cityLimit: z.number().int().min(0).max(20).default(8),
});

/** faq */
export const faqConfigSchema = z.object({
    limit: z.number().int().min(2).max(12).default(6),
    /** FAQ scope to pull from; `homepage` first, falling back to `global`. */
    scope: z.string().max(40).default('homepage'),
    /** Emits FAQPage structured data. Turn off if the same FAQs appear elsewhere. */
    emitStructuredData: z.boolean().default(true),
});

/** app_download */
export const appDownloadConfigSchema = z.object({
    highlights: z.array(z.string().max(80)).max(4).default([]),
    showQr: z.boolean().default(false),
    tone: tone.default('navy'),
});

/** platform_stats */
export const platformStatsConfigSchema = z.object({
    stats: z.array(statSchema).max(8).default([]),
    animateCounters: z.boolean().default(true),
});

/** sticky_cta */
export const stickyCtaConfigSchema = z.object({
    showCall: z.boolean().default(true),
    showWhatsapp: z.boolean().default(true),
    callLabel: z.string().max(40).default('Call Now'),
    whatsappLabel: z.string().max(40).default('WhatsApp'),
    whatsappSubLabel: z.string().max(60).default('Chat with us'),
});

export const HOMEPAGE_CONFIG_SCHEMAS = {
    hero: heroConfigSchema,
    quick_actions: quickActionsConfigSchema,
    top_courses: topCoursesConfigSchema,
    compare_colleges: compareCollegesConfigSchema,
    college_predictor: collegePredictorConfigSchema,
    guidance_tools: guidanceToolsConfigSchema,
    trending: trendingConfigSchema,
    ai_assistant: aiAssistantConfigSchema,
    loan_promo: loanPromoConfigSchema,
    whatsapp_community: whatsappConfigSchema,
    featured_colleges: featuredCollegesConfigSchema,
    upcoming_dates: upcomingDatesConfigSchema,
    scholarships: scholarshipsConfigSchema,
    student_reviews: studentReviewsConfigSchema,
    latest_articles: latestArticlesConfigSchema,
    counsellors: counsellorsConfigSchema,
    why_choose_us: whyChooseUsConfigSchema,
    explore_directory: exploreDirectoryConfigSchema,
    faq: faqConfigSchema,
    app_download: appDownloadConfigSchema,
    platform_stats: platformStatsConfigSchema,
    sticky_cta: stickyCtaConfigSchema,
} as const;

export type HeroConfig = z.infer<typeof heroConfigSchema>;
export type QuickActionsConfig = z.infer<typeof quickActionsConfigSchema>;
export type TopCoursesConfig = z.infer<typeof topCoursesConfigSchema>;
export type CompareCollegesConfig = z.infer<typeof compareCollegesConfigSchema>;
export type CollegePredictorConfig = z.infer<typeof collegePredictorConfigSchema>;
export type GuidanceToolsConfig = z.infer<typeof guidanceToolsConfigSchema>;
export type TrendingConfig = z.infer<typeof trendingConfigSchema>;
export type AiAssistantConfig = z.infer<typeof aiAssistantConfigSchema>;
export type WhatsappConfig = z.infer<typeof whatsappConfigSchema>;
export type LoanPromoConfig = z.infer<typeof loanPromoConfigSchema>;
export type FeaturedCollegesConfig = z.infer<typeof featuredCollegesConfigSchema>;
export type UpcomingDatesConfig = z.infer<typeof upcomingDatesConfigSchema>;
export type ScholarshipsConfig = z.infer<typeof scholarshipsConfigSchema>;
export type StudentReviewsConfig = z.infer<typeof studentReviewsConfigSchema>;
export type LatestArticlesConfig = z.infer<typeof latestArticlesConfigSchema>;
export type CounsellorsConfig = z.infer<typeof counsellorsConfigSchema>;
export type WhyChooseUsConfig = z.infer<typeof whyChooseUsConfigSchema>;
export type ExploreDirectoryConfig = z.infer<typeof exploreDirectoryConfigSchema>;
export type FaqSectionConfig = z.infer<typeof faqConfigSchema>;
export type AppDownloadConfig = z.infer<typeof appDownloadConfigSchema>;
export type PlatformStatsConfig = z.infer<typeof platformStatsConfigSchema>;
export type StickyCtaConfig = z.infer<typeof stickyCtaConfigSchema>;

/** Admin: update the editable copy + validated config of one section. */
export const updateHomepageSectionSchema = z.object({
    key: z.enum(HOMEPAGE_SECTION_KEYS),
    isEnabled: z.boolean().optional(),
    heading: z.string().max(200).optional(),
    subheading: z.string().max(300).optional(),
    description: z.string().max(1000).optional(),
    ctaLabel: z.string().max(60).optional(),
    ctaUrl: z.string().max(300).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    saveAsDraft: z.boolean().default(false),
});

export const reorderHomepageSectionsSchema = z.object({
    order: z.array(z.enum(HOMEPAGE_SECTION_KEYS)).min(1),
});

/** Validates a section config against its section-specific schema. */
export function parseSectionConfig<K extends keyof typeof HOMEPAGE_CONFIG_SCHEMAS>(
    key: K,
    value: unknown,
): z.infer<(typeof HOMEPAGE_CONFIG_SCHEMAS)[K]> {
    const schema = HOMEPAGE_CONFIG_SCHEMAS[key] as z.ZodType;
    return schema.parse(value ?? {}) as z.infer<(typeof HOMEPAGE_CONFIG_SCHEMAS)[K]>;
}

/** Non-throwing variant used at render time so a bad config never 500s the homepage. */
export function safeSectionConfig<K extends keyof typeof HOMEPAGE_CONFIG_SCHEMAS>(
    key: K,
    value: unknown,
    fallback: unknown,
): z.infer<(typeof HOMEPAGE_CONFIG_SCHEMAS)[K]> {
    const schema = HOMEPAGE_CONFIG_SCHEMAS[key] as z.ZodType;
    const parsed = schema.safeParse(value ?? {});
    if (parsed.success) return parsed.data as z.infer<(typeof HOMEPAGE_CONFIG_SCHEMAS)[K]>;
    return schema.parse(fallback ?? {}) as z.infer<(typeof HOMEPAGE_CONFIG_SCHEMAS)[K]>;
}
