import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import {
    auditPlugin,
    baseSchemaOptions,
    contentStatusField,
    faqItemSchema,
    imageSchema,
    registerModel,
    seoSchema,
    slugField,
    softDeletePlugin,
    statusField,
    type FaqItem,
    type ImageRef,
    type SeoMeta,
} from './shared/base';

/* ============================== Scholarship ============================= */

export interface ScholarshipDoc {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    provider: string;
    providerType: 'Government' | 'Private' | 'Institute' | 'NGO' | 'International';
    description?: string;
    detailsHtml?: string;
    eligibilityHtml?: string;
    documentsRequired: string[];
    benefitType: 'Full Tuition' | 'Partial Tuition' | 'Fixed Amount' | 'Monthly Stipend' | 'Other';
    amountMin?: number;
    amountMax?: number;
    amountNote?: string;
    applicationStart?: Date;
    applicationDeadline?: Date;
    applicationUrl?: string;
    targetLevels: string[];
    targetCourses: Types.ObjectId[];
    targetCategories: string[];
    targetStates: Types.ObjectId[];
    genderRestriction?: string;
    minPercentage?: number;
    maxFamilyIncome?: number;
    logo?: ImageRef;
    faqs: FaqItem[];
    isFeatured: boolean;
    viewCount: number;
    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
    publishedAt?: Date;
    seo?: SeoMeta;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const scholarshipSchema = new Schema<ScholarshipDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 220 },
        slug: { ...slugField, unique: true },
        provider: { type: String, required: true, trim: true, maxlength: 200 },
        providerType: {
            type: String,
            enum: ['Government', 'Private', 'Institute', 'NGO', 'International'],
            default: 'Government',
            index: true,
        },
        description: { type: String, trim: true, maxlength: 1000 },
        detailsHtml: { type: String, maxlength: 30000 },
        eligibilityHtml: { type: String, maxlength: 20000 },
        documentsRequired: { type: [String], default: [] },
        benefitType: {
            type: String,
            enum: ['Full Tuition', 'Partial Tuition', 'Fixed Amount', 'Monthly Stipend', 'Other'],
            default: 'Fixed Amount',
        },
        amountMin: { type: Number, min: 0 },
        amountMax: { type: Number, min: 0 },
        amountNote: { type: String, trim: true, maxlength: 200 },
        applicationStart: Date,
        applicationDeadline: { type: Date, index: true },
        applicationUrl: { type: String, trim: true },
        targetLevels: { type: [String], default: [] },
        targetCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
        targetCategories: { type: [String], default: [] },
        targetStates: [{ type: Schema.Types.ObjectId, ref: 'State' }],
        genderRestriction: { type: String, trim: true },
        minPercentage: { type: Number, min: 0, max: 100 },
        maxFamilyIncome: { type: Number, min: 0 },
        logo: imageSchema,
        faqs: { type: [faqItemSchema], default: [] },
        isFeatured: { type: Boolean, default: false, index: true },
        viewCount: { type: Number, default: 0 },
        status: contentStatusField,
        publishedAt: Date,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

scholarshipSchema.plugin(auditPlugin);
scholarshipSchema.plugin(softDeletePlugin);
scholarshipSchema.index({ name: 'text', provider: 'text' }, { name: 'scholarship_search' });
scholarshipSchema.index({ status: 1, applicationDeadline: 1 });
scholarshipSchema.index({ targetCourses: 1, status: 1 });

export const Scholarship = registerModel<ScholarshipDoc, Model<ScholarshipDoc>>(
    'Scholarship',
    scholarshipSchema,
);

/* ============================= LoanProvider ============================= */

export interface LoanProviderDoc {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    providerType: 'Public Bank' | 'Private Bank' | 'NBFC' | 'Fintech' | 'International';
    logo?: ImageRef;
    summary?: string;
    detailsHtml?: string;
    interestRateMin?: number;
    interestRateMax?: number;
    maxLoanAmount?: number;
    maxLoanAmountWithoutCollateral?: number;
    collateralRequiredAbove?: number;
    processingFeePercent?: number;
    processingFeeNote?: string;
    moratoriumMonths?: number;
    maxTenureYears?: number;
    processingTimeDays?: string;
    documentsRequired: string[];
    eligibilityHtml?: string;
    coversAbroad: boolean;
    applyUrl?: string;
    rating?: number;
    faqs: FaqItem[];
    isFeatured: boolean;
    displayOrder: number;
    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
    seo?: SeoMeta;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const loanProviderSchema = new Schema<LoanProviderDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 200 },
        slug: { ...slugField, unique: true },
        providerType: {
            type: String,
            enum: ['Public Bank', 'Private Bank', 'NBFC', 'Fintech', 'International'],
            default: 'Public Bank',
            index: true,
        },
        logo: imageSchema,
        summary: { type: String, trim: true, maxlength: 600 },
        detailsHtml: { type: String, maxlength: 30000 },
        interestRateMin: { type: Number, min: 0, max: 100 },
        interestRateMax: { type: Number, min: 0, max: 100 },
        maxLoanAmount: { type: Number, min: 0 },
        maxLoanAmountWithoutCollateral: { type: Number, min: 0 },
        collateralRequiredAbove: { type: Number, min: 0 },
        processingFeePercent: { type: Number, min: 0, max: 100 },
        processingFeeNote: { type: String, trim: true, maxlength: 200 },
        moratoriumMonths: { type: Number, min: 0, max: 120 },
        maxTenureYears: { type: Number, min: 1, max: 30 },
        processingTimeDays: { type: String, trim: true, maxlength: 60 },
        documentsRequired: { type: [String], default: [] },
        eligibilityHtml: { type: String, maxlength: 20000 },
        coversAbroad: { type: Boolean, default: false },
        applyUrl: { type: String, trim: true },
        rating: { type: Number, min: 0, max: 5 },
        faqs: { type: [faqItemSchema], default: [] },
        isFeatured: { type: Boolean, default: false, index: true },
        displayOrder: { type: Number, default: 0 },
        status: contentStatusField,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

loanProviderSchema.plugin(auditPlugin);
loanProviderSchema.plugin(softDeletePlugin);
loanProviderSchema.index({ name: 'text' });
loanProviderSchema.index({ status: 1, interestRateMin: 1 });

export const LoanProvider = registerModel<LoanProviderDoc, Model<LoanProviderDoc>>(
    'LoanProvider',
    loanProviderSchema,
);

/* ============================== LoanProduct ============================= */

export interface LoanProductDoc {
    _id: Types.ObjectId;
    provider: Types.ObjectId;
    providerName: string;
    name: string;
    slug: string;
    purpose: 'Domestic Study' | 'Study Abroad' | 'Skill Development' | 'Vocational';
    interestRateMin?: number;
    interestRateMax?: number;
    minAmount?: number;
    maxAmount?: number;
    tenureYearsMax?: number;
    moratoriumMonths?: number;
    processingFeePercent?: number;
    collateralFree: boolean;
    eligibleCourses: Types.ObjectId[];
    featuresHtml?: string;
    status: 'active' | 'inactive' | 'archived';
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const loanProductSchema = new Schema<LoanProductDoc>(
    {
        provider: { type: Schema.Types.ObjectId, ref: 'LoanProvider', required: true, index: true },
        providerName: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true, maxlength: 200 },
        slug: { ...slugField },
        purpose: {
            type: String,
            enum: ['Domestic Study', 'Study Abroad', 'Skill Development', 'Vocational'],
            default: 'Domestic Study',
            index: true,
        },
        interestRateMin: { type: Number, min: 0, max: 100 },
        interestRateMax: { type: Number, min: 0, max: 100 },
        minAmount: { type: Number, min: 0 },
        maxAmount: { type: Number, min: 0 },
        tenureYearsMax: { type: Number, min: 1, max: 30 },
        moratoriumMonths: { type: Number, min: 0, max: 120 },
        processingFeePercent: { type: Number, min: 0, max: 100 },
        collateralFree: { type: Boolean, default: false },
        eligibleCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
        featuresHtml: { type: String, maxlength: 20000 },
        status: statusField,
        displayOrder: { type: Number, default: 0 },
    },
    baseSchemaOptions,
);

loanProductSchema.plugin(auditPlugin);
loanProductSchema.index({ provider: 1, slug: 1 }, { unique: true });

export const LoanProduct = registerModel<LoanProductDoc, Model<LoanProductDoc>>(
    'LoanProduct',
    loanProductSchema,
);
