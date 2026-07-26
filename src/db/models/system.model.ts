import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import { NOTIFICATION_CHANNELS, SEARCH_ENTITY_TYPES } from '@/config/constants';
import { auditPlugin, baseSchemaOptions, registerModel, statusField } from './shared/base';

/* ============================== Notification ============================ */

export interface NotificationDoc {
    _id: Types.ObjectId;
    user?: Types.ObjectId;
    audience: 'user' | 'staff' | 'broadcast';
    event: string;
    channel: string;
    title: string;
    body: string;
    actionUrl?: string;
    payload?: Record<string, unknown>;
    state: 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled';
    attempts: number;
    lastError?: string;
    scheduledFor?: Date;
    sentAt?: Date;
    readAt?: Date;
    dedupeKey?: string;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        audience: { type: String, enum: ['user', 'staff', 'broadcast'], default: 'user' },
        event: { type: String, required: true, trim: true, index: true },
        channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        body: { type: String, required: true, trim: true, maxlength: 4000 },
        actionUrl: { type: String, trim: true },
        payload: { type: Schema.Types.Mixed },
        state: {
            type: String,
            enum: ['queued', 'processing', 'sent', 'failed', 'cancelled'],
            default: 'queued',
            index: true,
        },
        attempts: { type: Number, default: 0, min: 0 },
        lastError: { type: String, trim: true, maxlength: 1000 },
        scheduledFor: { type: Date, index: true },
        sentAt: Date,
        readAt: Date,
        dedupeKey: { type: String, trim: true },
    },
    baseSchemaOptions,
);

notificationSchema.index({ state: 1, scheduledFor: 1 });
notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

export const Notification = registerModel<NotificationDoc, Model<NotificationDoc>>(
    'Notification',
    notificationSchema,
);

/* ============================= EmailTemplate ============================ */

export interface EmailTemplateDoc {
    _id: Types.ObjectId;
    key: string;
    name: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    availableVariables: string[];
    fromOverride?: string;
    ccEmails: string[];
    bccEmails: string[];
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

const emailTemplateSchema = new Schema<EmailTemplateDoc>(
    {
        key: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true, maxlength: 160 },
        subject: { type: String, required: true, trim: true, maxlength: 250 },
        bodyHtml: { type: String, required: true, maxlength: 60000 },
        bodyText: { type: String, maxlength: 20000 },
        availableVariables: { type: [String], default: [] },
        fromOverride: { type: String, trim: true },
        ccEmails: { type: [String], default: [] },
        bccEmails: { type: [String], default: [] },
        status: statusField,
    },
    baseSchemaOptions,
);

emailTemplateSchema.plugin(auditPlugin);

export const EmailTemplate = registerModel<EmailTemplateDoc, Model<EmailTemplateDoc>>(
    'EmailTemplate',
    emailTemplateSchema,
);

/* =========================== WhatsAppTemplate =========================== */

export interface WhatsAppTemplateDoc {
    _id: Types.ObjectId;
    key: string;
    name: string;
    providerTemplateName?: string;
    language: string;
    bodyText: string;
    availableVariables: string[];
    approvalStatus: 'draft' | 'submitted' | 'approved' | 'rejected';
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

const whatsappTemplateSchema = new Schema<WhatsAppTemplateDoc>(
    {
        key: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true, maxlength: 160 },
        providerTemplateName: { type: String, trim: true },
        language: { type: String, default: 'en', trim: true },
        bodyText: { type: String, required: true, maxlength: 4000 },
        availableVariables: { type: [String], default: [] },
        approvalStatus: {
            type: String,
            enum: ['draft', 'submitted', 'approved', 'rejected'],
            default: 'draft',
        },
        status: statusField,
    },
    baseSchemaOptions,
);

whatsappTemplateSchema.plugin(auditPlugin);

export const WhatsAppTemplate = registerModel<WhatsAppTemplateDoc, Model<WhatsAppTemplateDoc>>(
    'WhatsAppTemplate',
    whatsappTemplateSchema,
);

/* ============================== SearchQuery ============================= */

export interface SearchQueryDoc {
    _id: Types.ObjectId;
    term: string;
    normalizedTerm: string;
    resultCount: number;
    zeroResults: boolean;
    clickedEntityType?: string;
    clickedEntityId?: Types.ObjectId;
    clickedUrl?: string;
    user?: Types.ObjectId;
    anonymousId?: string;
    scope?: string;
    createdAt: Date;
    updatedAt: Date;
}

const searchQuerySchema = new Schema<SearchQueryDoc>(
    {
        term: { type: String, required: true, trim: true, maxlength: 200 },
        normalizedTerm: { type: String, required: true, trim: true, lowercase: true, index: true },
        resultCount: { type: Number, default: 0 },
        zeroResults: { type: Boolean, default: false, index: true },
        clickedEntityType: { type: String, enum: SEARCH_ENTITY_TYPES },
        clickedEntityId: Schema.Types.ObjectId,
        clickedUrl: { type: String, trim: true },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        anonymousId: { type: String, trim: true },
        scope: { type: String, trim: true },
    },
    baseSchemaOptions,
);

searchQuerySchema.index({ createdAt: -1 });
searchQuerySchema.index({ normalizedTerm: 1, createdAt: -1 });

export const SearchQuery = registerModel<SearchQueryDoc, Model<SearchQueryDoc>>(
    'SearchQuery',
    searchQuerySchema,
);

/* ============================ SearchSynonym ============================= */

export interface SearchSynonymDoc {
    _id: Types.ObjectId;
    term: string;
    synonyms: string[];
    promotedEntityType?: string;
    promotedEntityId?: Types.ObjectId;
    promotedLabel?: string;
    promotedUrl?: string;
    status: 'active' | 'inactive' | 'archived';
    createdAt: Date;
    updatedAt: Date;
}

const searchSynonymSchema = new Schema<SearchSynonymDoc>(
    {
        term: { type: String, required: true, unique: true, trim: true, lowercase: true },
        synonyms: { type: [String], default: [] },
        promotedEntityType: { type: String, enum: SEARCH_ENTITY_TYPES },
        promotedEntityId: Schema.Types.ObjectId,
        promotedLabel: { type: String, trim: true },
        promotedUrl: { type: String, trim: true },
        status: statusField,
    },
    baseSchemaOptions,
);

searchSynonymSchema.plugin(auditPlugin);

export const SearchSynonym = registerModel<SearchSynonymDoc, Model<SearchSynonymDoc>>(
    'SearchSynonym',
    searchSynonymSchema,
);

/* =============================== SavedItem ============================== */

export interface SavedItemDoc {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    entityType: 'college' | 'course' | 'exam' | 'article' | 'scholarship' | 'comparison' | 'resource';
    entityId: Types.ObjectId;
    entityName: string;
    entitySlug: string;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}

const savedItemSchema = new Schema<SavedItemDoc>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        entityType: {
            type: String,
            enum: ['college', 'course', 'exam', 'article', 'scholarship', 'comparison', 'resource'],
            required: true,
        },
        entityId: { type: Schema.Types.ObjectId, required: true },
        entityName: { type: String, required: true, trim: true },
        entitySlug: { type: String, required: true, trim: true },
        note: { type: String, trim: true, maxlength: 600 },
    },
    baseSchemaOptions,
);

savedItemSchema.index({ user: 1, entityType: 1, entityId: 1 }, { unique: true });
savedItemSchema.index({ user: 1, createdAt: -1 });

export const SavedItem = registerModel<SavedItemDoc, Model<SavedItemDoc>>(
    'SavedItem',
    savedItemSchema,
);

/* ============================== Comparison ============================== */

export interface ComparisonDoc {
    _id: Types.ObjectId;
    shareId: string;
    user?: Types.ObjectId;
    anonymousId?: string;
    colleges: Types.ObjectId[];
    collegeSlugs: string[];
    title?: string;
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const comparisonSchema = new Schema<ComparisonDoc>(
    {
        shareId: { type: String, required: true, unique: true, trim: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        anonymousId: { type: String, trim: true },
        colleges: [{ type: Schema.Types.ObjectId, ref: 'College' }],
        collegeSlugs: { type: [String], default: [] },
        title: { type: String, trim: true, maxlength: 200 },
        viewCount: { type: Number, default: 0 },
    },
    baseSchemaOptions,
);

comparisonSchema.index({ createdAt: -1 });

export const Comparison = registerModel<ComparisonDoc, Model<ComparisonDoc>>(
    'Comparison',
    comparisonSchema,
);

/* =============================== AuditLog =============================== */

export interface AuditLogDoc {
    _id: Types.ObjectId;
    actor?: Types.ObjectId;
    actorName?: string;
    actorRoles: string[];
    action: string;
    entity: string;
    entityId?: string;
    entityLabel?: string;
    previousValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipHash?: string;
    userAgent?: string;
    requestId?: string;
    outcome: 'success' | 'failure' | 'denied';
    message?: string;
    createdAt: Date;
    updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLogDoc>(
    {
        actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        actorName: { type: String, trim: true },
        actorRoles: { type: [String], default: [] },
        action: { type: String, required: true, trim: true, index: true },
        entity: { type: String, required: true, trim: true, index: true },
        entityId: { type: String, trim: true },
        entityLabel: { type: String, trim: true, maxlength: 240 },
        previousValues: { type: Schema.Types.Mixed },
        newValues: { type: Schema.Types.Mixed },
        /** Hashed, never the raw IP. */
        ipHash: { type: String, trim: true },
        userAgent: { type: String, trim: true, maxlength: 400 },
        requestId: { type: String, trim: true, index: true },
        outcome: { type: String, enum: ['success', 'failure', 'denied'], default: 'success' },
        message: { type: String, trim: true, maxlength: 1000 },
    },
    baseSchemaOptions,
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

export const AuditLog = registerModel<AuditLogDoc, Model<AuditLogDoc>>('AuditLog', auditLogSchema);

/* =========================== AnalyticsEvent ============================= */

export interface AnalyticsEventDoc {
    _id: Types.ObjectId;
    name: string;
    entityType?: string;
    entityId?: Types.ObjectId;
    entitySlug?: string;
    path?: string;
    referrer?: string;
    user?: Types.ObjectId;
    anonymousId?: string;
    sessionId?: string;
    device?: 'mobile' | 'tablet' | 'desktop';
    properties?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const analyticsEventSchema = new Schema<AnalyticsEventDoc>(
    {
        name: { type: String, required: true, trim: true, index: true },
        entityType: { type: String, trim: true },
        entityId: Schema.Types.ObjectId,
        entitySlug: { type: String, trim: true },
        path: { type: String, trim: true, maxlength: 400 },
        referrer: { type: String, trim: true, maxlength: 400 },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        anonymousId: { type: String, trim: true },
        sessionId: { type: String, trim: true },
        device: { type: String, enum: ['mobile', 'tablet', 'desktop'] },
        properties: { type: Schema.Types.Mixed },
    },
    baseSchemaOptions,
);

analyticsEventSchema.index({ name: 1, createdAt: -1 });
analyticsEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
analyticsEventSchema.index({ createdAt: -1 });

export const AnalyticsEvent = registerModel<AnalyticsEventDoc, Model<AnalyticsEventDoc>>(
    'AnalyticsEvent',
    analyticsEventSchema,
);

/* ============================== AiConversation =========================== */

export interface AiConversationDoc {
    _id: Types.ObjectId;
    sessionId: string;
    user?: Types.ObjectId;
    anonymousId?: string;
    messages: {
        role: 'user' | 'assistant' | 'system';
        content: string;
        sources?: { label: string; url: string }[];
        createdAt: Date;
        flagged?: boolean;
    }[];
    consentGiven: boolean;
    handedOffToCounsellor: boolean;
    lead?: Types.ObjectId;
    provider?: string;
    model?: string;
    tokensUsed?: number;
    createdAt: Date;
    updatedAt: Date;
}

const aiConversationSchema = new Schema<AiConversationDoc>(
    {
        sessionId: { type: String, required: true, unique: true, trim: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        anonymousId: { type: String, trim: true, index: true },
        messages: {
            type: [
                new Schema(
                    {
                        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
                        content: { type: String, required: true, maxlength: 8000 },
                        sources: {
                            type: [new Schema({ label: String, url: String }, { _id: false })],
                            default: [],
                        },
                        createdAt: { type: Date, default: () => new Date() },
                        flagged: { type: Boolean, default: false },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
        consentGiven: { type: Boolean, default: false },
        handedOffToCounsellor: { type: Boolean, default: false },
        lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
        provider: { type: String, trim: true },
        model: { type: String, trim: true },
        tokensUsed: { type: Number, min: 0 },
    },
    baseSchemaOptions,
);

aiConversationSchema.index({ createdAt: -1 });

export const AiConversation = registerModel<AiConversationDoc, Model<AiConversationDoc>>(
    'AiConversation',
    aiConversationSchema,
);

/* ========================= LoanCalculationHistory ======================== */

export interface LoanCalculationDoc {
    _id: Types.ObjectId;
    user?: Types.ObjectId;
    anonymousId?: string;
    courseFee?: number;
    loanAmount: number;
    interestRate: number;
    tenureMonths: number;
    moratoriumMonths: number;
    processingFeePercent?: number;
    emi: number;
    totalInterest: number;
    totalRepayment: number;
    provider?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const loanCalculationSchema = new Schema<LoanCalculationDoc>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        anonymousId: { type: String, trim: true },
        courseFee: { type: Number, min: 0 },
        loanAmount: { type: Number, required: true, min: 0 },
        interestRate: { type: Number, required: true, min: 0, max: 100 },
        tenureMonths: { type: Number, required: true, min: 1, max: 360 },
        moratoriumMonths: { type: Number, default: 0, min: 0, max: 120 },
        processingFeePercent: { type: Number, min: 0, max: 100 },
        emi: { type: Number, required: true, min: 0 },
        totalInterest: { type: Number, required: true, min: 0 },
        totalRepayment: { type: Number, required: true, min: 0 },
        provider: { type: Schema.Types.ObjectId, ref: 'LoanProvider' },
    },
    baseSchemaOptions,
);

loanCalculationSchema.index({ user: 1, createdAt: -1 });

export const LoanCalculation = registerModel<LoanCalculationDoc, Model<LoanCalculationDoc>>(
    'LoanCalculation',
    loanCalculationSchema,
);
