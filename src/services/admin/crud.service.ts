import 'server-only';
import mongoose, { Types, type FilterQuery, type Model } from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from '@/db/connect';
import '@/db/models';
import { paginate, toPlain } from '@/db/repositories/base.repository';
import { escapeRegex, slugify } from '@/lib/utils';
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
    await connectToDatabase();
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

    const result = await paginate(model, {
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
    await connectToDatabase();
    if (!Types.ObjectId.isValid(id)) return null;
    const model = modelFor(resource);
    const doc = await model.findById(id).lean().exec();
    return doc ? (toPlain(doc) as Record<string, unknown>) : null;
}

/** Reference options for the form pickers (bounded). */
export async function getReferenceOptions(
    refModel: string,
    labelField: string,
    search?: string,
): Promise<{ label: string; value: string }[]> {
    await connectToDatabase();
    const model = mongoose.models[refModel];
    if (!model) return [];

    const filter: Record<string, unknown> = {};
    if (search) filter[labelField] = new RegExp(escapeRegex(search), 'i');

    const rows = await model
        .find(filter)
        .select(`${labelField} _id`)
        .sort({ [labelField]: 1 })
        .limit(200)
        .lean()
        .exec();

    return (rows as unknown as Record<string, unknown>[]).map((row) => ({
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
        const model = mongoose.models[refModel];
        if (!model) return;
        const doc = (await model.findById(id).select(labelField).lean().exec()) as
            | Record<string, unknown>
            | null;
        if (doc?.[labelField]) payload[targetField] = doc[labelField];
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
    await connectToDatabase();
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

    const created = await model.create({ ...payload, createdBy: actorId, updatedBy: actorId });
    const doc = created.toObject() as Record<string, unknown>;

    return { id: String(doc._id), label: String(doc[resource.titleField] ?? doc._id) };
}

export async function updateResourceDoc(
    resource: AdminResource,
    id: string,
    values: Record<string, unknown>,
    actorId: string,
): Promise<{ id: string; label: string; previous: Record<string, unknown> }> {
    await connectToDatabase();
    const model = modelFor(resource);

    const existing = (await model.findById(id).lean().exec()) as Record<string, unknown> | null;
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
        await model
            .updateOne(
                { _id: id },
                { $push: { slugHistory: { slug: existing[resource.slugField], changedAt: new Date() } } },
            )
            .exec();
    }

    if (payload.status === 'published' && !existing.publishedAt) payload.publishedAt = new Date();

    await model.updateOne({ _id: id }, { $set: { ...payload, updatedBy: actorId } }).exec();

    const label = String(payload[resource.titleField] ?? existing[resource.titleField] ?? id);
    return { id, label, previous: existing };
}

export async function deleteResourceDoc(
    resource: AdminResource,
    id: string,
    actorId: string,
): Promise<{ id: string; label: string; softDeleted: boolean }> {
    await connectToDatabase();
    const model = modelFor(resource);

    const existing = (await model.findById(id).lean().exec()) as Record<string, unknown> | null;
    if (!existing) throw new NotFoundError(`${resource.labelSingular} not found.`);

    const label = String(existing[resource.titleField] ?? id);

    if (resource.softDelete) {
        await model
            .updateOne(
                { _id: id },
                { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: actorId, status: 'archived' } },
            )
            .exec();
        return { id, label, softDeleted: true };
    }

    await model.deleteOne({ _id: id }).exec();
    return { id, label, softDeleted: false };
}

export async function restoreResourceDoc(
    resource: AdminResource,
    id: string,
): Promise<{ id: string }> {
    await connectToDatabase();
    const model = modelFor(resource);
    await model
        .updateOne({ _id: id }, { $set: { isDeleted: false, deletedAt: null, deletedBy: null } })
        .exec();
    return { id };
}

export async function bulkUpdateStatus(
    resource: AdminResource,
    ids: string[],
    status: string,
    actorId: string,
): Promise<number> {
    await connectToDatabase();
    const model = modelFor(resource);
    const result = await model
        .updateMany({ _id: { $in: ids } }, { $set: { status, updatedBy: actorId } })
        .exec();
    return result.modifiedCount;
}

export async function countByStatus(resource: AdminResource): Promise<Record<string, number>> {
    await connectToDatabase();
    const model = modelFor(resource);
    const rows = await model
        .aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        .exec();
    return Object.fromEntries(rows.filter((r) => r._id).map((r) => [r._id, r.count]));
}
