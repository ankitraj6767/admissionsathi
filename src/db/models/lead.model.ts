import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES } from '@/config/constants';
import { auditPlugin, baseSchemaOptions, registerModel, softDeletePlugin } from './shared/base';

export interface UtmParams {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
    gclid?: string;
    fbclid?: string;
    referrer?: string;
    landingPage?: string;
}

export interface LeadDoc {
    _id: Types.ObjectId;
    reference: string;
    name: string;
    phone: string;
    phoneNormalized: string;
    email?: string;
    state?: Types.ObjectId;
    stateName?: string;
    city?: Types.ObjectId;
    cityName?: string;
    courseInterest?: Types.ObjectId;
    courseInterestName?: string;
    collegeInterest?: Types.ObjectId;
    collegeInterestName?: string;
    examInterest?: Types.ObjectId;
    examInterestName?: string;
    message?: string;
    preferredTimeLabel?: string;
    source: string;
    sourceDetail?: string;
    campaign?: string;
    utm?: UtmParams;
    assignedTo?: Types.ObjectId;
    assignedToName?: string;
    assignedAt?: Date;
    status: string;
    priority: string;
    score: number;
    followUpAt?: Date;
    lastContactedAt?: Date;
    contactAttempts: number;
    consent: { given: boolean; givenAt?: Date; ipHash?: string; textVersion?: string };
    duplicateOf?: Types.ObjectId;
    isDuplicate: boolean;
    bookings: Types.ObjectId[];
    predictionSession?: Types.ObjectId;
    convertedAt?: Date;
    lostReason?: string;
    idempotencyKey?: string;
    userAgent?: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const utmSchema = new Schema<UtmParams>(
    {
        source: { type: String, trim: true, maxlength: 120 },
        medium: { type: String, trim: true, maxlength: 120 },
        campaign: { type: String, trim: true, maxlength: 160 },
        term: { type: String, trim: true, maxlength: 160 },
        content: { type: String, trim: true, maxlength: 160 },
        gclid: { type: String, trim: true, maxlength: 200 },
        fbclid: { type: String, trim: true, maxlength: 200 },
        referrer: { type: String, trim: true, maxlength: 400 },
        landingPage: { type: String, trim: true, maxlength: 400 },
    },
    { _id: false },
);

const leadSchema = new Schema<LeadDoc>(
    {
        reference: { type: String, required: true, unique: true, trim: true, uppercase: true },
        name: { type: String, required: true, trim: true, maxlength: 140 },
        phone: { type: String, required: true, trim: true, maxlength: 20 },
        /** digits only, last 10 kept — used for duplicate detection */
        phoneNormalized: { type: String, required: true, trim: true, index: true },
        email: { type: String, trim: true, lowercase: true },
        state: { type: Schema.Types.ObjectId, ref: 'State' },
        stateName: { type: String, trim: true },
        city: { type: Schema.Types.ObjectId, ref: 'City' },
        cityName: { type: String, trim: true },
        courseInterest: { type: Schema.Types.ObjectId, ref: 'Course' },
        courseInterestName: { type: String, trim: true },
        collegeInterest: { type: Schema.Types.ObjectId, ref: 'College' },
        collegeInterestName: { type: String, trim: true },
        examInterest: { type: Schema.Types.ObjectId, ref: 'Exam' },
        examInterestName: { type: String, trim: true },
        message: { type: String, trim: true, maxlength: 2000 },
        preferredTimeLabel: { type: String, trim: true, maxlength: 60 },
        source: { type: String, enum: LEAD_SOURCES, required: true, index: true },
        sourceDetail: { type: String, trim: true, maxlength: 200 },
        campaign: { type: String, trim: true, maxlength: 160 },
        utm: utmSchema,
        assignedTo: { type: Schema.Types.ObjectId, ref: 'Counsellor', index: true },
        assignedToName: { type: String, trim: true },
        assignedAt: Date,
        status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
        priority: { type: String, enum: LEAD_PRIORITIES, default: 'medium', index: true },
        score: { type: Number, default: 0, min: 0, max: 100 },
        followUpAt: { type: Date, index: true },
        lastContactedAt: Date,
        contactAttempts: { type: Number, default: 0, min: 0 },
        consent: {
            given: { type: Boolean, required: true, default: false },
            givenAt: Date,
            ipHash: { type: String, trim: true },
            textVersion: { type: String, trim: true, maxlength: 40 },
        },
        duplicateOf: { type: Schema.Types.ObjectId, ref: 'Lead' },
        isDuplicate: { type: Boolean, default: false, index: true },
        bookings: [{ type: Schema.Types.ObjectId, ref: 'CounsellingBooking' }],
        predictionSession: { type: Schema.Types.ObjectId, ref: 'PredictionSession' },
        convertedAt: Date,
        lostReason: { type: String, trim: true, maxlength: 400 },
        idempotencyKey: { type: String, trim: true },
        userAgent: { type: String, trim: true, maxlength: 400 },
    },
    baseSchemaOptions,
);

leadSchema.plugin(auditPlugin);
leadSchema.plugin(softDeletePlugin);

leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1, status: 1, followUpAt: 1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ name: 'text', email: 'text', phone: 'text' }, { name: 'lead_search' });
leadSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
leadSchema.index({ phoneNormalized: 1, source: 1, createdAt: -1 });

export const Lead = registerModel<LeadDoc, Model<LeadDoc>>('Lead', leadSchema);

/* ============================= LeadActivity ============================= */

export interface LeadActivityDoc {
    _id: Types.ObjectId;
    lead: Types.ObjectId;
    type:
    | 'created'
    | 'status_change'
    | 'assignment'
    | 'note'
    | 'call'
    | 'email'
    | 'whatsapp'
    | 'sms'
    | 'booking'
    | 'follow_up'
    | 'system';
    title: string;
    detail?: string;
    fromValue?: string;
    toValue?: string;
    callOutcome?: 'connected' | 'not_answered' | 'busy' | 'wrong_number' | 'switched_off';
    actor?: Types.ObjectId;
    actorName?: string;
    isInternal: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const leadActivitySchema = new Schema<LeadActivityDoc>(
    {
        lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
        type: {
            type: String,
            enum: [
                'created',
                'status_change',
                'assignment',
                'note',
                'call',
                'email',
                'whatsapp',
                'sms',
                'booking',
                'follow_up',
                'system',
            ],
            required: true,
        },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        detail: { type: String, trim: true, maxlength: 4000 },
        fromValue: { type: String, trim: true },
        toValue: { type: String, trim: true },
        callOutcome: {
            type: String,
            enum: ['connected', 'not_answered', 'busy', 'wrong_number', 'switched_off'],
        },
        actor: { type: Schema.Types.ObjectId, ref: 'User' },
        actorName: { type: String, trim: true },
        isInternal: { type: Boolean, default: true },
    },
    baseSchemaOptions,
);

leadActivitySchema.index({ lead: 1, createdAt: -1 });

export const LeadActivity = registerModel<LeadActivityDoc, Model<LeadActivityDoc>>(
    'LeadActivity',
    leadActivitySchema,
);

/* =========================== ContactSubmission ========================== */

export interface ContactSubmissionDoc {
    _id: Types.ObjectId;
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    handled: boolean;
    handledBy?: Types.ObjectId;
    lead?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const contactSubmissionSchema = new Schema<ContactSubmissionDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 140 },
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        subject: { type: String, required: true, trim: true, maxlength: 200 },
        message: { type: String, required: true, trim: true, maxlength: 4000 },
        handled: { type: Boolean, default: false, index: true },
        handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
        lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    },
    baseSchemaOptions,
);

contactSubmissionSchema.index({ createdAt: -1 });

export const ContactSubmission = registerModel<ContactSubmissionDoc, Model<ContactSubmissionDoc>>(
    'ContactSubmission',
    contactSubmissionSchema,
);
