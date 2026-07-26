import 'server-only';
import { Schema, type Model, type Types } from 'mongoose';
import { ROLES } from '@/config/permissions';
import { NOTIFICATION_CHANNELS } from '@/config/constants';
import { auditPlugin, baseSchemaOptions, registerModel, softDeletePlugin } from './shared/base';

export interface UserDoc {
    _id: Types.ObjectId;
    name: string;
    email: string;
    emailVerified?: Date | null;
    phone?: string;
    phoneVerified?: Date | null;
    image?: string;
    passwordHash?: string;
    roles: string[];
    extraPermissions: string[];
    deniedPermissions: string[];
    status: 'active' | 'suspended' | 'pending';
    profile: {
        city?: Types.ObjectId;
        state?: Types.ObjectId;
        interestedCourses: Types.ObjectId[];
        interestedExams: Types.ObjectId[];
        currentQualification?: string;
        passingYear?: number;
        gender?: string;
        dateOfBirth?: Date;
        category?: string;
    };
    notificationPreferences: {
        channels: string[];
        examAlerts: boolean;
        admissionAlerts: boolean;
        savedCollegeUpdates: boolean;
        marketing: boolean;
    };
    counsellorProfile?: Types.ObjectId;
    lastLoginAt?: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date | null;
    consent: {
        termsAcceptedAt?: Date;
        marketingOptIn: boolean;
        dataProcessing: boolean;
    };
    isDeleted: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        emailVerified: { type: Date, default: null },
        phone: { type: String, trim: true, match: /^[0-9+\-\s]{6,20}$/ },
        phoneVerified: { type: Date, default: null },
        image: { type: String, trim: true },
        passwordHash: { type: String, select: false },
        roles: {
            type: [String],
            enum: ROLES,
            default: ['student'],
            validate: {
                validator: (v: string[]) => v.length > 0,
                message: 'At least one role is required',
            },
            index: true,
        },
        extraPermissions: { type: [String], default: [] },
        deniedPermissions: { type: [String], default: [] },
        status: {
            type: String,
            enum: ['active', 'suspended', 'pending'],
            default: 'active',
            index: true,
        },
        profile: {
            city: { type: Schema.Types.ObjectId, ref: 'City' },
            state: { type: Schema.Types.ObjectId, ref: 'State' },
            interestedCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
            interestedExams: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
            currentQualification: { type: String, trim: true, maxlength: 120 },
            passingYear: { type: Number, min: 1980, max: 2100 },
            gender: { type: String, trim: true },
            dateOfBirth: Date,
            category: { type: String, trim: true },
        },
        notificationPreferences: {
            channels: { type: [String], enum: NOTIFICATION_CHANNELS, default: ['email', 'in_app'] },
            examAlerts: { type: Boolean, default: true },
            admissionAlerts: { type: Boolean, default: true },
            savedCollegeUpdates: { type: Boolean, default: true },
            marketing: { type: Boolean, default: false },
        },
        counsellorProfile: { type: Schema.Types.ObjectId, ref: 'Counsellor' },
        lastLoginAt: Date,
        failedLoginAttempts: { type: Number, default: 0 },
        lockedUntil: { type: Date, default: null },
        consent: {
            termsAcceptedAt: Date,
            marketingOptIn: { type: Boolean, default: false },
            dataProcessing: { type: Boolean, default: true },
        },
    },
    baseSchemaOptions,
);

userSchema.plugin(auditPlugin);
userSchema.plugin(softDeletePlugin);

userSchema.index({ name: 'text', email: 'text' }, { name: 'user_search' });
userSchema.index({ createdAt: -1 });
userSchema.index({ phone: 1 }, { sparse: true });

export const User = registerModel<UserDoc, Model<UserDoc>>('User', userSchema);

/* ------------------------------------------------------------------ *
 * Auth.js companion collections (managed by the MongoDB adapter, but
 * modelled here so the shape is documented and indexable).
 * ------------------------------------------------------------------ */

export interface AccountDoc {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    type: string;
    provider: string;
    providerAccountId: string;
    refresh_token?: string;
    access_token?: string;
    expires_at?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
    session_state?: string;
}

const accountSchema = new Schema<AccountDoc>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: { type: String, required: true },
        provider: { type: String, required: true },
        providerAccountId: { type: String, required: true },
        refresh_token: { type: String, select: false },
        access_token: { type: String, select: false },
        expires_at: Number,
        token_type: String,
        scope: String,
        id_token: { type: String, select: false },
        session_state: String,
    },
    { timestamps: true, collection: 'accounts', strict: false },
);

accountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

export const Account = registerModel<AccountDoc, Model<AccountDoc>>('Account', accountSchema);

export interface SessionDoc {
    _id: Types.ObjectId;
    sessionToken: string;
    userId: Types.ObjectId;
    expires: Date;
}

const sessionSchema = new Schema<SessionDoc>(
    {
        sessionToken: { type: String, required: true, unique: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        expires: { type: Date, required: true },
    },
    { timestamps: true, collection: 'sessions', strict: false },
);

sessionSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export const Session = registerModel<SessionDoc, Model<SessionDoc>>('Session', sessionSchema);

export interface VerificationTokenDoc {
    _id: Types.ObjectId;
    identifier: string;
    token: string;
    expires: Date;
    purpose?: 'email_verification' | 'password_reset' | 'otp_login';
}

const verificationTokenSchema = new Schema<VerificationTokenDoc>(
    {
        identifier: { type: String, required: true, index: true },
        token: { type: String, required: true, unique: true },
        expires: { type: Date, required: true },
        purpose: {
            type: String,
            enum: ['email_verification', 'password_reset', 'otp_login'],
            default: 'email_verification',
        },
    },
    { timestamps: true, collection: 'verification_tokens', strict: false },
);

verificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });
verificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export const VerificationToken = registerModel<VerificationTokenDoc, Model<VerificationTokenDoc>>(
    'VerificationToken',
    verificationTokenSchema,
);
