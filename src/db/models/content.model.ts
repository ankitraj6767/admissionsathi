import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import { RESOURCE_TYPES, TRENDING_CATEGORIES } from '@/config/constants';
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

/* ================================ Article =============================== */

export interface RevisionEntry {
    version: number;
    title: string;
    contentHtml: string;
    savedBy?: Types.ObjectId;
    savedAt: Date;
    note?: string;
}

export interface ArticleDoc {
    _id: Types.ObjectId;
    title: string;
    slug: string;
    slugHistory: { slug: string; changedAt: Date }[];
    excerpt?: string;
    contentHtml: string;
    featuredImage?: ImageRef;
    category: string;
    tags: string[];
    author?: Types.ObjectId;
    authorName?: string;
    reviewer?: Types.ObjectId;
    readingTimeMinutes: number;
    relatedColleges: Types.ObjectId[];
    relatedCourses: Types.ObjectId[];
    relatedExams: Types.ObjectId[];
    relatedArticles: Types.ObjectId[];
    faqs: FaqItem[];
    tableOfContents: { id: string; label: string; level: number }[];
    isFeatured: boolean;
    isTrending: boolean;
    viewCount: number;
    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
    publishedAt?: Date;
    scheduledFor?: Date;
    revisions: RevisionEntry[];
    seo?: SeoMeta;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const revisionSchema = new Schema<RevisionEntry>(
    {
        version: { type: Number, required: true },
        title: { type: String, required: true },
        contentHtml: { type: String, required: true },
        savedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        savedAt: { type: Date, default: () => new Date() },
        note: { type: String, trim: true, maxlength: 300 },
    },
    { _id: false },
);

const tocSchema = new Schema(
    {
        id: { type: String, required: true },
        label: { type: String, required: true },
        level: { type: Number, default: 2 },
    },
    { _id: false },
);

const articleSchema = new Schema<ArticleDoc>(
    {
        title: { type: String, required: true, trim: true, maxlength: 250 },
        slug: { ...slugField, unique: true },
        slugHistory: { type: [slugHistorySchema], default: [] },
        excerpt: { type: String, trim: true, maxlength: 500 },
        contentHtml: { type: String, required: true, maxlength: 200000 },
        featuredImage: imageSchema,
        category: { type: String, required: true, trim: true, index: true },
        tags: { type: [String], default: [], index: true },
        author: { type: Schema.Types.ObjectId, ref: 'User' },
        authorName: { type: String, trim: true },
        reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
        readingTimeMinutes: { type: Number, default: 3, min: 1 },
        relatedColleges: [{ type: Schema.Types.ObjectId, ref: 'College' }],
        relatedCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
        relatedExams: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
        relatedArticles: [{ type: Schema.Types.ObjectId, ref: 'Article' }],
        faqs: { type: [faqItemSchema], default: [] },
        tableOfContents: { type: [tocSchema], default: [] },
        isFeatured: { type: Boolean, default: false, index: true },
        isTrending: { type: Boolean, default: false },
        viewCount: { type: Number, default: 0 },
        status: contentStatusField,
        publishedAt: { type: Date, index: true },
        scheduledFor: Date,
        revisions: { type: [revisionSchema], default: [], select: false },
        seo: seoSchema,
    },
    baseSchemaOptions,
);

articleSchema.plugin(auditPlugin);
articleSchema.plugin(softDeletePlugin);
articleSchema.plugin(optimisticConcurrency);
articleSchema.index({ title: 'text', excerpt: 'text', tags: 'text' }, { name: 'article_search' });
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ status: 1, category: 1, publishedAt: -1 });

export const Article = registerModel<ArticleDoc, Model<ArticleDoc>>('Article', articleSchema);

/* =============================== NewsPost =============================== */

export interface NewsPostDoc {
    _id: Types.ObjectId;
    title: string;
    slug: string;
    summary?: string;
    contentHtml?: string;
    category: string;
    badge?: 'New' | 'Hot' | 'Live' | 'Update' | 'Closing Soon';
    priority: number;
    publishDate: Date;
    expiryDate?: Date;
    externalUrl?: string;
    internalUrl?: string;
    targetExam?: Types.ObjectId;
    targetExamName?: string;
    targetState?: Types.ObjectId;
    targetStateName?: string;
    targetCollege?: Types.ObjectId;
    isFeatured: boolean;
    showInTrending: boolean;
    viewCount: number;
    clickCount: number;
    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
    seo?: SeoMeta;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const newsPostSchema = new Schema<NewsPostDoc>(
    {
        title: { type: String, required: true, trim: true, maxlength: 250 },
        slug: { ...slugField, unique: true },
        summary: { type: String, trim: true, maxlength: 600 },
        contentHtml: { type: String, maxlength: 60000 },
        category: { type: String, enum: TRENDING_CATEGORIES, required: true, index: true },
        badge: { type: String, enum: ['New', 'Hot', 'Live', 'Update', 'Closing Soon'] },
        priority: { type: Number, default: 0, index: true },
        publishDate: { type: Date, required: true, default: () => new Date(), index: true },
        expiryDate: { type: Date, index: true },
        externalUrl: { type: String, trim: true },
        internalUrl: { type: String, trim: true },
        targetExam: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
        targetExamName: { type: String, trim: true },
        targetState: { type: Schema.Types.ObjectId, ref: 'State' },
        targetStateName: { type: String, trim: true },
        targetCollege: { type: Schema.Types.ObjectId, ref: 'College' },
        isFeatured: { type: Boolean, default: false, index: true },
        showInTrending: { type: Boolean, default: true, index: true },
        viewCount: { type: Number, default: 0 },
        clickCount: { type: Number, default: 0 },
        status: contentStatusField,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

newsPostSchema.plugin(auditPlugin);
newsPostSchema.plugin(softDeletePlugin);
newsPostSchema.index({ status: 1, showInTrending: 1, priority: -1, publishDate: -1 });
newsPostSchema.index({ title: 'text', summary: 'text' }, { name: 'news_search' });

export const NewsPost = registerModel<NewsPostDoc, Model<NewsPostDoc>>('NewsPost', newsPostSchema);

/* =============================== Resource =============================== */

export interface ResourceDoc {
    _id: Types.ObjectId;
    title: string;
    slug: string;
    type: string;
    description?: string;
    contentHtml?: string;
    fileUrl?: string;
    fileSizeKb?: number;
    fileType?: string;
    thumbnail?: ImageRef;
    externalUrl?: string;
    videoUrl?: string;
    relatedExam?: Types.ObjectId;
    relatedExamName?: string;
    relatedCourse?: Types.ObjectId;
    relatedState?: Types.ObjectId;
    year?: number;
    subject?: string;
    durationMinutes?: number;
    questionCount?: number;
    difficulty?: 'Easy' | 'Moderate' | 'Hard';
    requiresLogin: boolean;
    isFree: boolean;
    price?: number;
    webinarAt?: Date;
    speakerName?: string;
    downloadCount: number;
    viewCount: number;
    isFeatured: boolean;
    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
    publishedAt?: Date;
    seo?: SeoMeta;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const resourceSchema = new Schema<ResourceDoc>(
    {
        title: { type: String, required: true, trim: true, maxlength: 250 },
        slug: { ...slugField, unique: true },
        type: { type: String, enum: RESOURCE_TYPES, required: true, index: true },
        description: { type: String, trim: true, maxlength: 1500 },
        contentHtml: { type: String, maxlength: 100000 },
        fileUrl: { type: String, trim: true },
        fileSizeKb: { type: Number, min: 0 },
        fileType: { type: String, trim: true },
        thumbnail: imageSchema,
        externalUrl: { type: String, trim: true },
        videoUrl: { type: String, trim: true },
        relatedExam: { type: Schema.Types.ObjectId, ref: 'Exam', index: true },
        relatedExamName: { type: String, trim: true },
        relatedCourse: { type: Schema.Types.ObjectId, ref: 'Course' },
        relatedState: { type: Schema.Types.ObjectId, ref: 'State' },
        year: { type: Number, min: 1990, max: 2100 },
        subject: { type: String, trim: true },
        durationMinutes: { type: Number, min: 1 },
        questionCount: { type: Number, min: 1 },
        difficulty: { type: String, enum: ['Easy', 'Moderate', 'Hard'] },
        requiresLogin: { type: Boolean, default: false },
        isFree: { type: Boolean, default: true },
        price: { type: Number, min: 0 },
        webinarAt: Date,
        speakerName: { type: String, trim: true },
        downloadCount: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },
        isFeatured: { type: Boolean, default: false },
        status: contentStatusField,
        publishedAt: Date,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

resourceSchema.plugin(auditPlugin);
resourceSchema.plugin(softDeletePlugin);
resourceSchema.index({ status: 1, type: 1, publishedAt: -1 });
resourceSchema.index({ title: 'text', description: 'text' }, { name: 'resource_search' });

export const Resource = registerModel<ResourceDoc, Model<ResourceDoc>>('Resource', resourceSchema);

/* ================================== FAQ ================================= */

export interface FaqDoc {
    _id: Types.ObjectId;
    question: string;
    answerHtml: string;
    category: string;
    scope: 'global' | 'college' | 'course' | 'exam' | 'loan' | 'counselling' | 'predictor';
    entityId?: Types.ObjectId;
    displayOrder: number;
    isFeatured: boolean;
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

const faqSchema = new Schema<FaqDoc>(
    {
        question: { type: String, required: true, trim: true, maxlength: 300 },
        answerHtml: { type: String, required: true, maxlength: 8000 },
        category: { type: String, required: true, trim: true, index: true },
        scope: {
            type: String,
            enum: ['global', 'college', 'course', 'exam', 'loan', 'counselling', 'predictor'],
            default: 'global',
            index: true,
        },
        entityId: { type: Schema.Types.ObjectId },
        displayOrder: { type: Number, default: 0 },
        isFeatured: { type: Boolean, default: false },
        status: statusField,
    },
    baseSchemaOptions,
);

faqSchema.plugin(auditPlugin);
faqSchema.index({ scope: 1, entityId: 1, displayOrder: 1 });

export const FAQ = registerModel<FaqDoc, Model<FaqDoc>>('FAQ', faqSchema);

/* ================================ Review ================================ */

export interface ReviewDoc {
    _id: Types.ObjectId;
    college: Types.ObjectId;
    collegeName: string;
    collegeSlug: string;
    user?: Types.ObjectId;
    authorName: string;
    isAnonymous: boolean;
    email?: string;
    course?: Types.ObjectId;
    courseName?: string;
    passingYear?: number;
    title: string;
    reviewText: string;
    pros?: string;
    cons?: string;
    ratings: {
        overall: number;
        placement: number;
        faculty: number;
        infrastructure: number;
        campusLife: number;
        valueForMoney: number;
    };
    helpfulCount: number;
    verificationStatus: 'unverified' | 'email_verified' | 'document_verified';
    moderationStatus: 'pending' | 'approved' | 'rejected' | 'hidden';
    moderationNote?: string;
    moderatedBy?: Types.ObjectId;
    moderatedAt?: Date;
    isFeatured: boolean;
    ipHash?: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDoc>(
    {
        college: { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
        collegeName: { type: String, required: true, trim: true },
        collegeSlug: { type: String, required: true, trim: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        authorName: { type: String, required: true, trim: true, maxlength: 120 },
        isAnonymous: { type: Boolean, default: false },
        email: { type: String, trim: true, lowercase: true, select: false },
        course: { type: Schema.Types.ObjectId, ref: 'Course' },
        courseName: { type: String, trim: true },
        passingYear: { type: Number, min: 1980, max: 2100 },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        reviewText: { type: String, required: true, trim: true, minlength: 40, maxlength: 6000 },
        pros: { type: String, trim: true, maxlength: 1500 },
        cons: { type: String, trim: true, maxlength: 1500 },
        ratings: {
            overall: { type: Number, required: true, min: 1, max: 5 },
            placement: { type: Number, required: true, min: 1, max: 5 },
            faculty: { type: Number, required: true, min: 1, max: 5 },
            infrastructure: { type: Number, required: true, min: 1, max: 5 },
            campusLife: { type: Number, required: true, min: 1, max: 5 },
            valueForMoney: { type: Number, required: true, min: 1, max: 5 },
        },
        helpfulCount: { type: Number, default: 0, min: 0 },
        verificationStatus: {
            type: String,
            enum: ['unverified', 'email_verified', 'document_verified'],
            default: 'unverified',
        },
        moderationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'hidden'],
            default: 'pending',
            index: true,
        },
        moderationNote: { type: String, trim: true, maxlength: 600 },
        moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        moderatedAt: Date,
        isFeatured: { type: Boolean, default: false },
        ipHash: { type: String, select: false },
    },
    baseSchemaOptions,
);

reviewSchema.plugin(auditPlugin);
reviewSchema.plugin(softDeletePlugin);
reviewSchema.index({ college: 1, moderationStatus: 1, createdAt: -1 });
reviewSchema.index({ moderationStatus: 1, createdAt: -1 });

export const Review = registerModel<ReviewDoc, Model<ReviewDoc>>('Review', reviewSchema);
