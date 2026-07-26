import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import { HOMEPAGE_SECTION_KEYS } from '@/config/constants';
import {
    auditPlugin,
    baseSchemaOptions,
    contentStatusField,
    registerModel,
    seoSchema,
    slugField,
    slugHistorySchema,
    softDeletePlugin,
    statusField,
    type SeoMeta,
} from './shared/base';

/* ============================ NavigationMenu ============================ */

export interface NavigationMenuDoc {
    _id: Types.ObjectId;
    key: string;
    name: string;
    location: 'header' | 'footer' | 'mobile' | 'utility' | 'admin' | 'legal' | 'social';
    description?: string;
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

const navigationMenuSchema = new Schema<NavigationMenuDoc>(
    {
        key: { type: String, required: true, unique: true, trim: true, lowercase: true },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        location: {
            type: String,
            enum: ['header', 'footer', 'mobile', 'utility', 'admin', 'legal', 'social'],
            required: true,
            index: true,
        },
        description: { type: String, trim: true, maxlength: 400 },
        status: statusField,
    },
    baseSchemaOptions,
);

navigationMenuSchema.plugin(auditPlugin);

export const NavigationMenu = registerModel<NavigationMenuDoc, Model<NavigationMenuDoc>>(
    'NavigationMenu',
    navigationMenuSchema,
);

/* ============================ NavigationItem ============================ */

export interface NavigationItemDoc {
    _id: Types.ObjectId;
    menu: Types.ObjectId;
    menuKey: string;
    parent?: Types.ObjectId | null;
    label: string;
    url: string;
    icon?: string;
    description?: string;
    /** mega = renders a wide dropdown panel, dropdown = simple list, link = plain */
    itemType: 'link' | 'dropdown' | 'mega' | 'heading' | 'button';
    columnGroup?: string;
    badge?: string;
    /** Renders the small "New" pill. Named `hasNewBadge` because `isNew` is reserved by Mongoose. */
    hasNewBadge: boolean;
    isFeatured: boolean;
    openInNewTab: boolean;
    visibility: 'public' | 'authenticated' | 'guest' | 'staff';
    requiredPermission?: string;
    displayOrder: number;
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

const navigationItemSchema = new Schema<NavigationItemDoc>(
    {
        menu: { type: Schema.Types.ObjectId, ref: 'NavigationMenu', required: true, index: true },
        menuKey: { type: String, required: true, trim: true, index: true },
        parent: { type: Schema.Types.ObjectId, ref: 'NavigationItem', default: null, index: true },
        label: { type: String, required: true, trim: true, maxlength: 120 },
        url: { type: String, required: true, trim: true, maxlength: 400 },
        icon: { type: String, trim: true, maxlength: 60 },
        description: { type: String, trim: true, maxlength: 240 },
        itemType: {
            type: String,
            enum: ['link', 'dropdown', 'mega', 'heading', 'button'],
            default: 'link',
        },
        columnGroup: { type: String, trim: true, maxlength: 80 },
        badge: { type: String, trim: true, maxlength: 20 },
        hasNewBadge: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false },
        openInNewTab: { type: Boolean, default: false },
        visibility: {
            type: String,
            enum: ['public', 'authenticated', 'guest', 'staff'],
            default: 'public',
        },
        requiredPermission: { type: String, trim: true },
        displayOrder: { type: Number, default: 0 },
        status: statusField,
    },
    baseSchemaOptions,
);

navigationItemSchema.plugin(auditPlugin);
navigationItemSchema.index({ menuKey: 1, status: 1, parent: 1, displayOrder: 1 });

export const NavigationItem = registerModel<NavigationItemDoc, Model<NavigationItemDoc>>(
    'NavigationItem',
    navigationItemSchema,
);

/* ============================ HomepageSection =========================== */

export interface HomepageSectionDoc {
    _id: Types.ObjectId;
    key: string;
    name: string;
    isEnabled: boolean;
    displayOrder: number;
    heading?: string;
    subheading?: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    /** Section-specific configuration, validated by a Zod schema keyed on `key`. */
    config: Record<string, unknown>;
    /** Draft copy used by the preview mode before publishing. */
    draftConfig?: Record<string, unknown>;
    hasUnpublishedChanges: boolean;
    publishedAt?: Date;
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const homepageSectionSchema = new Schema<HomepageSectionDoc>(
    {
        key: { type: String, required: true, unique: true, enum: HOMEPAGE_SECTION_KEYS },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        isEnabled: { type: Boolean, default: true, index: true },
        displayOrder: { type: Number, default: 0, index: true },
        heading: { type: String, trim: true, maxlength: 200 },
        subheading: { type: String, trim: true, maxlength: 300 },
        description: { type: String, trim: true, maxlength: 1000 },
        ctaLabel: { type: String, trim: true, maxlength: 60 },
        ctaUrl: { type: String, trim: true, maxlength: 300 },
        config: { type: Schema.Types.Mixed, default: {} },
        draftConfig: { type: Schema.Types.Mixed },
        hasUnpublishedChanges: { type: Boolean, default: false },
        publishedAt: Date,
    },
    baseSchemaOptions,
);

homepageSectionSchema.plugin(auditPlugin);

export const HomepageSection = registerModel<HomepageSectionDoc, Model<HomepageSectionDoc>>(
    'HomepageSection',
    homepageSectionSchema,
);

/* ============================== SiteSetting ============================= */

export interface SiteSettingDoc {
    _id: Types.ObjectId;
    key: string;
    group:
    | 'general'
    | 'contact'
    | 'social'
    | 'seo'
    | 'integrations'
    | 'ai'
    | 'whatsapp'
    | 'features'
    | 'legal'
    | 'app';
    label: string;
    value: unknown;
    valueType: 'string' | 'number' | 'boolean' | 'json' | 'image' | 'richtext';
    description?: string;
    isPublic: boolean;
    isSecret: boolean;
    displayOrder: number;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const siteSettingSchema = new Schema<SiteSettingDoc>(
    {
        key: { type: String, required: true, unique: true, trim: true },
        group: {
            type: String,
            enum: [
                'general',
                'contact',
                'social',
                'seo',
                'integrations',
                'ai',
                'whatsapp',
                'features',
                'legal',
                'app',
            ],
            required: true,
            index: true,
        },
        label: { type: String, required: true, trim: true, maxlength: 160 },
        value: { type: Schema.Types.Mixed },
        valueType: {
            type: String,
            enum: ['string', 'number', 'boolean', 'json', 'image', 'richtext'],
            default: 'string',
        },
        description: { type: String, trim: true, maxlength: 400 },
        /** Public settings may be sent to Client Components. Secrets never are. */
        isPublic: { type: Boolean, default: true },
        isSecret: { type: Boolean, default: false },
        displayOrder: { type: Number, default: 0 },
    },
    baseSchemaOptions,
);

siteSettingSchema.plugin(auditPlugin);

export const SiteSetting = registerModel<SiteSettingDoc, Model<SiteSettingDoc>>(
    'SiteSetting',
    siteSettingSchema,
);

/* ============================== MediaAsset ============================== */

export interface MediaAssetDoc {
    _id: Types.ObjectId;
    fileName: string;
    originalName: string;
    url: string;
    secureUrl?: string;
    provider: 'local' | 'cloudinary' | 's3';
    providerPublicId?: string;
    mimeType: string;
    kind: 'image' | 'document' | 'video' | 'other';
    sizeBytes: number;
    width?: number;
    height?: number;
    blurDataUrl?: string;
    folder: string;
    tags: string[];
    altText?: string;
    caption?: string;
    usageCount: number;
    usedIn: { model: string; documentId: Types.ObjectId; field?: string }[];
    uploadedBy?: Types.ObjectId;
    isDeleted: boolean;
    deletedAt?: Date | null;
    deletedBy?: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const mediaAssetSchema = new Schema<MediaAssetDoc>(
    {
        fileName: { type: String, required: true, trim: true },
        originalName: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        secureUrl: { type: String, trim: true },
        provider: { type: String, enum: ['local', 'cloudinary', 's3'], default: 'local' },
        providerPublicId: { type: String, trim: true },
        mimeType: { type: String, required: true, trim: true },
        kind: { type: String, enum: ['image', 'document', 'video', 'other'], default: 'image', index: true },
        sizeBytes: { type: Number, required: true, min: 0 },
        width: Number,
        height: Number,
        blurDataUrl: String,
        folder: { type: String, default: '/', trim: true, index: true },
        tags: { type: [String], default: [], index: true },
        altText: { type: String, trim: true, maxlength: 300 },
        caption: { type: String, trim: true, maxlength: 300 },
        usageCount: { type: Number, default: 0, min: 0 },
        usedIn: {
            type: [
                new Schema(
                    {
                        model: { type: String, required: true },
                        documentId: { type: Schema.Types.ObjectId, required: true },
                        field: String,
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    baseSchemaOptions,
);

mediaAssetSchema.plugin(softDeletePlugin);
mediaAssetSchema.index({ originalName: 'text', tags: 'text', altText: 'text' });
mediaAssetSchema.index({ createdAt: -1 });

export const MediaAsset = registerModel<MediaAssetDoc, Model<MediaAssetDoc>>(
    'MediaAsset',
    mediaAssetSchema,
);

/* ============================== StaticPage ============================== */

/**
 * Editor-managed standalone page (about, contact, careers, legal…).
 *
 * These pages have no domain model of their own — they are pure content — so
 * they live in one collection and render through the `/[pageSlug]` route.
 * Keeping them in the database means the footer/company/legal links in the
 * navigation builder always resolve to real, editable content.
 */
export interface StaticPageDoc {
    _id: Types.ObjectId;
    title: string;
    slug: string;
    /** Grouping used by the admin list and the footer. */
    group: 'company' | 'legal' | 'support' | 'other';
    excerpt?: string;
    contentHtml: string;
    heroEyebrow?: string;
    /** Rendered under the title, e.g. "Last updated 12 Mar 2026". */
    showLastUpdated: boolean;
    displayOrder: number;
    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
    publishedAt?: Date;
    seo?: SeoMeta;
    slugHistory: { slug: string; changedAt: Date }[];
    isDeleted: boolean;
    deletedAt?: Date | null;
    deletedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Slugs that belong to a real route and must never be claimed by a CMS page,
 * otherwise `/[pageSlug]` would shadow (or be shadowed by) a module route.
 */
export const RESERVED_PAGE_SLUGS = [
    'admin',
    'api',
    'articles',
    'book-counselling',
    'career-counselling',
    'college-counselling',
    'college-reviews',
    'colleges',
    'compare-colleges',
    'counselling',
    'counsellors',
    'course-counselling',
    'courses',
    'dashboard',
    'ebooks',
    'education-loans',
    'exams',
    'faqs',
    'forgot-password',
    'guides',
    'login',
    'mock-tests',
    'news',
    'predictors',
    'previous-year-papers',
    'resources',
    'scholarships',
    'search',
    'signup',
    'sitemap',
    'webinars',
    'ai-assistant',
    '403',
] as const;

const staticPageSchema = new Schema<StaticPageDoc>(
    {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        slug: {
            ...slugField,
            unique: true,
            validate: {
                validator: (value: string) =>
                    !(RESERVED_PAGE_SLUGS as readonly string[]).includes(value),
                message: '"{VALUE}" is reserved by an application route. Choose a different slug.',
            },
        },
        group: {
            type: String,
            enum: ['company', 'legal', 'support', 'other'],
            default: 'company',
            index: true,
        },
        excerpt: { type: String, trim: true, maxlength: 400 },
        contentHtml: { type: String, required: true, maxlength: 120_000 },
        heroEyebrow: { type: String, trim: true, maxlength: 80 },
        showLastUpdated: { type: Boolean, default: false },
        displayOrder: { type: Number, default: 0 },
        status: contentStatusField,
        publishedAt: { type: Date, index: true },
        seo: { type: seoSchema, default: () => ({}) },
        slugHistory: { type: [slugHistorySchema], default: [] },
    },
    baseSchemaOptions,
);

staticPageSchema.plugin(auditPlugin);
staticPageSchema.plugin(softDeletePlugin);
staticPageSchema.index({ status: 1, group: 1, displayOrder: 1 });
staticPageSchema.index({ title: 'text', excerpt: 'text' });

export const StaticPage = registerModel<StaticPageDoc, Model<StaticPageDoc>>(
    'StaticPage',
    staticPageSchema,
);

/* ================================ Redirect ============================== */

export interface RedirectDoc {
    _id: Types.ObjectId;
    source: string;
    destination: string;
    statusCode: 301 | 302 | 307 | 308;
    isRegex: boolean;
    hitCount: number;
    lastHitAt?: Date;
    note?: string;
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

const redirectSchema = new Schema<RedirectDoc>(
    {
        source: { type: String, required: true, unique: true, trim: true, lowercase: true },
        destination: { type: String, required: true, trim: true },
        statusCode: { type: Number, enum: [301, 302, 307, 308], default: 301 },
        isRegex: { type: Boolean, default: false },
        hitCount: { type: Number, default: 0 },
        lastHitAt: Date,
        note: { type: String, trim: true, maxlength: 300 },
        status: statusField,
    },
    baseSchemaOptions,
);

redirectSchema.plugin(auditPlugin);

export const Redirect = registerModel<RedirectDoc, Model<RedirectDoc>>('Redirect', redirectSchema);

/* ============================== FormDefinition =========================== */

export interface FormDefinitionDoc {
    _id: Types.ObjectId;
    key: string;
    name: string;
    slug: string;
    description?: string;
    fields: {
        key: string;
        label: string;
        type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'checkbox' | 'date';
        required: boolean;
        placeholder?: string;
        options?: { label: string; value: string }[];
        displayOrder: number;
    }[];
    submitLabel: string;
    successMessage: string;
    leadSource: string;
    notifyEmails: string[];
    status: 'active' | 'inactive' | 'archived';
    submissionCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const formDefinitionSchema = new Schema<FormDefinitionDoc>(
    {
        key: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true, maxlength: 160 },
        slug: { ...slugField },
        description: { type: String, trim: true, maxlength: 600 },
        fields: {
            type: [
                new Schema(
                    {
                        key: { type: String, required: true, trim: true },
                        label: { type: String, required: true, trim: true },
                        type: {
                            type: String,
                            enum: ['text', 'email', 'tel', 'select', 'textarea', 'checkbox', 'date'],
                            default: 'text',
                        },
                        required: { type: Boolean, default: false },
                        placeholder: String,
                        options: {
                            type: [new Schema({ label: String, value: String }, { _id: false })],
                            default: [],
                        },
                        displayOrder: { type: Number, default: 0 },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
        submitLabel: { type: String, default: 'Submit', trim: true },
        successMessage: { type: String, default: 'Thank you! Our team will contact you shortly.' },
        leadSource: { type: String, default: 'contact_form' },
        notifyEmails: { type: [String], default: [] },
        status: statusField,
        submissionCount: { type: Number, default: 0 },
    },
    baseSchemaOptions,
);

formDefinitionSchema.plugin(auditPlugin);

export const FormDefinition = registerModel<FormDefinitionDoc, Model<FormDefinitionDoc>>(
    'FormDefinition',
    formDefinitionSchema,
);
