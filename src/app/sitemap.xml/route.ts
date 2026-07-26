import { SITEMAP_HEADERS, renderSitemapIndex } from '@/services/sitemap-xml';

/**
 * Sitemap index at `/sitemap.xml` — the URL `robots.txt` advertises and the one
 * submitted to Search Console. It lists the per-entity child sitemaps under
 * `/sitemaps/<shard>.xml`.
 */
export const revalidate = 3600;

export function GET(): Response {
    return new Response(renderSitemapIndex(), { headers: SITEMAP_HEADERS });
}
