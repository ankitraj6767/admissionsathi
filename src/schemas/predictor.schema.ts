import { z } from 'zod';
import { PROBABILITY_BANDS, QUOTA_TYPES, RESERVATION_CATEGORIES, THEME_COLORS } from '@/config/constants';

/** Public predictor run input. Field presence is validated against the predictor config. */
export const predictorRunSchema = z.object({
    predictorSlug: z.string().min(2).max(140),
    metricValue: z.coerce.number().min(0).max(2_000_000),
    category: z.enum(RESERVATION_CATEGORIES).default('General'),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    homeState: z.string().max(120).optional().or(z.literal('')),
    quota: z.enum(QUOTA_TYPES).optional(),
    round: z.coerce.number().int().min(1).max(12).default(1),
    branches: z.array(z.string().max(200)).max(10).default([]),
    preferredStates: z.array(z.string().max(120)).max(10).default([]),
    collegeType: z.string().max(60).optional().or(z.literal('')),
    anonymousId: z.string().max(80).optional(),
});

export type PredictorRunInput = z.infer<typeof predictorRunSchema>;
export type PredictorRunValues = z.input<typeof predictorRunSchema>;

/** Optional lead capture attached to a prediction session. */
export const predictorLeadSchema = z.object({
    sessionId: z.string().min(1),
    name: z.string().trim().min(2).max(120),
    phone: z
        .string()
        .trim()
        .regex(/^(\+?91[-\s]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
    email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
    consent: z.boolean().refine((v) => v, 'Please accept the consent to continue'),
    idempotencyKey: z.string().min(8).max(64),
});

/* ------------------------------ admin side ------------------------------- */

export const predictorUpsertSchema = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(3).max(160),
    slug: z
        .string()
        .trim()
        .regex(/^[a-z0-9][a-z0-9-]*$/, 'Use lowercase letters, numbers and hyphens')
        .max(140),
    examId: z.string().optional().or(z.literal('')),
    subtitle: z.string().max(160).optional(),
    description: z.string().max(4000).optional(),
    icon: z.string().max(40).default('Target'),
    themeColor: z.enum(THEME_COLORS).default('navy'),
    metric: z.enum(['rank', 'percentile', 'score']).default('rank'),
    metricDirection: z.enum(['lower_is_better', 'higher_is_better']).default('lower_is_better'),
    disclaimer: z.string().min(20).max(1200),
    ctaLabel: z.string().max(40).default('Check Now'),
    showOnHomepage: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    displayOrder: z.coerce.number().int().min(0).max(999).default(0),
    status: z.enum(['draft', 'in_review', 'scheduled', 'published', 'archived']).default('draft'),
    bandRules: z
        .array(
            z.object({
                band: z.enum(PROBABILITY_BANDS),
                maxRatio: z.coerce.number().min(0).max(100).optional(),
                minRatio: z.coerce.number().min(0).max(100).optional(),
            }),
        )
        .max(5)
        .default([]),
});

/** CSV import: column mapping + validation preview. */
export const cutoffImportSchema = z.object({
    predictorId: z.string().min(1),
    year: z.coerce.number().int().min(2000).max(2100),
    name: z.string().min(3).max(200),
    sourceNote: z.string().max(600).optional(),
    columnMapping: z.record(z.string(), z.string()),
    rows: z
        .array(z.record(z.string(), z.string()))
        .min(1, 'The file has no data rows')
        .max(20000, 'Split files larger than 20,000 rows'),
});

export const REQUIRED_CUTOFF_COLUMNS = ['collegeName', 'branchName', 'category'] as const;

export const OPTIONAL_CUTOFF_COLUMNS = [
    'quota',
    'round',
    'gender',
    'openingRank',
    'closingRank',
    'closingPercentile',
    'closingScore',
    'seats',
    'annualFee',
    'stateName',
    'cityName',
    'collegeType',
    'courseName',
    'nirfRank',
] as const;

export const datasetActionSchema = z.object({
    datasetId: z.string().min(1),
    action: z.enum(['publish', 'rollback', 'archive']),
});
