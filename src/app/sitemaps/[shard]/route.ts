import { notFound } from 'next/navigation';
import { SITEMAP_HEADERS, renderUrlSet } from '@/services/sitemap-xml';
import {
    SITEMAP_SHARDS,
    getSitemapShard,
    type SitemapShard,
} from '@/services/sitemap.service';

/**
 * Child sitemaps at `/sitemaps/<shard>.xml`, one per entity group.
 *
 * Sharding keeps each document far inside the 50,000-URL / 50 MB limit and lets
 * a crawler re-fetch only the section that changed. `/sitemap.xml` is the index
 * that links them.
 */
export const revalidate = 3600;

/** Pre-render all shards so the first crawl does not pay for the queries. */
export function generateStaticParams(): { shard: string }[] {
    return SITEMAP_SHARDS.map((shard) => ({ shard: `${shard}.xml` }));
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ shard: string }> },
): Promise<Response> {
    const { shard: raw } = await params;

    // The `.xml` suffix keeps the URL conventional; the shard id is the stem.
    const id = raw.replace(/\.xml$/i, '');
    if (!(SITEMAP_SHARDS as readonly string[]).includes(id)) notFound();

    const entries = await getSitemapShard(id as SitemapShard);
    return new Response(renderUrlSet(entries), { headers: SITEMAP_HEADERS });
}
