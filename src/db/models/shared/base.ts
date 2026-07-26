import 'server-only';
import mongoose, { Schema, type Model, type Document, type Types } from 'mongoose';
import { CONTENT_STATUS, ENTITY_STATUS } from '@/config/constants';

/** Sub-document: SEO metadata reused by every public entity. */
export interface SeoMeta {
    title?: string;
    description?: string;
    keywords?: string[];
    canonicalUrl?: string;
    ogImage?: string;
    noIndex?: boolean;
    noFollow?: boolean;
    schemaType?: string;
}

export const seoSchema = new Schema<SeoMeta>(
    {
        title: { type: String, trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 400 },
        keywords: { type: [String], default: undefined },
        canonicalUrl: { type: String, trim: true },
        ogImage: { type: String, trim: true },
        noIndex: { type: Boolean, default: false },
        noFollow: { type: Boolean, default: false },
        schemaType: { type: String, trim: true },
    },
    { _id: false },
);

/** Sub-document: image reference (media library id + resolved url). */
export interface ImageRef {
    url: string;
    alt?: string;
    mediaId?: Types.ObjectId;
    width?: number;
    height?: number;
    blurDataUrl?: string;
}

export const imageSchema = new Schema<ImageRef>(
    {
        url: { type: String, required: true, trim: true },
        alt: { type: String, trim: true, maxlength: 300 },
        mediaId: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
        width: Number,
        height: Number,
        blurDataUrl: String,
    },
    { _id: false },
);

/** Sub-document: FAQ entry embedded in course/college/exam pages. */
export interface FaqItem {
    question: string;
    answer: string;
    order?: number;
}

export const faqItemSchema = new Schema<FaqItem>(
    {
        question: { type: String, required: true, trim: true, maxlength: 300 },
        answer: { type: String, required: true, trim: true, maxlength: 4000 },
        order: { type: Number, default: 0 },
    },
    { _id: false },
);

/** Fields shared by every auditable document. */
export interface AuditFields {
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

/** Fields shared by soft-deletable documents. */
export interface SoftDeleteFields {
    isDeleted: boolean;
    deletedAt?: Date | null;
    deletedBy?: Types.ObjectId | null;
}

export interface BaseDoc extends Document<Types.ObjectId>, AuditFields {
    _id: Types.ObjectId;
}

/**
 * Adds createdBy / updatedBy.
 */
export function auditPlugin(schema: Schema): void {
    schema.add({
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    });
}

/**
 * Adds soft-delete fields plus a default query filter that hides deleted rows.
 * Pass `{ includeDeleted: true }` in query options to bypass.
 */
export function softDeletePlugin(schema: Schema): void {
    schema.add({
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    });

    const guard = function (this: any, next: (err?: Error) => void) {
        const options = this.getOptions?.() ?? {};
        if (!options.includeDeleted) {
            const filter = this.getFilter();
            if (filter.isDeleted === undefined) {
                this.where({ isDeleted: { $ne: true } });
            }
        }
        next();
    };

    ['find', 'findOne', 'findOneAndUpdate', 'countDocuments', 'distinct'].forEach((hook) => {
        schema.pre(hook as 'find', guard);
    });
}

/**
 * Optimistic concurrency: bumps `__v` and rejects a save when the version
 * loaded by the editor is stale. Applied to sensitive editable entities.
 */
export function optimisticConcurrency(schema: Schema): void {
    schema.set('optimisticConcurrency', true);
    schema.set('versionKey', '__v');
}

export const statusField = {
    type: String,
    enum: ENTITY_STATUS,
    default: 'active' as const,
    index: true,
};

export const contentStatusField = {
    type: String,
    enum: CONTENT_STATUS,
    default: 'draft' as const,
    index: true,
};

export const slugField = {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    minlength: 2,
    maxlength: 140,
    match: /^[a-z0-9][a-z0-9-]*$/,
};

/** Common toJSON transform: string ids, no __v leakage to the client. */
export const baseSchemaOptions = {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(_doc: unknown, ret: Record<string, unknown>) {
            if (ret._id) ret.id = String(ret._id);
            delete ret.__v;
            return ret;
        },
    },
    toObject: { virtuals: true },
} as const;

/**
 * Registers a model exactly once. Next.js hot reload re-executes model files, and
 * `mongoose.model()` throws `OverwriteModelError` on the second call.
 */
export function registerModel<T, TModel extends Model<T> = Model<T>>(
    name: string,
    schema: Schema<T>,
): TModel {
    return (mongoose.models[name] as TModel | undefined) ?? mongoose.model<T, TModel>(name, schema);
}

/** Slug history entry, used by the redirect manager to keep old URLs alive. */
export const slugHistorySchema = new Schema(
    {
        slug: { type: String, required: true, lowercase: true, trim: true },
        changedAt: { type: Date, default: () => new Date() },
    },
    { _id: false },
);
