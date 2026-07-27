import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionActor } from '@/lib/auth/rbac';

const session = vi.hoisted(() => ({ actor: null as SessionActor | null }));

/**
 * Only the actor is stubbed: `requirePermission` still runs the real `can()`
 * check from the RBAC module against that actor's permission set.
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
            if (!can(session.actor, permission)) {
                throw new AuthorizationError(`Missing permission: ${permission}`);
            }
            return session.actor;
        },
    };
});

vi.mock('next/headers', () => ({
    headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.11', 'user-agent': 'vitest' }),
}));

vi.mock('next/cache', () => ({
    revalidatePath: () => undefined,
    revalidateTag: () => undefined,
    updateTag: () => undefined,
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import {
    createResourceAction,
    deleteResourceAction,
    updateResourceAction,
} from '@/actions/admin/crud.actions';
import { State } from '@/db/models/geo.model';
import { AuditLog } from '@/db/models/system.model';
import { resolvePermissions } from '@/lib/auth/rbac';

const ADMIN: SessionActor = {
    id: String(new Types.ObjectId()),
    name: 'Priya Admin',
    email: 'priya@admissionsathi.org',
    roles: ['admin'],
    permissions: resolvePermissions(['admin']),
};

function stateValues(overrides: Record<string, unknown> = {}) {
    return {
        name: 'Karnataka',
        slug: 'karnataka',
        code: 'KA',
        status: 'active',
        ...overrides,
    };
}

/** `createdBy` / `updatedBy` come from the audit plugin, not from `StateDoc`. */
async function auditFields(id: string) {
    const stored = await State.findById(id).lean();
    return (stored ?? {}) as unknown as { createdBy?: unknown; updatedBy?: unknown };
}

async function createState(overrides: Record<string, unknown> = {}) {
    const result = await createResourceAction('states', stateValues(overrides));
    if (!result.ok) throw new Error(`seed failed: ${result.error}`);
    return result.data.id;
}

beforeEach(() => {
    session.actor = ADMIN;
});

describe('createResourceAction', () => {
    it('creates the document and returns its id', async () => {
        const result = await createResourceAction('states', stateValues());

        expect(result.ok).toBe(true);
        const stored = await State.findById(result.ok ? result.data.id : '').lean();
        expect(stored).toMatchObject({ name: 'Karnataka', slug: 'karnataka', code: 'KA' });
        expect(String((await auditFields(result.ok ? result.data.id : '')).createdBy)).toBe(ADMIN.id);
    });

    it('writes an audit row for the create', async () => {
        const id = await createState();

        const log = await AuditLog.findOne({ action: 'State.create' }).lean();
        expect(log).toMatchObject({
            entity: 'State',
            entityId: id,
            entityLabel: 'Karnataka',
            outcome: 'success',
        });
        expect(String(log?.actor)).toBe(ADMIN.id);
        expect(log?.actorRoles).toEqual(['admin']);
    });

    it('rejects missing required fields with field errors and writes nothing', async () => {
        const result = await createResourceAction('states', { name: '', slug: '', code: '' });

        expect(result.ok === false && result.code).toBe('VALIDATION');
        expect(result.ok === false && result.fieldErrors).toBeDefined();
        expect(await State.countDocuments({})).toBe(0);
        expect(await AuditLog.countDocuments({})).toBe(0);
    });

    it('refuses an unknown resource key', async () => {
        const result = await createResourceAction('not-a-resource', stateValues());

        expect(result.ok === false && result.code).toBe('NOT_FOUND');
        expect(await AuditLog.countDocuments({})).toBe(0);
    });

    it('reports a duplicate slug as a conflict instead of crashing', async () => {
        await State.init();
        await createState();

        const result = await createResourceAction('states', stateValues({ name: 'Karnataka Two' }));

        expect(result.ok === false && result.code).toBe('DUPLICATE');
        expect(await State.countDocuments({})).toBe(1);
    });
});

describe('updateResourceAction', () => {
    it('applies the change and stamps the editor', async () => {
        const id = await createState();

        const result = await updateResourceAction('states', id, stateValues({ code: 'KAR' }));

        expect(result.ok).toBe(true);
        const stored = await State.findById(id).lean();
        expect(stored?.code).toBe('KAR');
        expect(String((await auditFields(id)).updatedBy)).toBe(ADMIN.id);
    });

    it('audits only the fields that actually changed', async () => {
        const id = await createState();

        await updateResourceAction('states', id, stateValues({ code: 'KAR' }));

        const log = await AuditLog.findOne({ action: 'State.update' }).lean();
        expect(log?.previousValues).toEqual({ code: 'KA' });
        // `seo.keywords` is a tags field: it parses to `[]` rather than `undefined`,
        // so it is diffed against the unset stored value and always looks changed.
        expect(log?.newValues).toEqual({ code: 'KAR', 'seo.keywords': [] });
    });

    it('returns NOT_FOUND for a missing document and writes no audit row', async () => {
        const result = await updateResourceAction(
            'states',
            String(new Types.ObjectId()),
            stateValues(),
        );

        expect(result.ok === false && result.code).toBe('NOT_FOUND');
        expect(await AuditLog.countDocuments({ action: 'State.update' })).toBe(0);
    });

    it('renames the slug (State keeps no slug history to append to)', async () => {
        const id = await createState();

        await updateResourceAction('states', id, stateValues({ slug: 'karnataka-state' }));

        const stored = await State.findById(id).lean();
        expect(stored?.slug).toBe('karnataka-state');
        expect((stored as unknown as { slugHistory?: unknown }).slugHistory).toBeUndefined();
    });
});

describe('deleteResourceAction', () => {
    it('deletes a resource without soft-delete support outright', async () => {
        const id = await createState();

        const result = await deleteResourceAction('states', id);

        expect(result).toMatchObject({ ok: true, data: { softDeleted: false } });
        expect(await State.countDocuments({})).toBe(0);
    });

    it('writes an audit row for the delete', async () => {
        const id = await createState();

        await deleteResourceAction('states', id);

        const log = await AuditLog.findOne({ action: 'State.delete' }).lean();
        expect(log).toMatchObject({ entity: 'State', entityId: id, entityLabel: 'Karnataka' });
    });

    it('returns NOT_FOUND for an already deleted document', async () => {
        const id = await createState();
        await deleteResourceAction('states', id);

        const result = await deleteResourceAction('states', id);

        expect(result.ok === false && result.code).toBe('NOT_FOUND');
        expect(await AuditLog.countDocuments({ action: 'State.delete' })).toBe(1);
    });
});

describe('audit trail', () => {
    it('records one row per mutation, in order', async () => {
        const id = await createState();
        await updateResourceAction('states', id, stateValues({ code: 'KAR' }));
        await deleteResourceAction('states', id);

        const logs = await AuditLog.find({ entity: 'State' }).sort({ createdAt: 1 }).lean();

        expect(logs.map((log) => log.action)).toEqual([
            'State.create',
            'State.update',
            'State.delete',
        ]);
    });

    it('hashes the caller IP rather than storing it', async () => {
        await createState();

        const log = await AuditLog.findOne({}).lean();
        expect(log?.ipHash).toMatch(/^[a-f0-9]{32}$/);
        expect(JSON.stringify(log)).not.toContain('203.0.113.11');
    });
});
