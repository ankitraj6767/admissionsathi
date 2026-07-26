import 'server-only';
import { absoluteUrl } from '@/lib/utils';
import { SITEMAP_SHARDS, type SitemapEntry, type SitemapShard } from '@/services/sitemap.service';

/**
 * XML serialisation for the sitemap routes.
 *
 * Written by hand rather than through Next.js's `sitemap.ts` metadata
 * convention because that convention (with `generateSitemaps()`) emits the child
 * sitemaps but no index document, leaving `/sitemap.xml` unserved even though
 * `robots.txt` advertises it. Explicit Route Handlers give us a real
 * `<sitemapindex>` plus one `<urlset>` per shard.
 */

/** Child sitemap path for a shard. Kept in one place so the index cannot drift. */
export function shardPath(shard: SitemapShard): string {
    return `/sitemaps/${shard}.xml`;
}

/** Escapes the five characters that are not legal in XML text or attributes. */
function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function isoDate(value?: Date): string | undefined {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** `<sitemapindex>` pointing at every shard. */
export function renderSitemapIndex(lastModified = new Date()): string {
    const entries = SITEMAP_SHARDS.map((shard) =>
        [
            '  <sitemap>',
            `    <loc>${escapeXml(absoluteUrl(shardPath(shard)))}</loc>`,
            `    <lastmod>${lastModified.toISOString()}</lastmod>`,
            '  </sitemap>',
        ].join('\n'),
    );

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries,
        '</sitemapindex>',
        '',
    ].join('\n');
}

/** `<urlset>` for one shard. */
export function renderUrlSet(entries: SitemapEntry[]): string {
    const urls = entries.map((entry) => {
        const lines = [`    <loc>${escapeXml(absoluteUrl(entry.url))}</loc>`];

        const lastmod = isoDate(entry.lastModified);
        if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
        if (entry.changeFrequency) lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
        if (entry.priority !== undefined) {
            lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
        }

        return ['  <url>', ...lines, '  </url>'].join('\n');
    });

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        '',
    ].join('\n');
}

/** Shared response headers. Sitemaps are public and safe to cache at the edge. */
export const SITEMAP_HEADERS = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    'X-Content-Type-Options': 'nosniff',
} as const;
