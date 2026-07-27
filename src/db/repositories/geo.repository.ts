import 'server-only';
import type { FilterQuery } from 'mongoose';
import { City, State, type CityDoc, type StateDoc } from '@/db/models/geo.model';
import { escapeRegex } from '@/lib/utils';
import { findLean, findOneLean, listSlugRows, type SlugRow } from './base.repository';

/** Active, indexable and not soft-deleted — what the sitemap may advertise. */
const ACTIVE_SITEMAP_FILTER = {
    status: 'active',
    isDeleted: { $ne: true },
    'seo.noIndex': { $ne: true },
} as const;

export async function listStates(options?: {
    featuredOnly?: boolean;
    limit?: number;
}): Promise<StateDoc[]> {
    return findLean<StateDoc>(
        State,
        { status: 'active', ...(options?.featuredOnly ? { isFeatured: true } : {}) },
        {
            sort: { displayOrder: 1, name: 1 },
            limit: options?.limit ?? 40,
            projection: { name: 1, slug: 1, code: 1, collegeCount: 1, isFeatured: 1 },
        },
    );
}

export async function getStateBySlug(slug: string): Promise<StateDoc | null> {
    return findOneLean<StateDoc>(State, { slug, status: 'active' });
}

export async function listCities(options?: {
    stateId?: string;
    featuredOnly?: boolean;
    limit?: number;
}): Promise<CityDoc[]> {
    return findLean<CityDoc>(
        City,
        {
            status: 'active',
            ...(options?.stateId ? { state: options.stateId } : {}),
            ...(options?.featuredOnly ? { isFeatured: true } : {}),
        },
        {
            sort: { displayOrder: 1, collegeCount: -1, name: 1 },
            limit: options?.limit ?? 60,
            projection: { name: 1, slug: 1, stateName: 1, collegeCount: 1, isFeatured: 1 },
        },
    );
}

export async function getCityBySlug(slug: string): Promise<CityDoc | null> {
    return findOneLean<CityDoc>(City, { slug, status: 'active' });
}

export async function cityAutocomplete(term: string, limit = 5): Promise<CityDoc[]> {
    const rx = new RegExp(`^${escapeRegex(term)}`, 'i');
    return findLean<CityDoc>(
        City,
        { status: 'active', name: rx },
        { sort: { collegeCount: -1 }, limit, projection: { name: 1, slug: 1, stateName: 1 } },
    );
}

export async function stateAutocomplete(term: string, limit = 4): Promise<StateDoc[]> {
    const rx = new RegExp(`^${escapeRegex(term)}`, 'i');
    return findLean<StateDoc>(
        State,
        { status: 'active', name: rx },
        { sort: { collegeCount: -1 }, limit, projection: { name: 1, slug: 1 } },
    );
}

/** Indexable state slugs for the sitemap's location landing pages. */
export async function listStateSitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<StateDoc>(State, ACTIVE_SITEMAP_FILTER as FilterQuery<StateDoc>, { limit });
}

/**
 * City slugs for the sitemap, busiest city first.
 * Only cities that actually have colleges, so `/colleges/city/[slug]` is never
 * published as a thin page.
 */
export async function listCitySitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<CityDoc>(
        City,
        { ...ACTIVE_SITEMAP_FILTER, collegeCount: { $gt: 0 } } as FilterQuery<CityDoc>,
        { limit, sort: { collegeCount: -1 } },
    );
}

/** Denormalised state name for a lead's CRM fields. */
export async function findStateNameById(
    id: string,
): Promise<Pick<StateDoc, '_id' | 'name'> | null> {
    return findOneLean<StateDoc>(State, { _id: id } as FilterQuery<StateDoc>, {
        projection: { name: 1 },
    });
}

/** Denormalised city name for a lead's CRM fields. */
export async function findCityNameById(id: string): Promise<Pick<CityDoc, '_id' | 'name'> | null> {
    return findOneLean<CityDoc>(City, { _id: id } as FilterQuery<CityDoc>, {
        projection: { name: 1 },
    });
}
