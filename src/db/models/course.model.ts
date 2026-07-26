import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import { COURSE_LEVELS, STUDY_MODES, THEME_COLORS } from '@/config/constants';
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

/* ============================ Course category ============================ */

export interface CourseCategoryDoc {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    shortName?: string;
    description?: string;
    subtitle?: string;
    icon: string;
    themeColor: string;
    collegeCount: number;
    courseCount: number;
    isFeatured: boolean;
    displayOrder: number;
    status: 'active' | 'inactive' | 'archived';
    seo?: SeoMeta;
    createdAt: Date;
    updatedAt: Date;
}

const courseCategorySchema = new Schema<CourseCategoryDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 120, unique: true },
        slug: { ...slugField, unique: true },
        shortName: { type: String, trim: true, maxlength: 40 },
        description: { type: String, trim: true, maxlength: 1000 },
        // "B.Tech, M.Tech & More" style caption used on the homepage cards
        subtitle: { type: String, trim: true, maxlength: 120 },
        icon: { type: String, required: true, trim: true, default: 'GraduationCap' },
        themeColor: { type: String, enum: THEME_COLORS, default: 'navy' },
        collegeCount: { type: Number, default: 0, min: 0 },
        courseCount: { type: Number, default: 0, min: 0 },
        isFeatured: { type: Boolean, default: true, index: true },
        displayOrder: { type: Number, default: 0 },
        status: statusField,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

courseCategorySchema.plugin(auditPlugin);
courseCategorySchema.index({ status: 1, isFeatured: -1, displayOrder: 1 });
courseCategorySchema.index({ name: 'text' });

export const CourseCategory = registerModel<CourseCategoryDoc, Model<CourseCategoryDoc>>(
    'CourseCategory',
    courseCategorySchema,
);

/* ============================== Course ================================== */

export interface CourseFeeRange {
    min?: number;
    max?: number;
    currency: string;
    note?: string;
}

export interface CourseDoc {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    slugHistory: { slug: string; changedAt: Date }[];
    shortName?: string;
    category: Types.ObjectId;
    categoryName: string;
    level: string;
    durationMonths: number;
    durationLabel: string;
    studyModes: string[];
    overview?: string;
    eligibility?: string;
    admissionProcess?: string;
    syllabusHtml?: string;
    careerHtml?: string;
    scopeHtml?: string;
    averageFee?: CourseFeeRange;
    averageSalary?: { min?: number; max?: number; note?: string };
    topRecruiters: string[];
    entranceExams: Types.ObjectId[];
    specializations: Types.ObjectId[];
    skills: string[];
    jobRoles: string[];
    collegeCount: number;
    heroImage?: ImageRef;
    icon?: string;
    themeColor?: string;
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
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const courseSchema = new Schema<CourseDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 180 },
        slug: { ...slugField, unique: true },
        slugHistory: { type: [slugHistorySchema], default: [] },
        shortName: { type: String, trim: true, maxlength: 40 },
        category: { type: Schema.Types.ObjectId, ref: 'CourseCategory', required: true, index: true },
        categoryName: { type: String, required: true, trim: true },
        level: { type: String, enum: COURSE_LEVELS, required: true, index: true },
        durationMonths: { type: Number, required: true, min: 1, max: 120 },
        durationLabel: { type: String, required: true, trim: true, maxlength: 60 },
        studyModes: { type: [String], enum: STUDY_MODES, default: ['Full Time'] },
        overview: { type: String, trim: true, maxlength: 20000 },
        eligibility: { type: String, trim: true, maxlength: 8000 },
        admissionProcess: { type: String, trim: true, maxlength: 12000 },
        syllabusHtml: { type: String, maxlength: 60000 },
        careerHtml: { type: String, maxlength: 30000 },
        scopeHtml: { type: String, maxlength: 30000 },
        averageFee: {
            min: { type: Number, min: 0 },
            max: { type: Number, min: 0 },
            currency: { type: String, default: 'INR' },
            note: { type: String, trim: true, maxlength: 200 },
        },
        averageSalary: {
            min: { type: Number, min: 0 },
            max: { type: Number, min: 0 },
            note: { type: String, trim: true, maxlength: 200 },
        },
        topRecruiters: { type: [String], default: [] },
        entranceExams: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
        specializations: [{ type: Schema.Types.ObjectId, ref: 'Specialization' }],
        skills: { type: [String], default: [] },
        jobRoles: { type: [String], default: [] },
        collegeCount: { type: Number, default: 0, min: 0 },
        heroImage: imageSchema,
        icon: { type: String, trim: true },
        themeColor: { type: String, enum: THEME_COLORS },
        faqs: { type: [faqItemSchema], default: [] },
        highlights: {
            type: [
                new Schema(
                    {
                        label: { type: String, required: true, trim: true, maxlength: 80 },
                        value: { type: String, required: true, trim: true, maxlength: 160 },
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
        publishedAt: { type: Date, index: true },
        seo: seoSchema,
    },
    baseSchemaOptions,
);

courseSchema.plugin(auditPlugin);
courseSchema.plugin(softDeletePlugin);
courseSchema.plugin(optimisticConcurrency);

courseSchema.index({ name: 'text', shortName: 'text', categoryName: 'text' }, { name: 'course_search' });
courseSchema.index({ status: 1, category: 1, level: 1 });
courseSchema.index({ status: 1, isFeatured: -1, displayOrder: 1 });
courseSchema.index({ 'averageFee.min': 1 });
courseSchema.index({ entranceExams: 1 });

export const Course = registerModel<CourseDoc, Model<CourseDoc>>('Course', courseSchema);

/* =========================== Specialization ============================= */

export interface SpecializationDoc {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    course: Types.ObjectId;
    courseName: string;
    description?: string;
    durationMonths?: number;
    careerScope?: string;
    averageSalary?: { min?: number; max?: number };
    collegeCount: number;
    isFeatured: boolean;
    displayOrder: number;
    status: 'active' | 'inactive' | 'archived';
    seo?: SeoMeta;
    createdAt: Date;
    updatedAt: Date;
}

const specializationSchema = new Schema<SpecializationDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 180 },
        slug: { ...slugField },
        course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
        courseName: { type: String, required: true, trim: true },
        description: { type: String, trim: true, maxlength: 4000 },
        durationMonths: { type: Number, min: 1, max: 120 },
        careerScope: { type: String, trim: true, maxlength: 4000 },
        averageSalary: { min: Number, max: Number },
        collegeCount: { type: Number, default: 0 },
        isFeatured: { type: Boolean, default: false },
        displayOrder: { type: Number, default: 0 },
        status: statusField,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

specializationSchema.plugin(auditPlugin);
specializationSchema.index({ course: 1, slug: 1 }, { unique: true });
specializationSchema.index({ name: 'text' });

export const Specialization = registerModel<SpecializationDoc, Model<SpecializationDoc>>(
    'Specialization',
    specializationSchema,
);
