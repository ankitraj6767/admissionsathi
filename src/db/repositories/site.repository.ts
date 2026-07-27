import 'server-only';
import { Types, type AnyBulkWriteOperation, type FilterQuery } from 'mongoose';
import { connectToDatabase } from '@/db/connect';
import {
    HomepageSection,
    MediaAsset,
    NavigationItem,
    NavigationMenu,
    Redirect,
    StaticPage,
    type HomepageSectionDoc,
    type MediaAssetDoc,
    type NavigationItemDoc,
    type NavigationMenuDoc,
    type RedirectDoc,
    type StaticPageDoc,
} from '@/db/models/site.model';
import {
    countDocs,
    findLean,
    findOneLean,
    listSlugRows,
    paginate,
    type SlugRow,
} from './base.repository';
import type { Paginated } from '@/types/common';

/** Published, indexable and not soft-deleted — what the sitemap may advertise. */
const SITEMAP_FILTER = {
    status: 'published',
    isDeleted: { $ne: true },
    'seo.noIndex': { $ne: true },
} as const;

/* ------------------------------- navigation ------------------------------- */

export async function listNavigationItems(
    menuKey: string,
    limit = 200,
): Promise<NavigationItemDoc[]> {
    return findLean<NavigationItemDoc>(
        NavigationItem,
        { menuKey, status: 'active' },
        { sort: { displayOrder: 1 }, limit },
    );
}

export async function listAllNavigationItems(limit = 500): Promise<NavigationItemDoc[]> {
    return findLean<NavigationItemDoc>(NavigationItem, {}, { sort: { displayOrder: 1 }, limit });
}

/** Single item by id, including inactive rows (the admin edits those too). */
export async function findNavigationItemById(id: string): Promise<NavigationItemDoc | null> {
    return findOneLean<NavigationItemDoc>(NavigationItem, { _id: id } as FilterQuery<NavigationItemDoc>);
}

export async function listNavigationMenus(): Promise<NavigationMenuDoc[]> {
    return findLean<NavigationMenuDoc>(NavigationMenu, {}, { sort: { location: 1 }, limit: 50 });
}

export async function findNavigationMenuByKey(key: string): Promise<NavigationMenuDoc | null> {
    return findOneLean<NavigationMenuDoc>(NavigationMenu, { key });
}

export async function upsertNavigationItem(
    id: string | undefined,
    values: Record<string, unknown>,
): Promise<string> {
    await connectToDatabase();
    if (id) {
        await NavigationItem.updateOne({ _id: id }, { $set: values }).exec();
        return id;
    }
    const created = await NavigationItem.create(values);
    return String(created._id);
}

export async function deleteNavigationItem(id: string): Promise<number> {
    await connectToDatabase();
    // Children would otherwise be orphaned in a dropdown that no longer exists.
    const [child, own] = await Promise.all([
        NavigationItem.deleteMany({ parent: id }).exec(),
        NavigationItem.deleteOne({ _id: id }).exec(),
    ]);
    return (child.deletedCount ?? 0) + (own.deletedCount ?? 0);
}

export async function setNavigationItemOrder(
    entries: { id: string; displayOrder: number; parent?: string | null }[],
    actorId?: string,
): Promise<void> {
    if (entries.length === 0) return;
    await connectToDatabase();
    // Ids arrive as strings and Mongoose casts them to ObjectId on write, which
    // the bulk operation type cannot express.
    await NavigationItem.bulkWrite(
        entries.map((entry) => ({
            updateOne: {
                filter: { _id: entry.id },
                update: {
                    $set: {
                        displayOrder: entry.displayOrder,
                        ...(entry.parent !== undefined ? { parent: entry.parent } : {}),
                        ...(actorId ? { updatedBy: actorId } : {}),
                    },
                },
            },
        })) as AnyBulkWriteOperation<NavigationItemDoc>[],
    );
}

/* ---------------------------- homepage sections --------------------------- */

export async function listHomepageSections(limit = 40): Promise<HomepageSectionDoc[]> {
    return findLean<HomepageSectionDoc>(HomepageSection, {}, { sort: { displayOrder: 1 }, limit });
}

export async function findHomepageSection(key: string): Promise<HomepageSectionDoc | null> {
    return findOneLean<HomepageSectionDoc>(HomepageSection, { key });
}

/**
 * Upserts one section. `setOnInsert` carries the defaults that must only apply
 * when the row is created (name, display order) so an edit never resets them.
 */
export async function upsertHomepageSection(
    key: string,
    values: Record<string, unknown>,
    setOnInsert: Record<string, unknown> = {},
): Promise<void> {
    await connectToDatabase();
    await HomepageSection.updateOne(
        { key },
        { $set: values, $setOnInsert: { key, ...setOnInsert } },
        { upsert: true },
    ).exec();
}

export async function setHomepageSectionOrder(
    entries: { key: string; displayOrder: number }[],
    actorId?: string,
): Promise<void> {
    if (entries.length === 0) return;
    await connectToDatabase();
    await HomepageSection.bulkWrite(
        entries.map((entry) => ({
            updateOne: {
                filter: { key: entry.key },
                update: {
                    $set: {
                        displayOrder: entry.displayOrder,
                        ...(actorId ? { updatedBy: actorId } : {}),
                    },
                },
                upsert: true,
            },
        })) as AnyBulkWriteOperation<HomepageSectionDoc>[],
    );
}

/**
 * Publishes the draft config of a single section.
 * Uses `$unset` so the draft is really cleared, which is what tells the admin UI
 * there is nothing pending any more.
 */
export async function publishHomepageSectionDraft(
    key: string,
    actorId?: string,
): Promise<'published' | 'no_draft' | 'not_found'> {
    const section = await findHomepageSection(key);
    if (!section) return 'not_found';
    if (!section.draftConfig) return 'no_draft';

    await connectToDatabase();
    await HomepageSection.updateOne(
        { key },
        {
            $set: {
                config: section.draftConfig,
                hasUnpublishedChanges: false,
                publishedAt: new Date(),
                ...(actorId ? { updatedBy: actorId } : {}),
            },
            $unset: { draftConfig: '' },
        },
    ).exec();

    return 'published';
}

/** Copies every pending draft config onto the live config. */
export async function publishHomepageDrafts(actorId?: string): Promise<number> {
    await connectToDatabase();
    const pending = await HomepageSection.find({ hasUnpublishedChanges: true })
        .select('_id draftConfig')
        .lean<{ _id: unknown; draftConfig?: Record<string, unknown> }[]>()
        .exec();

    if (pending.length === 0) return 0;

    await HomepageSection.bulkWrite(
        pending.map((row) => ({
            updateOne: {
                filter: { _id: row._id },
                update: {
                    $set: {
                        ...(row.draftConfig ? { config: row.draftConfig } : {}),
                        hasUnpublishedChanges: false,
                        updatedBy: actorId,
                    },
                    $unset: { draftConfig: '' },
                },
            },
        })) as AnyBulkWriteOperation<HomepageSectionDoc>[],
    );

    return pending.length;
}

/* ------------------------------ media library ----------------------------- */

export interface MediaListArgs {
    q?: string;
    folder?: string;
    kind?: string;
    page?: number;
    pageSize?: number;
}

export async function paginateMedia(args: MediaListArgs): Promise<Paginated<MediaAssetDoc>> {
    const filter: FilterQuery<MediaAssetDoc> = {};
    if (args.folder) filter.folder = args.folder;
    if (args.kind) filter.kind = args.kind;
    if (args.q) {
        const rx = new RegExp(args.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        Object.assign(filter, {
            $or: [{ originalName: rx }, { fileName: rx }, { altText: rx }, { caption: rx }, { tags: rx }],
        });
    }
    return paginate<MediaAssetDoc>(MediaAsset, {
        filter,
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 24,
        sort: { createdAt: -1 },
    });
}

export async function mediaFolders(): Promise<string[]> {
    await connectToDatabase();
    const rows = await MediaAsset.distinct('folder').exec();
    return (rows as (string | null)[]).filter((r): r is string => Boolean(r)).sort();
}

export async function findMediaAsset(id: string): Promise<MediaAssetDoc | null> {
    return findOneLean<MediaAssetDoc>(MediaAsset, { _id: id } as FilterQuery<MediaAssetDoc>);
}

export async function createMediaAsset(values: Record<string, unknown>): Promise<MediaAssetDoc> {
    await connectToDatabase();
    const created = await MediaAsset.create(values);
    return created.toObject() as MediaAssetDoc;
}

export async function updateMediaAsset(
    id: string,
    values: Record<string, unknown>,
): Promise<void> {
    await connectToDatabase();
    await MediaAsset.updateOne({ _id: id }, { $set: values }).exec();
}

export async function deleteMediaAsset(id: string): Promise<void> {
    await connectToDatabase();
    await MediaAsset.deleteOne({ _id: id }).exec();
}

/**
 * Soft-deletes an asset: the row is retained (and hidden by the soft-delete
 * query guard) so existing references degrade visibly instead of 404-ing
 * silently, and the deletion stays attributable.
 */
export async function softDeleteMediaAsset(id: string, deletedBy?: string): Promise<void> {
    await connectToDatabase();
    await MediaAsset.updateOne(
        { _id: id },
        {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
                ...(deletedBy ? { deletedBy: new Types.ObjectId(deletedBy) } : {}),
            },
        },
    ).exec();
}

/* ------------------------------- static pages ----------------------------- */

/** Fields the public page view renders. */
const STATIC_PAGE_VIEW_PROJECTION = {
    title: 1,
    slug: 1,
    group: 1,
    excerpt: 1,
    contentHtml: 1,
    heroEyebrow: 1,
    showLastUpdated: 1,
    updatedAt: 1,
    publishedAt: 1,
    seo: 1,
} as const;

/**
 * A page by its current slug or one of its historical slugs, so renaming a page
 * never breaks an already-published link. Pass `includeDrafts` to preview one.
 */
export async function findStaticPageBySlug(
    slug: string,
    includeDrafts = false,
): Promise<StaticPageDoc | null> {
    return findOneLean<StaticPageDoc>(
        StaticPage,
        {
            ...(includeDrafts ? {} : { status: 'published' }),
            $or: [{ slug }, { 'slugHistory.slug': slug }],
        } as FilterQuery<StaticPageDoc>,
        { projection: STATIC_PAGE_VIEW_PROJECTION },
    );
}

/**
 * Published page links grouped the way the footer columns and the "related
 * pages" rail render them.
 */
export async function listPublishedStaticPages(limit = 200): Promise<StaticPageDoc[]> {
    return findLean<StaticPageDoc>(
        StaticPage,
        { status: 'published' },
        {
            sort: { group: 1, displayOrder: 1, title: 1 },
            limit,
            projection: { title: 1, slug: 1, group: 1 },
        },
    );
}

/** Indexable static page slugs for the sitemap. */
export async function listStaticPageSitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<StaticPageDoc>(StaticPage, SITEMAP_FILTER as FilterQuery<StaticPageDoc>, {
        limit,
    });
}

/* -------------------------------- redirects ------------------------------- */

export async function findActiveRedirect(source: string): Promise<RedirectDoc | null> {
    return findOneLean<RedirectDoc>(Redirect, { source, status: 'active' });
}

export async function countActiveRedirects(): Promise<number> {
    return countDocs<RedirectDoc>(Redirect, { status: 'active' });
}

export async function findExactRedirect(source: string): Promise<RedirectDoc | null> {
    return findOneLean<RedirectDoc>(
        Redirect,
        { source, status: 'active', isRegex: false },
        { projection: { destination: 1, statusCode: 1 } },
    );
}

/**
 * Regex rules only. Bounded by `limit` so a misconfigured pattern set cannot
 * turn redirect resolution into an unbounded scan on every request.
 */
export async function listRegexRedirects(limit = 200): Promise<RedirectDoc[]> {
    return findLean<RedirectDoc>(
        Redirect,
        { status: 'active', isRegex: true },
        { limit, sort: { createdAt: 1 }, projection: { source: 1, destination: 1, statusCode: 1 } },
    );
}

export async function incrementRedirectHitBySource(source: string): Promise<void> {
    await connectToDatabase();
    await Redirect.updateOne(
        { source, status: 'active' },
        { $inc: { hitCount: 1 }, $set: { lastHitAt: new Date() } },
    ).exec();
}
