import 'server-only';
import { listCities, listStates } from '@/db/repositories/geo.repository';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';

/**
 * Cached geography lookups for chrome that renders on every page.
 *
 * The footer's SEO link block and the homepage hero's location dropdown were
 * querying Atlas on every single request for data that changes when an admin
 * edits a state or city — a handful of times a year. These loaders return plain
 * `{ id, slug, name }` rows rather than lean documents on purpose: the data cache
 * serialises with `JSON.stringify`, so a `Date` or `ObjectId` on a cached
 * document would silently come back as a string. Keeping the shape primitive
 * makes that a non-issue.
 *
 * Invalidated by the `geo` tag, which the admin CRUD actions already fire.
 */

export interface GeoLink {
    id: string;
    slug: string;
    name: string;
}

export const getFooterStateLinks = cached(
    async (): Promise<GeoLink[]> => {
        const rows = await listStates({ featuredOnly: true, limit: 12 }).catch(() => []);
        return rows.map((row) => ({ id: String(row._id), slug: row.slug, name: row.name }));
    },
    ['footer-state-links'],
    { tags: [CACHE_TAGS.geo], revalidate: CACHE_TTL.long },
);

export const getFooterCityLinks = cached(
    async (): Promise<GeoLink[]> => {
        const rows = await listCities({ featuredOnly: true, limit: 12 }).catch(() => []);
        return rows.map((row) => ({ id: String(row._id), slug: row.slug, name: row.name }));
    },
    ['footer-city-links'],
    { tags: [CACHE_TAGS.geo], revalidate: CACHE_TTL.long },
);

/** State options for the homepage hero's lead form. */
export const getStateOptions = cached(
    async (): Promise<{ label: string; value: string }[]> => {
        const rows = await listStates({ limit: 40 }).catch(() => []);
        return rows.map((row) => ({ label: row.name, value: String(row._id) }));
    },
    ['state-options'],
    { tags: [CACHE_TAGS.geo], revalidate: CACHE_TTL.long },
);
