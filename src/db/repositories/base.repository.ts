import 'server-only';
import type { FilterQuery, Model, PipelineStage, PopulateOptions, ProjectionType } from 'mongoose';

export type PopulateArg = PopulateOptions | (string | PopulateOptions)[];
import { connectToDatabase } from '@/db/connect';
import { siteConfig } from '@/config/site';
import { envPlaceholderIssues } from '@/lib/env';
import type { Paginated } from '@/types/common';

/**
 * Opens the shared connection for a read.
 *
 * Returns `false` when the process is compiling with placeholder credentials
 * (`next build` on a machine or CI runner without database access). Reads then
 * resolve to empty results so pre-rendering can finish, while every runtime read
 * still connects normally and surfaces real failures to the error boundaries.
 */
async function connectForRead(): Promise<boolean> {
    if (envPlaceholderIssues().length > 0) return false;
    await connectToDatabase();
    return true;
}

function emptyPage<T>(page: number, pageSize: number): Paginated<T> {
    return {
        items: [],
        page,
        pageSize,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
    };
}

export interface PaginateArgs<T> {
    filter?: FilterQuery<T>;
    page?: number;
    pageSize?: number;
    sort?: Record<string, 1 | -1>;
    projection?: ProjectionType<T>;
    populate?: PopulateArg;
    collation?: { locale: string; strength?: number };
}

/**
 * Paginated, lean read. Every listing goes through this helper so no query is
 * ever unbounded and every result is a plain object (cheap to serialise to RSC).
 */
export async function paginate<T>(
    model: Model<T>,
    args: PaginateArgs<T> = {},
): Promise<Paginated<T>> {
    // `Math.floor(NaN)` is NaN, which would reach `.skip()` and throw, so a
    // non-numeric page or size falls back to the default rather than propagating.
    const asPositiveInt = (value: number | undefined, fallback: number): number => {
        const floored = Math.floor(Number(value));
        return Number.isFinite(floored) ? Math.max(1, floored) : fallback;
    };

    const page = asPositiveInt(args.page, 1);
    const pageSize = Math.min(
        siteConfig.pagination.maxLimit,
        asPositiveInt(args.pageSize, siteConfig.pagination.listing),
    );

    if (!(await connectForRead())) return emptyPage<T>(page, pageSize);

    const filter = (args.filter ?? {}) as FilterQuery<T>;

    const query = model
        .find(filter, args.projection)
        .sort(args.sort ?? { createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<T[]>();

    if (args.populate) query.populate(args.populate);
    if (args.collation) query.collation(args.collation);

    const [items, total] = await Promise.all([
        query.exec(),
        model.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
        items: items as T[],
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

/** Bounded `find` for small reference lists (nav, categories, chips). */
export async function findLean<T>(
    model: Model<T>,
    filter: FilterQuery<T> = {},
    options: {
        sort?: Record<string, 1 | -1>;
        limit?: number;
        projection?: ProjectionType<T>;
        populate?: PopulateArg;
    } = {},
): Promise<T[]> {
    if (!(await connectForRead())) return [];
    const query = model
        .find(filter, options.projection)
        .sort(options.sort ?? { displayOrder: 1 })
        .limit(Math.min(options.limit ?? 100, 500))
        .lean<T[]>();
    if (options.populate) query.populate(options.populate);
    return (await query.exec()) as T[];
}

export async function findOneLean<T>(
    model: Model<T>,
    filter: FilterQuery<T>,
    options: { projection?: ProjectionType<T>; populate?: PopulateArg } = {},
): Promise<T | null> {
    if (!(await connectForRead())) return null;
    const query = model.findOne(filter, options.projection).lean<T>();
    if (options.populate) query.populate(options.populate);
    return (await query.exec()) as T | null;
}

export async function countDocs<T>(model: Model<T>, filter: FilterQuery<T> = {}): Promise<number> {
    if (!(await connectForRead())) return 0;
    return model.countDocuments(filter).exec();
}

/**
 * The only part of a Mongoose model aggregation needs.
 *
 * Declared structurally rather than as `Model<unknown>` so a concretely typed
 * model (`Model<LeadDoc>`) can be passed without the caller having to restate
 * the document type just to name the aggregation's result type.
 */
interface Aggregatable {
    aggregate<TResult>(pipeline: PipelineStage[]): { exec(): Promise<TResult[]> };
}

export async function aggregateLean<TResult = Record<string, unknown>>(
    model: Aggregatable,
    pipeline: PipelineStage[],
): Promise<TResult[]> {
    if (!(await connectForRead())) return [];
    return model.aggregate<TResult>(pipeline).exec();
}

/** A slug-addressable row as the sitemap needs it. */
export interface SlugRow {
    slug: string;
    updatedAt?: Date;
}

/**
 * Slug + `updatedAt` rows for one sitemap shard.
 *
 * Sitemap shards read far more rows than a page listing, so the limit is passed
 * explicitly instead of using `findLean`'s 500-row ceiling. Rows without a slug
 * are dropped because they can never be linked.
 */
export async function listSlugRows<T>(
    model: Model<T>,
    filter: FilterQuery<T>,
    options: { limit: number; sort?: Record<string, 1 | -1> },
): Promise<SlugRow[]> {
    if (!(await connectForRead())) return [];
    const rows = await model
        .find(filter)
        .select({ slug: 1, updatedAt: 1 })
        .sort(options.sort ?? { updatedAt: -1 })
        .limit(options.limit)
        .lean<SlugRow[]>()
        .exec();
    return rows.filter((row) => Boolean(row?.slug));
}

/** Distinct values for a field, used by filter facets. */
export async function distinctLean<T, TValue = string>(
    model: Model<T>,
    field: string,
    filter: FilterQuery<T> = {},
): Promise<TValue[]> {
    if (!(await connectForRead())) return [];
    const values = await model.distinct(field, filter).exec();
    return (values as TValue[]).filter((value) => value !== null && value !== undefined);
}

/** Serialises Mongo documents (ObjectId/Date) into RSC-safe plain JSON. */
export function toPlain<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
