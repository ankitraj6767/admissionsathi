import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionActor } from '@/lib/auth/rbac';

const session = vi.hoisted(() => ({ actor: null as SessionActor | null }));

/**
 * External URL fields through the real Server Action.
 *
 * These values end up in an `href` on a public page, so the write path is the
 * place to stop a script-bearing scheme — a stored `javascript:` URL would be a
 * click away from executing for every visitor.
 *
 * `contact.website` is also the regression guard for the dotted-key bug: the
 * generated form used to submit `{ contact: { website } }` while the schema is
 * keyed by the literal `'contact.website'`, so edits were silently discarded.
 */
vi.mock('@/lib/auth/session', async () => {
    const { AuthenticationError, AuthorizationError, can } = await import('@/lib/auth/rbac');
    return {
        getCurrentActor: async () => session.actor,
        requireActor: async () => {
            if (!session.actor) throw new AuthenticationError();
            return session.actor;
        },
        requirePermission: async (permission: Parameters<typeof can>[1]) => {
            if (!session.actor) throw new AuthenticationError();
            if (!can(session.actor, permission)) throw new AuthorizationError();
            return session.actor;
        },
    };
});

vi.mock('next/headers', () => ({
    headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.40', 'user-agent': 'vitest' }),
}));

vi.mock('next/cache', () => ({
    revalidatePath: () => undefined,
    revalidateTag: () => undefined,
    updateTag: () => undefined,
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { createResourceAction, updateResourceAction } from '@/actions/admin/crud.actions';
import { College } from '@/db/models/college.model';
import { City, State } from '@/db/models/geo.model';
import { resolvePermissions } from '@/lib/auth/rbac';

const ADMIN: SessionActor = {
    id: String(new Types.ObjectId()),
    name: 'Priya Admin',
    email: 'priya@admissionsathi.org',
    roles: ['super_admin'],
    permissions: resolvePermissions(['super_admin']),
};

let stateId: string;
let cityId: string;

function collegeValues(overrides: Record<string, unknown> = {}) {
    return {
        name: 'Silverpeak Institute of Engineering',
        slug: 'silverpeak-institute',
        state: stateId,
        city: cityId,
        ownership: 'Private',
        status: 'published',
        ...overrides,
    };
}

async function createCollege(overrides: Record<string, unknown> = {}) {
    const result = await createResourceAction('colleges', collegeValues(overrides));
    if (!result.ok) throw new Error(`create failed: ${result.error}`);
    return result.data.id;
}

beforeEach(async () => {
    session.actor = ADMIN;

    const state = await State.create({
        name: 'Telangana',
        slug: 'telangana',
        code: 'TS',
        status: 'active',
    });
    const city = await City.create({
        name: 'Hyderabad',
        slug: 'hyderabad',
        state: state._id,
        stateName: 'Telangana',
        status: 'active',
    });
    stateId = String(state._id);
    cityId = String(city._id);
});

describe('contact.website — the dotted-key regression', () => {
    it('saves a website submitted under its dotted key', async () => {
        const id = await createCollege({ 'contact.website': 'https://silverpeak.example.org' });

        expect((await College.findById(id).lean())?.contact?.website).toBe(
            'https://silverpeak.example.org',
        );
    });

    it('updates a website that was already set', async () => {
        const id = await createCollege({ 'contact.website': 'https://old.example.org' });

        const result = await updateResourceAction(
            'colleges',
            id,
            collegeValues({ 'contact.website': 'https://new.example.org' }),
        );

        expect(result.ok).toBe(true);
        expect((await College.findById(id).lean())?.contact?.website).toBe(
            'https://new.example.org',
        );
    });

    it('saves the sibling contact fields alongside it', async () => {
        const id = await createCollege({
            'contact.phone': '+91 91555 55555',
            'contact.email': 'admissions@silverpeak.example.org',
            'contact.website': 'https://silverpeak.example.org',
        });

        expect((await College.findById(id).lean())?.contact).toMatchObject({
            phone: '+91 91555 55555',
            email: 'admissions@silverpeak.example.org',
            website: 'https://silverpeak.example.org',
        });
    });

    it('clears a website when emptied', async () => {
        const id = await createCollege({ 'contact.website': 'https://old.example.org' });

        await updateResourceAction('colleges', id, collegeValues({ 'contact.website': '' }));

        expect((await College.findById(id).lean())?.contact?.website).toBeUndefined();
    });
});

describe('url validation and normalisation', () => {
    it('upgrades a bare domain typed by an editor to https', async () => {
        const id = await createCollege({ 'contact.website': 'silverpeak.example.org' });

        expect((await College.findById(id).lean())?.contact?.website).toBe(
            'https://silverpeak.example.org',
        );
    });

    it('refuses a javascript: URL with a field error and writes nothing', async () => {
        const result = await createResourceAction(
            'colleges',
            collegeValues({ 'contact.website': 'javascript:alert(document.cookie)' }),
        );

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.code).toBe('VALIDATION');
        expect(result.ok === false && result.fieldErrors?.['contact.website']).toBeDefined();
        expect(await College.countDocuments({})).toBe(0);
    });

    it.each([
        'data:text/html,<script>alert(1)</script>',
        '//evil.test/phish',
        'not a url',
    ])('refuses %s', async (value) => {
        const result = await createResourceAction(
            'colleges',
            collegeValues({ 'contact.website': value }),
        );

        expect(result.ok).toBe(false);
        expect(await College.countDocuments({})).toBe(0);
    });

    it('refuses mailto for a field that must be a web page', async () => {
        const result = await createResourceAction(
            'colleges',
            collegeValues({ 'contact.website': 'mailto:admissions@example.org' }),
        );

        expect(result.ok).toBe(false);
    });
});

describe('brochureUrl', () => {
    it('saves a brochure link', async () => {
        const id = await createCollege({
            brochureUrl: 'https://silverpeak.example.org/brochure.pdf',
        });

        expect((await College.findById(id).lean())?.brochureUrl).toBe(
            'https://silverpeak.example.org/brochure.pdf',
        );
    });

    it('updates and clears a brochure link', async () => {
        const id = await createCollege({ brochureUrl: 'https://a.example.org/old.pdf' });

        await updateResourceAction(
            'colleges',
            id,
            collegeValues({ brochureUrl: 'https://a.example.org/new.pdf' }),
        );
        expect((await College.findById(id).lean())?.brochureUrl).toBe(
            'https://a.example.org/new.pdf',
        );

        await updateResourceAction('colleges', id, collegeValues({ brochureUrl: '' }));
        expect((await College.findById(id).lean())?.brochureUrl).toBeUndefined();
    });

    it('refuses an unsafe brochure link', async () => {
        const result = await createResourceAction(
            'colleges',
            collegeValues({ brochureUrl: 'javascript:alert(1)' }),
        );

        expect(result.ok).toBe(false);
    });
});

describe('other dotted numeric fields still round-trip', () => {
    it('saves fee, ranking and placement values', async () => {
        const id = await createCollege({
            'feeRange.min': 120000,
            'feeRange.max': 320000,
            'ranking.nirfOverall': 84,
            'placement.averagePackage': 680000,
            'placement.placementPercentage': 91,
        });

        const stored = await College.findById(id).lean();
        expect(stored?.feeRange).toMatchObject({ min: 120000, max: 320000 });
        expect(stored?.ranking?.nirfOverall).toBe(84);
        expect(stored?.placement).toMatchObject({ averagePackage: 680000, placementPercentage: 91 });
    });

    it('saves nested SEO metadata', async () => {
        const id = await createCollege({
            'seo.title': 'Silverpeak Institute — Fees, Cut-offs, Placements',
            'seo.description': 'Admission details for Silverpeak Institute.',
        });

        expect((await College.findById(id).lean())?.seo).toMatchObject({
            title: 'Silverpeak Institute — Fees, Cut-offs, Placements',
            description: 'Admission details for Silverpeak Institute.',
        });
    });
});
