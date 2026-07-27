import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import {
    ACCREDITATIONS,
    APPROVAL_BODIES,
    OWNERSHIP_TYPES,
    STUDY_MODES,
} from '@/config/constants';
import {
    auditPlugin,
    baseSchemaOptions,
    contentStatusField,
    faqItemSchema,
    galleryItemSchema,
    imageSchema,
    optimisticConcurrency,
    registerModel,
    seoSchema,
    slugField,
    slugHistorySchema,
    softDeletePlugin,
    statusField,
    type FaqItem,
    type GalleryItem,
    type ImageRef,
    type SeoMeta,
} from './shared/base';

/* =============================== College ================================ */

export interface CollegeRatingBreakdown {
    overall: number;
    placement: number;
    faculty: number;
    infrastructure: number;
    campusLife: number;
    valueForMoney: number;
    count: number;
}

export interface CollegeDoc {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    slugHistory: { slug: string; changedAt: Date }[];
    shortName?: string;
    aliases: string[];
    tagline?: string;
    description?: string;
    overviewHtml?: string;

    logo?: ImageRef;
    banner?: ImageRef;
    gallery: GalleryItem[];
    brochureUrl?: string;
    videoUrl?: string;

    state: Types.ObjectId;
    stateName: string;
    city: Types.ObjectId;
    cityName: string;
    address?: string;
    pincode?: string;
    location?: { type: 'Point'; coordinates: [number, number] };
    mapEmbedUrl?: string;

    ownership: string;
    establishedYear?: number;
    affiliatedTo?: string;
    universityType?: string;
    approvals: string[];
    accreditation: string[];
    campusSizeAcres?: number;
    totalStudents?: number;
    totalFaculty?: number;
    facultyStudentRatio?: string;

    categories: Types.ObjectId[];
    courses: Types.ObjectId[];
    examsAccepted: Types.ObjectId[];
    studyModes: string[];

    feeRange: { min?: number; max?: number; currency: string };
    ranking: {
        nirfOverall?: number;
        nirfCategory?: number;
        nirfCategoryName?: string;
        indiaTodayRank?: number;
        internalRank?: number;
        year?: number;
    };
    rating: CollegeRatingBreakdown;

    placement: {
        highestPackage?: number;
        averagePackage?: number;
        medianPackage?: number;
        placementPercentage?: number;
        topRecruiters: string[];
        year?: number;
        summaryHtml?: string;
    };

    facilities: string[];
    hostelAvailable: boolean;
    hostelFeeRange?: { min?: number; max?: number };
    scholarshipsHtml?: string;
    admissionsHtml?: string;
    eligibilityHtml?: string;
    cutoffHtml?: string;
    facultyHtml?: string;

    contact: {
        phone?: string;
        email?: string;
        website?: string;
        admissionPhone?: string;
    };

    faqs: FaqItem[];
    highlights: { label: string; value: string }[];

    isFeatured: boolean;
    isTrending: boolean;
    isVerified: boolean;
    isSponsored: boolean;
    displayOrder: number;
    viewCount: number;
    compareCount: number;
    savedCount: number;
    leadCount: number;

    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
    publishedAt?: Date;
    seo?: SeoMeta;
    dataSourceNote?: string;
    isDeleted: boolean;
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const labelValueSchema = new Schema(
    {
        label: { type: String, required: true, trim: true, maxlength: 80 },
        value: { type: String, required: true, trim: true, maxlength: 160 },
    },
    { _id: false },
);

const collegeSchema = new Schema<CollegeDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 220 },
        slug: { ...slugField, unique: true },
        slugHistory: { type: [slugHistorySchema], default: [] },
        shortName: { type: String, trim: true, maxlength: 60 },
        aliases: { type: [String], default: [] },
        tagline: { type: String, trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 1200 },
        overviewHtml: { type: String, maxlength: 60000 },

        logo: imageSchema,
        banner: imageSchema,
        // `galleryItemSchema` is a superset of `imageSchema`, so rows written
        // before videos were supported keep validating and read back as images.
        gallery: { type: [galleryItemSchema], default: [] },
        brochureUrl: { type: String, trim: true },
        videoUrl: { type: String, trim: true },

        state: { type: Schema.Types.ObjectId, ref: 'State', required: true, index: true },
        stateName: { type: String, required: true, trim: true },
        city: { type: Schema.Types.ObjectId, ref: 'City', required: true, index: true },
        cityName: { type: String, required: true, trim: true },
        address: { type: String, trim: true, maxlength: 400 },
        pincode: { type: String, trim: true, maxlength: 10 },
        location: {
            type: { type: String, enum: ['Point'] },
            coordinates: { type: [Number] },
        },
        mapEmbedUrl: { type: String, trim: true },

        ownership: { type: String, enum: OWNERSHIP_TYPES, required: true, index: true },
        establishedYear: { type: Number, min: 1800, max: 2100 },
        affiliatedTo: { type: String, trim: true, maxlength: 220 },
        universityType: { type: String, trim: true, maxlength: 120 },
        approvals: { type: [String], enum: APPROVAL_BODIES, default: [] },
        accreditation: { type: [String], enum: ACCREDITATIONS, default: [] },
        campusSizeAcres: { type: Number, min: 0 },
        totalStudents: { type: Number, min: 0 },
        totalFaculty: { type: Number, min: 0 },
        facultyStudentRatio: { type: String, trim: true, maxlength: 20 },

        categories: [{ type: Schema.Types.ObjectId, ref: 'CourseCategory' }],
        courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
        examsAccepted: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
        studyModes: { type: [String], enum: STUDY_MODES, default: ['Full Time'] },

        feeRange: {
            min: { type: Number, min: 0 },
            max: { type: Number, min: 0 },
            currency: { type: String, default: 'INR' },
        },
        ranking: {
            nirfOverall: { type: Number, min: 1 },
            nirfCategory: { type: Number, min: 1 },
            nirfCategoryName: { type: String, trim: true },
            indiaTodayRank: { type: Number, min: 1 },
            internalRank: { type: Number, min: 1 },
            year: { type: Number, min: 2000, max: 2100 },
        },
        rating: {
            overall: { type: Number, default: 0, min: 0, max: 5 },
            placement: { type: Number, default: 0, min: 0, max: 5 },
            faculty: { type: Number, default: 0, min: 0, max: 5 },
            infrastructure: { type: Number, default: 0, min: 0, max: 5 },
            campusLife: { type: Number, default: 0, min: 0, max: 5 },
            valueForMoney: { type: Number, default: 0, min: 0, max: 5 },
            count: { type: Number, default: 0, min: 0 },
        },

        placement: {
            highestPackage: { type: Number, min: 0 },
            averagePackage: { type: Number, min: 0 },
            medianPackage: { type: Number, min: 0 },
            placementPercentage: { type: Number, min: 0, max: 100 },
            topRecruiters: { type: [String], default: [] },
            year: { type: Number, min: 2000, max: 2100 },
            summaryHtml: { type: String, maxlength: 20000 },
        },

        facilities: { type: [String], default: [] },
        hostelAvailable: { type: Boolean, default: false, index: true },
        hostelFeeRange: { min: Number, max: Number },
        scholarshipsHtml: { type: String, maxlength: 20000 },
        admissionsHtml: { type: String, maxlength: 40000 },
        eligibilityHtml: { type: String, maxlength: 20000 },
        cutoffHtml: { type: String, maxlength: 40000 },
        facultyHtml: { type: String, maxlength: 20000 },

        contact: {
            phone: { type: String, trim: true },
            email: { type: String, trim: true, lowercase: true },
            website: { type: String, trim: true },
            admissionPhone: { type: String, trim: true },
        },

        faqs: { type: [faqItemSchema], default: [] },
        highlights: { type: [labelValueSchema], default: [] },

        isFeatured: { type: Boolean, default: false, index: true },
        isTrending: { type: Boolean, default: false },
        isVerified: { type: Boolean, default: false },
        isSponsored: { type: Boolean, default: false },
        displayOrder: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },
        compareCount: { type: Number, default: 0 },
        savedCount: { type: Number, default: 0 },
        leadCount: { type: Number, default: 0 },

        status: contentStatusField,
        publishedAt: { type: Date, index: true },
        seo: seoSchema,
        dataSourceNote: { type: String, trim: true, maxlength: 400 },
    },
    baseSchemaOptions,
);

collegeSchema.plugin(auditPlugin);
collegeSchema.plugin(softDeletePlugin);
collegeSchema.plugin(optimisticConcurrency);

collegeSchema.index(
    { name: 'text', shortName: 'text', cityName: 'text', stateName: 'text', aliases: 'text' },
    { name: 'college_search', weights: { name: 10, shortName: 6, aliases: 4, cityName: 2, stateName: 1 } },
);
collegeSchema.index({ status: 1, stateName: 1, cityName: 1 });
collegeSchema.index({ status: 1, ownership: 1 });
collegeSchema.index({ status: 1, isFeatured: -1, 'ranking.nirfOverall': 1 });
collegeSchema.index({ status: 1, 'rating.overall': -1 });
collegeSchema.index({ status: 1, 'feeRange.min': 1 });
collegeSchema.index({ examsAccepted: 1, status: 1 });
collegeSchema.index({ courses: 1, status: 1 });
collegeSchema.index({ categories: 1, status: 1 });
collegeSchema.index({ 'placement.averagePackage': -1 });

collegeSchema.virtual('locationLabel').get(function (this: CollegeDoc) {
    return [this.cityName, this.stateName].filter(Boolean).join(', ');
});

export const College = registerModel<CollegeDoc, Model<CollegeDoc>>('College', collegeSchema);

/* ============================ CollegeCourse ============================= */

export interface CollegeCourseDoc {
    _id: Types.ObjectId;
    college: Types.ObjectId;
    collegeName: string;
    collegeSlug: string;
    course: Types.ObjectId;
    courseName: string;
    specialization?: Types.ObjectId;
    specializationName?: string;
    level: string;
    durationLabel: string;
    studyMode: string;
    totalSeats?: number;
    annualFee?: number;
    totalFee?: number;
    hostelFee?: number;
    eligibility?: string;
    examsAccepted: Types.ObjectId[];
    cutoffSummary?: string;
    admissionOpen: boolean;
    applicationDeadline?: Date;
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

const collegeCourseSchema = new Schema<CollegeCourseDoc>(
    {
        college: { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
        collegeName: { type: String, required: true, trim: true },
        collegeSlug: { type: String, required: true, trim: true },
        course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
        courseName: { type: String, required: true, trim: true },
        specialization: { type: Schema.Types.ObjectId, ref: 'Specialization' },
        specializationName: { type: String, trim: true },
        level: { type: String, required: true, trim: true },
        durationLabel: { type: String, required: true, trim: true },
        studyMode: { type: String, enum: STUDY_MODES, default: 'Full Time' },
        totalSeats: { type: Number, min: 0 },
        annualFee: { type: Number, min: 0 },
        totalFee: { type: Number, min: 0 },
        hostelFee: { type: Number, min: 0 },
        eligibility: { type: String, trim: true, maxlength: 2000 },
        examsAccepted: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
        cutoffSummary: { type: String, trim: true, maxlength: 1000 },
        admissionOpen: { type: Boolean, default: true },
        applicationDeadline: Date,
        status: statusField,
    },
    baseSchemaOptions,
);

collegeCourseSchema.plugin(auditPlugin);
collegeCourseSchema.index({ college: 1, course: 1, specialization: 1 }, { unique: true });
collegeCourseSchema.index({ course: 1, annualFee: 1 });
collegeCourseSchema.index({ course: 1, status: 1 });

export const CollegeCourse = registerModel<CollegeCourseDoc, Model<CollegeCourseDoc>>(
    'CollegeCourse',
    collegeCourseSchema,
);

/* =============================== Ranking ================================ */

export interface RankingDoc {
    _id: Types.ObjectId;
    publisher: string;
    year: number;
    categoryName: string;
    college: Types.ObjectId;
    collegeName: string;
    rank: number;
    score?: number;
    sourceUrl?: string;
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

const rankingSchema = new Schema<RankingDoc>(
    {
        publisher: { type: String, required: true, trim: true, maxlength: 120 },
        year: { type: Number, required: true, min: 2000, max: 2100, index: true },
        categoryName: { type: String, required: true, trim: true, maxlength: 120 },
        college: { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
        collegeName: { type: String, required: true, trim: true },
        rank: { type: Number, required: true, min: 1 },
        score: { type: Number, min: 0 },
        sourceUrl: { type: String, trim: true },
        status: statusField,
    },
    baseSchemaOptions,
);

rankingSchema.plugin(auditPlugin);
rankingSchema.index({ publisher: 1, year: -1, categoryName: 1, rank: 1 });
rankingSchema.index({ college: 1, year: -1 });

export const Ranking = registerModel<RankingDoc, Model<RankingDoc>>('Ranking', rankingSchema);
