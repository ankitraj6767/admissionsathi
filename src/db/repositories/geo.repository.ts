import 'server-only';
import { City, State, type CityDoc, type StateDoc } from '@/db/models/geo.model';
import { escapeRegex } from '@/lib/utils';
import { findLean, findOneLean } from './base.repository';

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
