import 'server-only';
import mongoose, { Types, type FilterQuery, type Model } from 'mongoose';
import { z } from 'zod';
import '@/db/models';
import {
    aggregateAdminStatusCounts,
    bulkSetAdminDocValues,
    createAdminDoc,
    deleteAdminDoc,
    findAdminDocById,
    findAdminFieldValue,
    listAdminReferenceOptions,
    paginateAdminDocs,
    pushAdminSlugHistory,
    setAdminDocValues,
} from '@/db/repositories/admin.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { escapeRegex, slugify } from '@/lib/utils';
import { sanitizeRichText } from '@/lib/html/sanitize';
import { isSafeUrl } from '@/lib/html/policy';
import { parseVideoUrl, toEmbedUrl } from '@/lib/media/video';
import { ConflictError, NotFoundError } from '@/lib/action-helpers';
import type { AdminField, AdminResource } from '@/config/admin-resources';
import type { Paginated } from '@/types/common';

/** Resolves the registered Mongoose model for a resource. */
export function modelFor(resource: AdminResource): Model<Record<string, unknown>> {
    const model = mongoose.models[resource.model];
    if (!model) throw new NotFoundError(`Model ${resource.model} is not registered.`);
    return model as unknown as Model<Record<string, unknown>>;
}

/* ----------------------------- validation -------------------------------- */

/**
 * A stored image reference. `url` is checked against the same scheme allow-list
 * as rich-text links, so a `javascript:` URL can never reach an `img src`.
 */
const imageRefSchema = z.object({
    url: z.string().min(1).max(1000).refine(isSafeUrl, 'Unsupported image URL'),
    alt: z.string().max(300).optional().or(z.literal('')),
    width: z.coerce.number().int().positive().optional(),
    height: z.coerce.number().int().positive().optional(),
    mediaId: z
        .string()
        .optional()
        .transform((v) => (v && Types.ObjectId.isValid(v) ? v : undefined)),
});

/**
 * One gallery tile. Videos are re-derived from their source URL on the server
 * rather than trusting the `embedUrl` the browser sent, so a crafted request
 * cannot put an arbitrary origin into an `iframe src`.
 */
const galleryItemInputSchema = z
    .object({
        kind: z.enum(['image', 'video']).default('image'),
        url: z.string().min(1).max(1000),
        alt: z.string().max(300).optional().or(z.literal('')),
        caption: z.string().max(300).optional().or(z.literal('')),
        width: z.coerce.number().int().positive().optional(),
        height: z.coerce.number().int().positive().optional(),
        mediaId: z
            .string()
            .optional()
            .transform((v) => (v && Types.ObjectId.isValid(v) ? v : undefined)),
        displayOrder: z.coerce.number().int().min(0).default(0),
    })
    .transform((item, ctx) => {
        if (item.kind === 'video') {
            const parsed = parseVideoUrl(item.url);
            if (!parsed) {
                ctx.addIssue({
                    code: 'custom',
                    message: `"${item.url}" is not a supported video URL`,
                });
                return z.NEVER;
            }
            return {
                ...item,
                videoProvider: parsed.provider,
                embedUrl: parsed.embedUrl,
                thumbnailUrl: parsed.thumbnailUrl,
            };
        }

        if (!isSafeUrl(item.url)) {
            ctx.addIssue({ code: 'custom', message: 'Unsupported image URL' });
            return z.NEVER;
        }

        return item;
    });

function fieldSchema(field: AdminField): z.ZodTypeAny {
    switch (field.type) {
        case 'number':
            return z.preprocess(
                (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
                z.number().min(field.min ?? -1e12).max(field.max ?? 1e12).optional(),
            );
        case 'boolean':
            return z.preprocess((v) => v === true || v === 'true' || v === 'on', z.boolean()).optional();
        case 'multiselect':
        case 'tags':
            return z.preprocess(
                (v) => (Array.isArray(v) ? v : typeof v === 'string' && v.length ? v.split(',').map((s) => s.trim()) : []),
                z.array(z.string().max(200)).max(60),
            );
        case 'date':
        case 'datetime':
            return z.preprocess(
                (v) => (v === '' || v === null || v === undefined ? undefined : new Date(String(v))),
                z.date().optional(),
            );
        case 'reference':
            return z
                .string()
                .max(40)
                .optional()
                .transform((v) => (v && Types.ObjectId.isValid(v) ? v : undefined));
        case 'image':
            /**
             * Matches `ImageRef`. A picked image with no URL is treated as
             * "cleared" rather than an error, so removing a logo works by
             * emptying the field.
             */
            return z.preprocess(
                (v) => {
                    if (!v || typeof v !== 'object') return undefined;
                    const candidate = v as Record<string, unknown>;
                    if (typeof candidate.url !== 'string' || candidate.url.trim() === '') {
                        return undefined;
                    }
                    return candidate;
                },
                imageRefSchema.optional(),
            );

        case 'gallery':
            return z.preprocess(
                (v) => (Array.isArray(v) ? v : []),
                z.array(galleryItemInputSchema).max(60, 'A gallery holds at most 60 items'),
            );

        case 'video':
            /**
             * Stored as the provider's embed URL so the public page can drop it
             * straight into an `iframe` without re-parsing. An unsupported URL is
             * rejected here rather than silently rendering a broken embed.
             */
            return z.preprocess(
                (v) => (typeof v === 'string' ? v.trim() : v),
                z
                    .string()
                    .max(500)
                    .optional()
                    .or(z.literal(''))
                    .transform((v) => (v ? (toEmbedUrl(v) ?? 'INVALID_VIDEO') : undefined))
                    .refine((v) => v !== 'INVALID_VIDEO', {
                        message: 'Use a YouTube or Vimeo link, or a direct video file URL',
                    }),
            );

        case 'json':
            return z.preprocess((v) => {
                if (typeof v !== 'string') return v;
                if (!v.trim()) return undefined;
                try {
                    return JSON.parse(v) as unknown;
                } catch {
                    return 'INVALID_JSON';
                }
            }, z.unknown().optional());
        case 'select':
            return field.required
                ? z.string().min(1, `${field.label} is required`)
                : z.string().optional().or(z.literal(''));
        case 'slug':
            return z
                .string()
                .min(2)
                .max(140)
                .regex(/^[a-z0-9][a-z0-9-]*$/, 'Use lowercase letters, numbers and hyphens');
        case 'richtext':
            /**
             * Sanitised before validation, not after: the length and required
             * checks must see what will actually be stored. `sanitizeRichText`
             * returns `undefined` for content that is visually blank (an editor
             * that was focused then cleared leaves `<p><br></p>` behind), so a
             * required field cannot be satisfied by empty markup.
             */
            return z.preprocess(
                (v) => sanitizeRichText(v, field.htmlPolicy ?? 'web') ?? '',
                field.required
                    ? z.string().min(1, `${field.label} is required`).max(200_000)
                    : z.string().max(200_000).optional().or(z.literal('')),
            );
        case 'textarea':
            return field.required
                ? z.string().min(1, `${field.label} is required`).max(200_000)
                : z.string().max(200_000).optional().or(z.literal(''));
        default:
            return field.required
                ? z.string().min(1, `${field.label} is required`).max(2000)
                : z.string().max(2000).optional().or(z.literal(''));
    }
}

/** Builds a Zod schema from the resource field configuration. */
export function buildResourceSchema(resource: AdminResource) {
    const shape: Record<string, z.ZodTypeAny> = {};
    resource.fields
        .filter((field) => !field.readOnly)
        .forEach((field) => {
            shape[field.name] = fieldSchema(field);
        });
    return z.object(shape).passthrough();
}

/** Converts dotted keys into a nested `$set` payload Mongoose understands. */
function toUpdatePayload(
    resource: AdminResource,
    values: Record<string, unknown>,
): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    resource.fields
        .filter((field) => !field.readOnly)
        .forEach((field) => {
            const raw = values[field.name];

            /**
             * `image` and `video` validate to `undefined` when cleared, and Zod
             * drops the key entirely, so "cleared" and "absent" are
             * indistinguishable here. The generated form always submits every
             * non-readOnly field, so absent means removed — written as an unset
             * (see `setAdminDocValues`) rather than skipped, otherwise removing a
             * logo would report success and reappear on reload.
             */
            if ((field.type === 'image' || field.type === 'video') && raw === undefined) {
                payload[field.name] = undefined;
                return;
            }

            if (raw === undefined) return;
            if (raw === '' && field.type !== 'boolean') {
                payload[field.name] = undefined;
                return;
            }
            if (raw === 'INVALID_JSON') throw new ConflictError(`${field.label} contains invalid JSON.`);
            payload[field.name] = raw;
        });

    return payload;
}

/* ------------------------------- queries --------------------------------- */

export interface AdminListQuery {
    q?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    [key: string]: unknown;
}

export async function listResourceDocs(
    resource: AdminResource,
    query: AdminListQuery,
): Promise<Paginated<Record<string, unknown>>> {
    const model = modelFor(resource);

    const filter: FilterQuery<Record<string, unknown>> = {};

    if (query.q) {
        const rx = new RegExp(escapeRegex(String(query.q)), 'i');
        filter.$or = resource.searchFields.map((field) => ({ [field]: rx }));
    }
    if (query.status) filter.status = query.status;

    const sort: Record<string, 1 | -1> = query.sort
        ? { [query.sort]: query.order === 'asc' ? 1 : -1 }
        : resource.defaultSort;

    const result = await paginateAdminDocs(model, {
        filter,
        page: query.page,
        pageSize: query.pageSize ?? 20,
        sort,
    });

    return toPlain(result) as Paginated<Record<string, unknown>>;
}

export async function getResourceDoc(
    resource: AdminResource,
    id: string,
): Promise<Record<string, unknown> | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const model = modelFor(resource);
    const doc = await findAdminDocById(model, id);
    return doc ? (toPlain(doc) as Record<string, unknown>) : null;
}

/** Reference options for the form pickers (bounded). */
export async function getReferenceOptions(
    refModel: string,
    labelField: string,
    search?: string,
): Promise<{ label: string; value: string }[]> {
    const rows = await listAdminReferenceOptions(refModel, labelField, search);

    return rows.map((row) => ({
        label: String(row[labelField] ?? row._id),
        value: String(row._id),
    }));
}

/* ------------------------------- mutations ------------------------------- */

/** Copies denormalised names so listing cards stay populate-free. */
async function applyDenormalisation(
    resource: AdminResource,
    payload: Record<string, unknown>,
): Promise<void> {
    const setName = async (
        refField: string,
        refModel: string,
        labelField: string,
        targetField: string,
    ) => {
        const id = payload[refField];
        if (!id || typeof id !== 'string') return;
        const value = await findAdminFieldValue(refModel, id, labelField);
        if (value) payload[targetField] = value;
    };

    switch (resource.model) {
        case 'College':
            await setName('state', 'State', 'name', 'stateName');
            await setName('city', 'City', 'name', 'cityName');
            break;
        case 'Course':
            await setName('category', 'CourseCategory', 'name', 'categoryName');
            break;
        case 'Specialization':
            await setName('course', 'Course', 'name', 'courseName');
            break;
        case 'ExamDate':
            await setName('exam', 'Exam', 'shortName', 'examShortName');
            break;
        case 'Ranking':
            await setName('college', 'College', 'name', 'collegeName');
            break;
        case 'City':
            await setName('state', 'State', 'name', 'stateName');
            break;
        case 'LoanProduct':
            await setName('provider', 'LoanProvider', 'name', 'providerName');
            break;
        case 'NewsPost':
            await setName('targetExam', 'Exam', 'shortName', 'targetExamName');
            await setName('targetState', 'State', 'name', 'targetStateName');
            break;
        case 'Lead':
            await setName('assignedTo', 'Counsellor', 'name', 'assignedToName');
            break;
        case 'CounsellingBooking':
            await setName('counsellor', 'Counsellor', 'name', 'counsellorName');
            break;
        case 'Resource':
            await setName('relatedExam', 'Exam', 'shortName', 'relatedExamName');
            break;
        default:
            break;
    }
}

export async function createResourceDoc(
    resource: AdminResource,
    values: Record<string, unknown>,
    actorId: string,
): Promise<{ id: string; label: string }> {
    const model = modelFor(resource);

    const payload = toUpdatePayload(resource, values);

    // auto slug when the resource has one and the field is empty
    if (resource.slugField && !payload[resource.slugField]) {
        const source = payload[resource.titleField];
        if (typeof source === 'string') payload[resource.slugField] = slugify(source);
    }

    await applyDenormalisation(resource, payload);

    if (resource.model === 'Article' || resource.model === 'Course' || resource.model === 'College') {
        if (payload.status === 'published' && !payload.publishedAt) payload.publishedAt = new Date();
    }

    const doc = await createAdminDoc(model, {
        ...payload,
        createdBy: actorId,
        updatedBy: actorId,
    });

    return { id: String(doc._id), label: String(doc[resource.titleField] ?? doc._id) };
}

export async function updateResourceDoc(
    resource: AdminResource,
    id: string,
    values: Record<string, unknown>,
    actorId: string,
): Promise<{ id: string; label: string; previous: Record<string, unknown> }> {
    const model = modelFor(resource);

    const existing = await findAdminDocById(model, id);
    if (!existing) throw new NotFoundError(`${resource.labelSingular} not found.`);

    const payload = toUpdatePayload(resource, values);
    await applyDenormalisation(resource, payload);

    // Slug history keeps old public URLs resolvable.
    if (
        resource.slugField &&
        typeof payload[resource.slugField] === 'string' &&
        payload[resource.slugField] !== existing[resource.slugField] &&
        Array.isArray(existing.slugHistory)
    ) {
        await pushAdminSlugHistory(model, id, existing[resource.slugField]);
    }

    if (payload.status === 'published' && !existing.publishedAt) payload.publishedAt = new Date();

    await setAdminDocValues(model, id, { ...payload, updatedBy: actorId });

    const label = String(payload[resource.titleField] ?? existing[resource.titleField] ?? id);
    return { id, label, previous: existing };
}

export async function deleteResourceDoc(
    resource: AdminResource,
    id: string,
    actorId: string,
): Promise<{ id: string; label: string; softDeleted: boolean }> {
    const model = modelFor(resource);

    const existing = await findAdminDocById(model, id);
    if (!existing) throw new NotFoundError(`${resource.labelSingular} not found.`);

    const label = String(existing[resource.titleField] ?? id);

    if (resource.softDelete) {
        await setAdminDocValues(model, id, {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: actorId,
            status: 'archived',
        });
        return { id, label, softDeleted: true };
    }

    await deleteAdminDoc(model, id);
    return { id, label, softDeleted: false };
}

export async function restoreResourceDoc(
    resource: AdminResource,
    id: string,
): Promise<{ id: string }> {
    const model = modelFor(resource);
    await setAdminDocValues(model, id, { isDeleted: false, deletedAt: null, deletedBy: null });
    return { id };
}

export async function bulkUpdateStatus(
    resource: AdminResource,
    ids: string[],
    status: string,
    actorId: string,
): Promise<number> {
    const model = modelFor(resource);
    return bulkSetAdminDocValues(model, ids, { status, updatedBy: actorId });
}

export async function countByStatus(resource: AdminResource): Promise<Record<string, number>> {
    const model = modelFor(resource);
    const rows = await aggregateAdminStatusCounts(model);
    return Object.fromEntries(rows.filter((r) => r._id).map((r) => [r._id, r.count]));
}
