import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { siteConfig } from '@/config/site';
import { State, type StateDoc } from '@/db/models/geo.model';
import {
    countDocs,
    distinctLean,
    findLean,
    findOneLean,
    paginate,
    toPlain,
} from '@/db/repositories/base.repository';

interface StateSeed {
    name: string;
    slug: string;
    code: string;
    displayOrder?: number;
    region?: string;
    status?: string;
}

/** State is the simplest model in the schema: no soft-delete hook to interfere. */
async function seedStates(count: number, overrides: (index: number) => Partial<StateSeed> = () => ({})) {
    const rows: StateSeed[] = Array.from({ length: count }, (_, index) => ({
        name: `State ${String(index).padStart(4, '0')}`,
        slug: `state-${String(index).padStart(4, '0')}`,
        code: `S${String(index).padStart(3, '0')}`,
        displayOrder: index,
        ...overrides(index),
    }));
    await State.insertMany(rows);
}

describe('base repository — paginate', () => {
    it('clamps pageSize to the configured maximum', async () => {
        await seedStates(3);

        const page = await paginate<StateDoc>(State, { pageSize: 5_000 });

        expect(page.pageSize).toBe(siteConfig.pagination.maxLimit);
    });

    it('raises a pageSize below one to one', async () => {
        await seedStates(3);

        const page = await paginate<StateDoc>(State, { pageSize: 0 });

        expect(page.pageSize).toBe(1);
        expect(page.items).toHaveLength(1);
    });

    it('falls back to the configured listing size when no pageSize is given', async () => {
        await seedStates(2);

        const page = await paginate<StateDoc>(State, {});

        expect(page.pageSize).toBe(siteConfig.pagination.listing);
    });

    it('floors a page below one at one', async () => {
        await seedStates(3);

        await expect(paginate<StateDoc>(State, { page: 0 })).resolves.toMatchObject({ page: 1 });
        await expect(paginate<StateDoc>(State, { page: -12 })).resolves.toMatchObject({ page: 1 });
    });

    it('truncates a fractional page instead of rejecting it', async () => {
        await seedStates(5);

        const page = await paginate<StateDoc>(State, { page: 2.9, pageSize: 2 });

        expect(page.page).toBe(2);
    });

    it('reports total, totalPages and the navigation flags', async () => {
        await seedStates(5);

        const page = await paginate<StateDoc>(State, { pageSize: 2, sort: { displayOrder: 1 } });

        expect(page).toMatchObject({
            total: 5,
            totalPages: 3,
            hasNext: true,
            hasPrev: false,
        });
    });

    it('reports hasPrev on a middle page and no hasNext on the last', async () => {
        await seedStates(5);

        const middle = await paginate<StateDoc>(State, { page: 2, pageSize: 2 });
        const last = await paginate<StateDoc>(State, { page: 3, pageSize: 2 });

        expect(middle).toMatchObject({ hasPrev: true, hasNext: true });
        expect(last).toMatchObject({ hasPrev: true, hasNext: false });
    });

    it('keeps totalPages at one for an empty collection', async () => {
        const page = await paginate<StateDoc>(State, {});

        expect(page).toMatchObject({ total: 0, totalPages: 1, hasNext: false, hasPrev: false });
        expect(page.items).toEqual([]);
    });

    it('applies the requested sort and skip', async () => {
        await seedStates(4);

        const page = await paginate<StateDoc>(State, {
            page: 2,
            pageSize: 2,
            sort: { displayOrder: -1 },
        });

        expect(page.items.map((state) => state.slug)).toEqual(['state-0001', 'state-0000']);
    });

    it('honours a projection', async () => {
        await seedStates(1);

        const page = await paginate<StateDoc>(State, { projection: { slug: 1 } });

        expect(page.items[0]?.slug).toBe('state-0000');
        expect(page.items[0]?.name).toBeUndefined();
    });

    it('applies the filter to the count as well as the page', async () => {
        await seedStates(4, (index) => ({ status: index < 2 ? 'active' : 'inactive' }));

        const page = await paginate<StateDoc>(State, { filter: { status: 'active' } });

        expect(page.total).toBe(2);
        expect(page.items).toHaveLength(2);
    });
});

describe('base repository — findLean', () => {
    it('caps the limit at 500 even when a larger one is asked for', async () => {
        await seedStates(505);

        const rows = await findLean<StateDoc>(State, {}, { limit: 5_000 });

        expect(rows).toHaveLength(500);
    });

    it('defaults to 100 rows when no limit is given', async () => {
        await seedStates(505);

        expect(await findLean<StateDoc>(State, {})).toHaveLength(100);
    });

    it('returns plain objects rather than documents', async () => {
        await seedStates(1);
        const [row] = await findLean<StateDoc>(State, {});

        expect(typeof (row as unknown as { save?: unknown }).save).toBe('undefined');
    });
});

describe('base repository — findOneLean and countDocs', () => {
    it('returns null when nothing matches', async () => {
        await seedStates(1);

        expect(await findOneLean<StateDoc>(State, { slug: 'missing' })).toBeNull();
    });

    it('counts only matching rows', async () => {
        await seedStates(3, (index) => ({ region: index === 0 ? 'South' : 'North' }));

        expect(await countDocs<StateDoc>(State, { region: 'North' })).toBe(2);
        expect(await countDocs<StateDoc>(State)).toBe(3);
    });
});

describe('base repository — distinctLean', () => {
    it('returns the distinct values for a field', async () => {
        await seedStates(4, (index) => ({ region: index % 2 === 0 ? 'North' : 'South' }));

        const regions = await distinctLean<StateDoc, string>(State, 'region');

        expect([...regions].sort()).toEqual(['North', 'South']);
    });

    it('drops the null bucket produced by rows without the field', async () => {
        await seedStates(3, (index) => (index === 0 ? { region: 'West' } : {}));

        // Mongo reports a missing field as `null`; a null facet value is unusable.
        expect(await distinctLean<StateDoc, string>(State, 'region')).toEqual(['West']);
    });

    it('applies the filter before collecting values', async () => {
        await seedStates(4, (index) => ({
            region: index < 2 ? 'East' : 'Central',
            status: index < 2 ? 'active' : 'inactive',
        }));

        const regions = await distinctLean<StateDoc, string>(State, 'region', { status: 'active' });

        expect(regions).toEqual(['East']);
    });
});

describe('base repository — toPlain', () => {
    it('turns ObjectId and Date values into JSON-safe primitives', () => {
        const id = new Types.ObjectId();
        const when = new Date('2026-02-03T04:05:06.000Z');

        const plain = toPlain({ _id: id, createdAt: when, nested: { _id: id } });

        expect(typeof plain._id).toBe('string');
        expect(plain._id).toEqual(String(id));
        expect(plain.createdAt).toBe('2026-02-03T04:05:06.000Z');
        expect(typeof plain.nested._id).toBe('string');
    });

    it('keeps scalars, arrays and nulls intact', () => {
        const plain = toPlain({ count: 3, flags: [true, false], note: null, label: 'kept' });

        expect(plain).toEqual({ count: 3, flags: [true, false], note: null, label: 'kept' });
    });

    it('drops undefined values, as JSON serialisation does', () => {
        const plain = toPlain<{ kept: string; gone?: string }>({ kept: 'yes', gone: undefined });

        expect(Object.keys(plain)).toEqual(['kept']);
    });
});
