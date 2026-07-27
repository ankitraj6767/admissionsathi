import 'server-only';
import type { StaticPageDoc } from '@/db/models/site.model';
import {
    findStaticPageBySlug,
    listPublishedStaticPages,
} from '@/db/repositories/site.repository';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import { logger } from '@/lib/logger';
import type { SeoMeta } from '@/db/models/shared/base';

/** RSC-safe page shape: no ObjectIds or Mongoose documents cross this boundary. */
export interface StaticPageView {
    id: string;
    title: string;
    slug: string;
    group: StaticPageDoc['group'];
    excerpt?: string;
    contentHtml: string;
    heroEyebrow?: string;
    showLastUpdated: boolean;
    updatedAt: string;
    publishedAt?: string;
    seo?: SeoMeta;
}

export interface StaticPageLink {
    title: string;
    slug: string;
    group: StaticPageDoc['group'];
}

type LeanPage = Omit<StaticPageDoc, '_id' | 'updatedAt' | 'publishedAt'> & {
    _id: unknown;
    updatedAt: Date;
    publishedAt?: Date;
};

function toView(page: LeanPage): StaticPageView {
    return {
        id: String(page._id),
        title: page.title,
        slug: page.slug,
        group: page.group,
        excerpt: page.excerpt,
        contentHtml: page.contentHtml,
        heroEyebrow: page.heroEyebrow,
        showLastUpdated: Boolean(page.showLastUpdated),
        updatedAt: page.updatedAt.toISOString(),
        publishedAt: page.publishedAt?.toISOString(),
        seo: page.seo,
    };
}

/**
 * Loads a published page by slug.
 *
 * Returns `null` rather than throwing so `/[pageSlug]` can fall through to the
 * redirect manager and then to the 404 page. Also matches `slugHistory`, so an
 * editor renaming a page never breaks an already-published link.
 */
export const getPublishedPage = cached(
    async (slug: string): Promise<StaticPageView | null> => {
        try {
            const page = (await findStaticPageBySlug(slug)) as LeanPage | null;
            return page ? toView(page) : null;
        } catch (error) {
            logger.error('page.load_failed', {
                slug,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    },
    ['static-page'],
    { tags: [CACHE_TAGS.pages], revalidate: CACHE_TTL.long },
);

/**
 * Published page links, used by the footer's company/legal columns, the
 * "related pages" rail on `/[pageSlug]`, and the `pages` sitemap shard.
 */
export const listPublishedPageLinks = cached(
    async (): Promise<StaticPageLink[]> => {
        try {
            const rows = await listPublishedStaticPages(200);
            return rows.map((row) => ({ title: row.title, slug: row.slug, group: row.group }));
        } catch (error) {
            logger.error('page.list_failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    },
    ['static-page-links'],
    { tags: [CACHE_TAGS.pages], revalidate: CACHE_TTL.long },
);
