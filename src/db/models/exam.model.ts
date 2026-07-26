import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import { EXAM_CATEGORIES, EXAM_LEVELS, EXAM_MODES } from '@/config/constants';
import {
    auditPlugin,
    baseSchemaOptions,
    contentStatusField,
    faqItemSchema,
    imageSchema,
    optimisticConcurrency,
    registerModel,
    seoSchema,
    slugField,
    slugHistorySchema,
    softDeletePlugin,
    statusField,
    type FaqItem,
    type ImageRef,
    type SeoMeta,
} from './shared/base';

export interface ExamDoc {
    _id: Types.ObjectId;
    name: string;
    shortName: string;
    slug: string;
    slugHistory: { slug: string; changedAt: Date }[];
    conductingBody: string;
    level: string;
    category: string;
    mode: string[];
    frequencyPerYear?: number;
    applicationFee?: { general?: number; reserved?: number; note?: string };
    officialWebsite?: string;
    logo?: ImageRef;

    overviewHtml?: string;
    eligibilityHtml?: string;
    applicationProcessHtml?: string;
    patternHtml?: string;
    syllabusHtml?: string;
    preparationTipsHtml?: string;
    admitCardHtml?: string;
    answerKeyHtml?: string;
    resultHtml?: string;
    cutoffHtml?: string;
    counsellingHtml?: string;

    examYear: number;
    registrationStart?: Date;
    registrationEnd?: Date;
    examDateFrom?: Date;
    examDateTo?: Date;
    admitCardDate?: Date;
    resultDate?: Date;
    counsellingStart?: Date;

    totalApplicants?: number;
    totalSeats?: number;
    acceptedByCollegeCount: number;
    relatedCourses: Types.ObjectId[];
    relatedCategories: Types.ObjectId[];
    predictorEnabled: boolean;

    faqs: FaqItem[];
    highlights: { label: string; value: string }[];

    isFeatured: boolean;
    isTrending: boolean;
    displayOrder: number;
    viewCount: number;
    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
    publishedAt?: Date;
    seo?: SeoMeta;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const examSchema = new Schema<ExamDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 220 },
        shortName: { type: String, required: true, trim: true, maxlength: 40, index: true },
        slug: { ...slugField, unique: true },
        slugHistory: { type: [slugHistorySchema], default: [] },
        conductingBody: { type: String, required: true, trim: true, maxlength: 200 },
        level: { type: String, enum: EXAM_LEVELS, required: true, index: true },
        category: { type: String, enum: EXAM_CATEGORIES, required: true, index: true },
        mode: { type: [String], enum: EXAM_MODES, default: ['Online (CBT)'] },
        frequencyPerYear: { type: Number, min: 1, max: 12 },
        applicationFee: {
            general: { type: Number, min: 0 },
            reserved: { type: Number, min: 0 },
            note: { type: String, trim: true, maxlength: 200 },
        },
        officialWebsite: { type: String, trim: true },
        logo: imageSchema,

        overviewHtml: { type: String, maxlength: 40000 },
        eligibilityHtml: { type: String, maxlength: 20000 },
        applicationProcessHtml: { type: String, maxlength: 20000 },
        patternHtml: { type: String, maxlength: 30000 },
        syllabusHtml: { type: String, maxlength: 60000 },
        preparationTipsHtml: { type: String, maxlength: 20000 },
        admitCardHtml: { type: String, maxlength: 12000 },
        answerKeyHtml: { type: String, maxlength: 12000 },
        resultHtml: { type: String, maxlength: 12000 },
        cutoffHtml: { type: String, maxlength: 30000 },
        counsellingHtml: { type: String, maxlength: 30000 },

        examYear: { type: Number, required: true, min: 2000, max: 2100, index: true },
        registrationStart: Date,
        registrationEnd: Date,
        examDateFrom: { type: Date, index: true },
        examDateTo: Date,
        admitCardDate: Date,
        resultDate: Date,
        counsellingStart: Date,

        totalApplicants: { type: Number, min: 0 },
        totalSeats: { type: Number, min: 0 },
        acceptedByCollegeCount: { type: Number, default: 0, min: 0 },
        relatedCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
        relatedCategories: [{ type: Schema.Types.ObjectId, ref: 'CourseCategory' }],
        predictorEnabled: { type: Boolean, default: false },

        faqs: { type: [faqItemSchema], default: [] },
        highlights: {
            type: [
                new Schema(
                    {
                        label: { type: String, required: true, trim: true },
                        value: { type: String, required: true, trim: true },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },

        isFeatured: { type: Boolean, default: false, index: true },
        isTrending: { type: Boolean, default: false },
        displayOrder: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },
        status: contentStatusField,
        publishedAt: Date,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

examSchema.plugin(auditPlugin);
examSchema.plugin(softDeletePlugin);
examSchema.plugin(optimisticConcurrency);

examSchema.index(
    { name: 'text', shortName: 'text', conductingBody: 'text' },
    { name: 'exam_search', weights: { shortName: 10, name: 8, conductingBody: 2 } },
);
examSchema.index({ status: 1, category: 1, level: 1 });
examSchema.index({ status: 1, isFeatured: -1, displayOrder: 1 });
examSchema.index({ registrationEnd: 1 });

export const Exam = registerModel<ExamDoc, Model<ExamDoc>>('Exam', examSchema);

/* ============================== ExamDate ================================ */

export interface ExamDateDoc {
    _id: Types.ObjectId;
    exam: Types.ObjectId;
    examShortName: string;
    examYear: number;
    event: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    isTentative: boolean;
    isKeyDate: boolean;
    sessionLabel?: string;
    displayOrder: number;
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

const examDateSchema = new Schema<ExamDateDoc>(
    {
        exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
        examShortName: { type: String, required: true, trim: true },
        examYear: { type: Number, required: true, min: 2000, max: 2100 },
        event: { type: String, required: true, trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 600 },
        startDate: { type: Date, index: true },
        endDate: Date,
        isTentative: { type: Boolean, default: false },
        isKeyDate: { type: Boolean, default: false },
        sessionLabel: { type: String, trim: true, maxlength: 60 },
        displayOrder: { type: Number, default: 0 },
        status: statusField,
    },
    baseSchemaOptions,
);

examDateSchema.plugin(auditPlugin);
examDateSchema.index({ exam: 1, examYear: -1, startDate: 1 });

export const ExamDate = registerModel<ExamDateDoc, Model<ExamDateDoc>>('ExamDate', examDateSchema);
