import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import { BOOKING_STATUSES } from '@/config/constants';
import {
    auditPlugin,
    baseSchemaOptions,
    imageSchema,
    registerModel,
    seoSchema,
    slugField,
    softDeletePlugin,
    statusField,
    type ImageRef,
    type SeoMeta,
} from './shared/base';

/* ============================== Counsellor ============================== */

export interface AvailabilitySlot {
    /** 0 = Sunday … 6 = Saturday */
    weekday: number;
    startTime: string; // "10:00"
    endTime: string; // "10:30"
    isActive: boolean;
}

export interface CounsellorDoc {
    _id: Types.ObjectId;
    user?: Types.ObjectId;
    name: string;
    slug: string;
    designation?: string;
    bio?: string;
    photo?: ImageRef;
    email: string;
    phone?: string;
    languages: string[];
    specializations: string[];
    focusCategories: Types.ObjectId[];
    focusStates: Types.ObjectId[];
    experienceYears?: number;
    qualifications: string[];
    rating: { average: number; count: number };
    sessionModes: string[];
    freeSessionMinutes: number;
    paidSessionMinutes?: number;
    paidSessionFee?: number;
    availability: AvailabilitySlot[];
    maxDailyBookings: number;
    meetingLinkTemplate?: string;
    activeLeadCount: number;
    completedSessions: number;
    isAcceptingLeads: boolean;
    isFeatured: boolean;
    displayOrder: number;
    status: 'active' | 'inactive' | 'archived';
    seo?: SeoMeta;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const availabilitySchema = new Schema<AvailabilitySlot>(
    {
        weekday: { type: Number, required: true, min: 0, max: 6 },
        startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
        endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
        isActive: { type: Boolean, default: true },
    },
    { _id: false },
);

const counsellorSchema = new Schema<CounsellorDoc>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        name: { type: String, required: true, trim: true, maxlength: 140 },
        slug: { ...slugField, unique: true },
        designation: { type: String, trim: true, maxlength: 140 },
        bio: { type: String, trim: true, maxlength: 4000 },
        photo: imageSchema,
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        languages: { type: [String], default: ['English', 'Hindi'] },
        specializations: { type: [String], default: [] },
        focusCategories: [{ type: Schema.Types.ObjectId, ref: 'CourseCategory' }],
        focusStates: [{ type: Schema.Types.ObjectId, ref: 'State' }],
        experienceYears: { type: Number, min: 0, max: 60 },
        qualifications: { type: [String], default: [] },
        rating: {
            average: { type: Number, default: 0, min: 0, max: 5 },
            count: { type: Number, default: 0, min: 0 },
        },
        sessionModes: { type: [String], default: ['Video Call', 'Phone Call'] },
        freeSessionMinutes: { type: Number, default: 30, min: 5, max: 240 },
        paidSessionMinutes: { type: Number, min: 5, max: 240 },
        paidSessionFee: { type: Number, min: 0 },
        availability: { type: [availabilitySchema], default: [] },
        maxDailyBookings: { type: Number, default: 8, min: 1, max: 50 },
        meetingLinkTemplate: { type: String, trim: true },
        activeLeadCount: { type: Number, default: 0, min: 0 },
        completedSessions: { type: Number, default: 0, min: 0 },
        isAcceptingLeads: { type: Boolean, default: true, index: true },
        isFeatured: { type: Boolean, default: false },
        displayOrder: { type: Number, default: 0 },
        status: statusField,
        seo: seoSchema,
    },
    baseSchemaOptions,
);

counsellorSchema.plugin(auditPlugin);
counsellorSchema.plugin(softDeletePlugin);
counsellorSchema.index({ name: 'text', specializations: 'text' });
counsellorSchema.index({ status: 1, isAcceptingLeads: 1, activeLeadCount: 1 });

export const Counsellor = registerModel<CounsellorDoc, Model<CounsellorDoc>>(
    'Counsellor',
    counsellorSchema,
);

/* =========================== CounsellingBooking ========================= */

export interface CounsellingBookingDoc {
    _id: Types.ObjectId;
    reference: string;
    lead?: Types.ObjectId;
    user?: Types.ObjectId;
    counsellor?: Types.ObjectId;
    counsellorName?: string;
    type: 'career' | 'college' | 'course' | 'loan' | 'general';
    mode: string;
    isPaid: boolean;
    fee?: number;
    paymentStatus?: 'not_required' | 'pending' | 'paid' | 'refunded';
    studentName: string;
    phone: string;
    email?: string;
    stateName?: string;
    cityName?: string;
    courseInterest?: string;
    scheduledAt?: Date;
    durationMinutes: number;
    timezone: string;
    preferredTimeLabel?: string;
    meetingLink?: string;
    status: string;
    rescheduledFrom?: Date;
    rescheduleCount: number;
    cancellationReason?: string;
    internalNotes?: string;
    studentSummary?: string;
    followUpAt?: Date;
    feedback?: { rating: number; comment?: string; submittedAt: Date };
    remindersSent: { channel: string; sentAt: Date }[];
    source?: string;
    idempotencyKey?: string;
    createdAt: Date;
    updatedAt: Date;
}

const counsellingBookingSchema = new Schema<CounsellingBookingDoc>(
    {
        reference: { type: String, required: true, unique: true, trim: true, uppercase: true },
        lead: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        counsellor: { type: Schema.Types.ObjectId, ref: 'Counsellor', index: true },
        counsellorName: { type: String, trim: true },
        type: {
            type: String,
            enum: ['career', 'college', 'course', 'loan', 'general'],
            default: 'general',
            index: true,
        },
        mode: { type: String, default: 'Video Call', trim: true },
        isPaid: { type: Boolean, default: false },
        fee: { type: Number, min: 0 },
        paymentStatus: {
            type: String,
            enum: ['not_required', 'pending', 'paid', 'refunded'],
            default: 'not_required',
        },
        studentName: { type: String, required: true, trim: true, maxlength: 140 },
        phone: { type: String, required: true, trim: true },
        email: { type: String, trim: true, lowercase: true },
        stateName: { type: String, trim: true },
        cityName: { type: String, trim: true },
        courseInterest: { type: String, trim: true },
        scheduledAt: { type: Date, index: true },
        durationMinutes: { type: Number, default: 30, min: 5, max: 240 },
        timezone: { type: String, default: 'Asia/Kolkata' },
        preferredTimeLabel: { type: String, trim: true, maxlength: 60 },
        meetingLink: { type: String, trim: true },
        status: { type: String, enum: BOOKING_STATUSES, default: 'requested', index: true },
        rescheduledFrom: Date,
        rescheduleCount: { type: Number, default: 0, min: 0 },
        cancellationReason: { type: String, trim: true, maxlength: 600 },
        internalNotes: { type: String, trim: true, maxlength: 8000 },
        studentSummary: { type: String, trim: true, maxlength: 4000 },
        followUpAt: { type: Date, index: true },
        feedback: {
            rating: { type: Number, min: 1, max: 5 },
            comment: { type: String, trim: true, maxlength: 2000 },
            submittedAt: Date,
        },
        remindersSent: {
            type: [new Schema({ channel: String, sentAt: Date }, { _id: false })],
            default: [],
        },
        source: { type: String, trim: true },
        idempotencyKey: { type: String, trim: true },
    },
    baseSchemaOptions,
);

counsellingBookingSchema.plugin(auditPlugin);
counsellingBookingSchema.index({ status: 1, scheduledAt: 1 });
counsellingBookingSchema.index({ counsellor: 1, scheduledAt: 1 });
counsellingBookingSchema.index({ phone: 1, createdAt: -1 });
counsellingBookingSchema.index(
    { idempotencyKey: 1 },
    { unique: true, sparse: true, name: 'booking_idempotency' },
);

export const CounsellingBooking = registerModel<CounsellingBookingDoc, Model<CounsellingBookingDoc>>(
    'CounsellingBooking',
    counsellingBookingSchema,
);
