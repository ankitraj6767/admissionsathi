import { describe, expect, it } from 'vitest';
import { State } from '@/db/models/geo.model';
import { getStateBySlug, listStates, stateAutocomplete } from '@/db/repositories/geo.repository';

async function seedState(overrides: Partial<Record<string, unknown>> = {}) {
    return State.create({
        name: 'Karnataka',
        slug: 'karnataka',
        code: 'KA',
        collegeCount: 12,
        status: 'active',
        ...overrides,
    });
}

describe('geo repository', () => {
    it('lists only active states', async () => {
        await seedState();
        await seedState({ name: 'Retired', slug: 'retired', code: 'RT', status: 'inactive' });

        const states = await listStates();

        expect(states.map((state) => state.slug)).toEqual(['karnataka']);
    });

    it('returns plain objects, not Mongoose documents', async () => {
        await seedState();
        const [state] = await listStates();

        // Repositories are the RSC boundary: a hydrated document would not serialise.
        expect(state).toBeDefined();
        expect(typeof (state as unknown as { save?: unknown }).save).toBe('undefined');
    });

    it('finds a state by slug and ignores inactive rows', async () => {
        await seedState({ name: 'Kerala', slug: 'kerala', code: 'KL', status: 'inactive' });

        expect(await getStateBySlug('kerala')).toBeNull();
    });

    it('anchors autocomplete to the start of the name', async () => {
        await seedState({ name: 'Karnataka', slug: 'karnataka', code: 'KA' });
        await seedState({ name: 'Uttar Karnataka Region', slug: 'ukr', code: 'UK' });

        const matches = await stateAutocomplete('Kar');

        expect(matches.map((state) => state.slug)).toEqual(['karnataka']);
    });

    it('treats a regex metacharacter in the term as a literal', async () => {
        await seedState();

        // Unescaped, `.*` would match every row — proving the escaping is real.
        await expect(stateAutocomplete('.*')).resolves.toEqual([]);
    });

    it('respects the requested limit', async () => {
        await Promise.all(
            Array.from({ length: 5 }, (_, index) =>
                seedState({ name: `State ${index}`, slug: `state-${index}`, code: `S${index}` }),
            ),
        );

        expect(await listStates({ limit: 2 })).toHaveLength(2);
    });
});
