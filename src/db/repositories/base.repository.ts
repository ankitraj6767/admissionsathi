import 'server-only';
import type { FilterQuery, Model, PipelineStage, PopulateOptions, ProjectionType } from 'mongoose';

export type PopulateArg = PopulateOptions | (string | PopulateOptions)[];
import { connectToDatabase } from '@/db/connect';
import { siteConfig } from '@/config/site';
import type { Paginated } from '@/types/common';

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
    await connectToDatabase();

    const page = Math.max(1, Math.floor(args.page ?? 1));
    const pageSize = Math.min(
        siteConfig.pagination.maxLimit,
        Math.max(1, Math.floor(args.pageSize ?? siteConfig.pagination.listing)),
    );
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
    await connectToDatabase();
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
    await connectToDatabase();
    const query = model.findOne(filter, options.projection).lean<T>();
    if (options.populate) query.populate(options.populate);
    return (await query.exec()) as T | null;
}

export async function countDocs<T>(model: Model<T>, filter: FilterQuery<T> = {}): Promise<number> {
    await connectToDatabase();
    return model.countDocuments(filter).exec();
}

export async function aggregateLean<TResult = Record<string, unknown>>(
    model: Model<unknown>,
    pipeline: PipelineStage[],
): Promise<TResult[]> {
    await connectToDatabase();
    return model.aggregate<TResult>(pipeline).exec();
}

/** Serialises Mongo documents (ObjectId/Date) into RSC-safe plain JSON. */
export function toPlain<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
