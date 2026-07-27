import 'server-only';
import mongoose, { type FilterQuery, type Model } from 'mongoose';
// Registers every model so a name-based lookup resolves however this module is reached.
import '@/db/models';
import { connectToDatabase } from '@/db/connect';
import { escapeRegex } from '@/lib/utils';
import { paginate } from './base.repository';
import type { Paginated } from '@/types/common';

/**
 * Generic reads and writes for the admin CRUD screens.
 *
 * The admin console is model-agnostic: the resource configuration names a
 * registered model and this repository runs the query for it. Everything is
 * keyed by `Record<string, unknown>` because the shape is only known at runtime.
 */
export type AdminDoc = Record<string, unknown>;

export interface AdminListArgs {
    filter: FilterQuery<AdminDoc>;
    page?: number;
    pageSize?: number;
    sort: Record<string, 1 | -1>;
}

export async function paginateAdminDocs(
    model: Model<AdminDoc>,
    args: AdminListArgs,
): Promise<Paginated<AdminDoc>> {
    return paginate<AdminDoc>(model, args);
}

export async function findAdminDocById(
    model: Model<AdminDoc>,
    id: string,
): Promise<AdminDoc | null> {
    await connectToDatabase();
    return model.findById(id).lean<AdminDoc>().exec();
}

/**
 * One field of one document of a model named at runtime.
 * Powers the denormalisation step (copying a referenced row's name onto the
 * document being saved). Resolves to `undefined` when the model is not
 * registered, so a misconfigured resource cannot fail a save.
 */
export async function findAdminFieldValue(
    modelName: string,
    id: string,
    field: string,
): Promise<unknown> {
    const model = mongoose.models[modelName];
    if (!model) return undefined;
    await connectToDatabase();
    const doc = (await model.findById(id).select(field).lean().exec()) as AdminDoc | null;
    return doc?.[field];
}

/**
 * Bounded picker options for a reference field.
 * Returns an empty list for an unregistered model so the form still renders.
 */
export async function listAdminReferenceOptions(
    modelName: string,
    labelField: string,
    search?: string,
    limit = 200,
): Promise<AdminDoc[]> {
    const model = mongoose.models[modelName];
    if (!model) return [];
    await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (search) filter[labelField] = new RegExp(escapeRegex(search), 'i');

    return (await model
        .find(filter)
        .select(`${labelField} _id`)
        .sort({ [labelField]: 1 })
        .limit(limit)
        .lean()
        .exec()) as AdminDoc[];
}

export async function createAdminDoc(
    model: Model<AdminDoc>,
    values: AdminDoc,
): Promise<AdminDoc> {
    await connectToDatabase();
    const created = await model.create(values);
    return created.toObject() as AdminDoc;
}

/**
 * Writes a partial update, translating cleared fields into `$unset`.
 *
 * Mongoose strips `undefined` values out of `$set`, so emptying an optional field
 * used to be a silent no-op: the form reported success and the old value came
 * back on reload. Splitting the payload is what makes "clear this field" work for
 * every field type, not just the ones with a falsy-but-defined empty value.
 */
export async function setAdminDocValues(
    model: Model<AdminDoc>,
    id: string,
    values: AdminDoc,
): Promise<void> {
    await connectToDatabase();

    const $set: AdminDoc = {};
    const $unset: Record<string, ''> = {};

    for (const [key, value] of Object.entries(values)) {
        if (value === undefined) $unset[key] = '';
        else $set[key] = value;
    }

    const update: Record<string, unknown> = {};
    if (Object.keys($set).length > 0) update.$set = $set;
    if (Object.keys($unset).length > 0) update.$unset = $unset;
    if (Object.keys(update).length === 0) return;

    await model.updateOne({ _id: id }, update).exec();
}

/** Records the previous slug so already-published URLs keep resolving. */
export async function pushAdminSlugHistory(
    model: Model<AdminDoc>,
    id: string,
    slug: unknown,
): Promise<void> {
    await connectToDatabase();
    await model
        .updateOne({ _id: id }, { $push: { slugHistory: { slug, changedAt: new Date() } } })
        .exec();
}

export async function deleteAdminDoc(model: Model<AdminDoc>, id: string): Promise<void> {
    await connectToDatabase();
    await model.deleteOne({ _id: id }).exec();
}

export async function bulkSetAdminDocValues(
    model: Model<AdminDoc>,
    ids: string[],
    values: AdminDoc,
): Promise<number> {
    await connectToDatabase();
    const result = await model.updateMany({ _id: { $in: ids } }, { $set: values }).exec();
    return result.modifiedCount;
}

/** Document counts per status, for the admin listing filter chips. */
export async function aggregateAdminStatusCounts(
    model: Model<AdminDoc>,
): Promise<{ _id: string; count: number }[]> {
    await connectToDatabase();
    return model
        .aggregate<{ _id: string; count: number }>([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec();
}
