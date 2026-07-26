import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import {
    PROBABILITY_BANDS,
    QUOTA_TYPES,
    RESERVATION_CATEGORIES,
    THEME_COLORS,
} from '@/config/constants';
import {
    auditPlugin,
    baseSchemaOptions,
    contentStatusField,
    faqItemSchema,
    registerModel,
    seoSchema,
    slugField,
    softDeletePlugin,
    statusField,
    type FaqItem,
    type SeoMeta,
} from './shared/base';

/* =============================== Predictor ============================== */

export type PredictorInputKind =
    | 'rank'
    | 'percentile'
    | 'score'
    | 'category'
    | 'gender'
    | 'homeState'
    | 'domicile'
    | 'quota'
    | 'round'
    | 'branch'
    | 'preferredState'
    | 'collegeType';

export interface PredictorFieldConfig {
    key: PredictorInputKind;
    label: string;
    type: 'number' | 'select' | 'multiselect' | 'boolean';
    required: boolean;
    placeholder?: string;
    helpText?: string;
    min?: number;
    max?: number;
    options?: { label: string; value: string }[];
    displayOrder: number;
}

export interface PredictorBandRule {
    band: string;
    /** Ratio of user metric to closing metric, e.g. rank <= closingRank * 0.8 -> very_high */
    maxRatio?: number;
    minRatio?: number;
    label?: string;
}

export interface PredictorDoc {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    exam?: Types.ObjectId;
    examShortName?: string;
    subtitle?: string;
    description?: string;
    icon: string;
    themeColor: string;
    metric: 'rank' | 'percentile' | 'score';
    metricDirection: 'lower_is_better' | 'higher_is_better';
    fields: PredictorFieldConfig[];
    bandRules: PredictorBandRule[];
    activeDataset?: Types.ObjectId;
    disclaimer: string;
    ctaLabel: string;
    isFeatured: boolean;
    showOnHomepage: boolean;
    displayOrder: number;
    usageCount: number;
    faqs: FaqItem[];
    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
    seo?: SeoMeta;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const predictorFieldSchema = new Schema<PredictorFieldConfig>(
    {
        key: { type: String, required: true },
        label: { type: String, required: true, trim: true, maxlength: 120 },
        type: { type: String, enum: ['number', 'select', 'multiselect', 'boolean'], required: true },
        required: { type: Boolean, default: false },
        placeholder: { type: String, trim: true },
        helpText: { type: String, trim: true, maxlength: 300 },
        min: Number,
        max: Number,
        options: {
            type: [
                new Schema(
                    { label: { type: String, required: true }, value: { type: String, required: true } },
                    { _id: false },
                ),
            ],
            default: [],
        },
        displayOrder: { type: Number, default: 0 },
    },
    { _id: false },
);

const predictorSchema = new Schema<PredictorDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 160 },
        slug: { ...slugField, unique: true },
        exam: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
        examShortName: { type: String, trim: true },
        subtitle: { type: String, trim: true, maxlength: 160 },
        description: { type: String, trim: true, maxlength: 4000 },
        icon: { type: String, default: 'Target', trim: true },
        themeColor: { type: String, enum: THEME_COLORS, default: 'navy' },
        metric: { type: String, enum: ['rank', 'percentile', 'score'], default: 'rank' },
        metricDirection: {
            type: String,
            enum: ['lower_is_better', 'higher_is_better'],
            default: 'lower_is_better',
        },
        fields: { type: [predictorFieldSchema], default: [] },
        bandRules: {
            type: [
                new Schema<PredictorBandRule>(
                    {
                        band: { type: String, enum: PROBABILITY_BANDS, required: true },
                        maxRatio: Number,
                        minRatio: Number,
                        label: String,
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
        activeDataset: { type: Schema.Types.ObjectId, ref: 'PredictorDataset' },
        disclaimer: {
            type: String,
            required: true,
            maxlength: 1200,
            default:
                'Predictions are estimates based on previous-year closing data and configurable rules. They are not an admission guarantee. Always verify with official counselling authorities.',
        },
        ctaLabel: { type: String, default: 'Check Now', trim: true, maxlength: 40 },
        isFeatured: { type: Boolean, default: false },
        showOnHomepage: { type: Boolean, default: true, index: true },
        displayOrder: { type: Number, default: 0 },
        usageCount: { type: Number, default: 0 },
        faqs: { type: [faqItemSchema], default: [] },
        status: contentStatusField,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

predictorSchema.plugin(auditPlugin);
predictorSchema.plugin(softDeletePlugin);
predictorSchema.index({ status: 1, showOnHomepage: 1, displayOrder: 1 });
predictorSchema.index({ name: 'text' });

export const Predictor = registerModel<PredictorDoc, Model<PredictorDoc>>(
    'Predictor',
    predictorSchema,
);

/* =========================== PredictorDataset =========================== */

export interface PredictorDatasetDoc {
    _id: Types.ObjectId;
    predictor: Types.ObjectId;
    name: string;
    version: number;
    year: number;
    sourceFileName?: string;
    sourceNote?: string;
    columnMapping: Record<string, string>;
    rowCount: number;
    validRowCount: number;
    invalidRowCount: number;
    validationErrors: { row: number; message: string }[];
    state: 'draft' | 'validated' | 'published' | 'rolled_back' | 'archived';
    publishedAt?: Date;
    publishedBy?: Types.ObjectId;
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const predictorDatasetSchema = new Schema<PredictorDatasetDoc>(
    {
        predictor: { type: Schema.Types.ObjectId, ref: 'Predictor', required: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: 200 },
        version: { type: Number, required: true, min: 1 },
        year: { type: Number, required: true, min: 2000, max: 2100 },
        sourceFileName: { type: String, trim: true },
        sourceNote: { type: String, trim: true, maxlength: 600 },
        columnMapping: { type: Schema.Types.Mixed, default: {} },
        rowCount: { type: Number, default: 0 },
        validRowCount: { type: Number, default: 0 },
        invalidRowCount: { type: Number, default: 0 },
        validationErrors: {
            type: [new Schema({ row: Number, message: String }, { _id: false })],
            default: [],
        },
        state: {
            type: String,
            enum: ['draft', 'validated', 'published', 'rolled_back', 'archived'],
            default: 'draft',
            index: true,
        },
        publishedAt: Date,
        publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    baseSchemaOptions,
);

predictorDatasetSchema.plugin(auditPlugin);
predictorDatasetSchema.index({ predictor: 1, version: -1 }, { unique: true });

export const PredictorDataset = registerModel<PredictorDatasetDoc, Model<PredictorDatasetDoc>>(
    'PredictorDataset',
    predictorDatasetSchema,
);

/* =============================== Cutoff ================================= */

export interface CutoffDoc {
    _id: Types.ObjectId;
    dataset: Types.ObjectId;
    predictor: Types.ObjectId;
    exam?: Types.ObjectId;
    examShortName?: string;
    year: number;
    round: number;
    college?: Types.ObjectId;
    collegeName: string;
    collegeSlug?: string;
    stateName?: string;
    cityName?: string;
    collegeType?: string;
    branchName: string;
    courseName?: string;
    category: string;
    quota: string;
    gender?: string;
    openingRank?: number;
    closingRank?: number;
    closingPercentile?: number;
    closingScore?: number;
    seats?: number;
    annualFee?: number;
    nirfRank?: number;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const cutoffSchema = new Schema<CutoffDoc>(
    {
        dataset: { type: Schema.Types.ObjectId, ref: 'PredictorDataset', required: true },
        predictor: { type: Schema.Types.ObjectId, ref: 'Predictor', required: true, index: true },
        exam: { type: Schema.Types.ObjectId, ref: 'Exam' },
        examShortName: { type: String, trim: true },
        year: { type: Number, required: true, min: 2000, max: 2100 },
        round: { type: Number, required: true, min: 1, max: 12, default: 1 },
        college: { type: Schema.Types.ObjectId, ref: 'College' },
        collegeName: { type: String, required: true, trim: true, maxlength: 220 },
        collegeSlug: { type: String, trim: true },
        stateName: { type: String, trim: true },
        cityName: { type: String, trim: true },
        collegeType: { type: String, trim: true },
        branchName: { type: String, required: true, trim: true, maxlength: 200 },
        courseName: { type: String, trim: true },
        category: { type: String, required: true, trim: true, default: 'General' },
        quota: { type: String, required: true, trim: true, default: 'All India' },
        gender: { type: String, trim: true },
        openingRank: { type: Number, min: 0 },
        closingRank: { type: Number, min: 0 },
        closingPercentile: { type: Number, min: 0, max: 100 },
        closingScore: { type: Number, min: 0 },
        seats: { type: Number, min: 0 },
        annualFee: { type: Number, min: 0 },
        nirfRank: { type: Number, min: 1 },
        isPublished: { type: Boolean, default: false, index: true },
    },
    baseSchemaOptions,
);

cutoffSchema.index({ predictor: 1, isPublished: 1, category: 1, quota: 1, round: 1 });
cutoffSchema.index({ predictor: 1, isPublished: 1, closingRank: 1 });
cutoffSchema.index({ predictor: 1, isPublished: 1, closingPercentile: -1 });
cutoffSchema.index({ dataset: 1 });
cutoffSchema.index({ collegeName: 'text', branchName: 'text' }, { name: 'cutoff_search' });

export const Cutoff = registerModel<CutoffDoc, Model<CutoffDoc>>('Cutoff', cutoffSchema);

/* =========================== PredictionSession ========================== */

export interface PredictionResultRow {
    collegeName: string;
    collegeSlug?: string;
    college?: Types.ObjectId;
    branchName: string;
    band: string;
    previousClosing?: number;
    expectedClosing?: number;
    category: string;
    quota: string;
    round: number;
    location?: string;
    annualFee?: number;
    nirfRank?: number;
}

export interface PredictionSessionDoc {
    _id: Types.ObjectId;
    predictor: Types.ObjectId;
    predictorSlug: string;
    user?: Types.ObjectId;
    anonymousId?: string;
    inputs: Record<string, unknown>;
    datasetVersion?: number;
    resultCount: number;
    results: PredictionResultRow[];
    leadCaptured: boolean;
    lead?: Types.ObjectId;
    completedAt?: Date;
    durationMs?: number;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}

const predictionSessionSchema = new Schema<PredictionSessionDoc>(
    {
        predictor: { type: Schema.Types.ObjectId, ref: 'Predictor', required: true, index: true },
        predictorSlug: { type: String, required: true, trim: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        anonymousId: { type: String, trim: true, index: true },
        inputs: { type: Schema.Types.Mixed, default: {} },
        datasetVersion: Number,
        resultCount: { type: Number, default: 0 },
        results: { type: Schema.Types.Mixed, default: [] },
        leadCaptured: { type: Boolean, default: false },
        lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
        completedAt: Date,
        durationMs: Number,
        userAgent: { type: String, trim: true, maxlength: 400 },
    },
    baseSchemaOptions,
);

predictionSessionSchema.index({ createdAt: -1 });
predictionSessionSchema.index({ predictor: 1, createdAt: -1 });

export const PredictionSession = registerModel<PredictionSessionDoc, Model<PredictionSessionDoc>>(
    'PredictionSession',
    predictionSessionSchema,
);

export const PREDICTOR_CATEGORY_OPTIONS = RESERVATION_CATEGORIES.map((c) => ({
    label: c,
    value: c,
}));
export const PREDICTOR_QUOTA_OPTIONS = QUOTA_TYPES.map((q) => ({ label: q, value: q }));
