import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionActor } from '@/lib/auth/rbac';

const session = vi.hoisted(() => ({ actor: null as SessionActor | null }));

/**
 * Server-side authorization, end to end.
 *
 * Only the session actor is stubbed. `requirePermission` runs the real `can()`
 * check from `@/lib/auth/rbac` against the permission set that
 * `resolvePermissions` derives from the actor's roles, and every refused call is
 * followed by an assertion that the collection it targets is untouched — that is
 * what proves the guard is server-side and not just a hidden button.
 */
vi.mock('@/lib/auth/session', async () => {
    const { AuthenticationError, AuthorizationError, can, canAny } = await import(
        '@/lib/auth/rbac'
    );
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
        requireAnyPermission: async (permissions: Parameters<typeof canAny>[1]) => {
            if (!session.actor) throw new AuthenticationError();
            if (!canAny(session.actor, permissions)) throw new AuthorizationError();
            return session.actor;
        },
    };
});

vi.mock('next/headers', () => ({
    headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.12', 'user-agent': 'vitest' }),
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
import { datasetStateAction, importCutoffDatasetAction } from '@/actions/admin/cutoff.actions';
import {
    bulkUpdateLeadsAction,
    createLeadAction,
    exportLeadsAction,
    updateLeadWorkflowAction,
} from '@/actions/admin/lead.actions';
import { rescanLinkHealthAction } from '@/actions/admin/seo.actions';
import { updateRolePermissionsAction } from '@/actions/admin/role.actions';
import { updateSettingsAction } from '@/actions/admin/settings.actions';
import { moderateReviewAction } from '@/actions/review.actions';
import { College } from '@/db/models/college.model';
import { Review } from '@/db/models/content.model';
import { Counsellor } from '@/db/models/counselling.model';
import { State } from '@/db/models/geo.model';
import { Lead, LeadActivity } from '@/db/models/lead.model';
import { Cutoff, Predictor, PredictorDataset } from '@/db/models/predictor.model';
import { Role } from '@/db/models/role.model';
import { SiteSetting } from '@/db/models/site.model';
import { AuditLog } from '@/db/models/system.model';
import { resolvePermissions } from '@/lib/auth/rbac';
import type { ActionResult } from '@/types/common';

function actorFor(roles: string[], name: string): SessionActor {
    return {
        id: String(new Types.ObjectId()),
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        roles,
        permissions: resolvePermissions(roles),
    };
}

const STUDENT = actorFor(['student'], 'Riya Student');
const CONTENT_EDITOR = actorFor(['content_editor'], 'Eddie Editor');
const ADMIN = actorFor(['admin'], 'Priya Admin');
const SUPER_ADMIN = actorFor(['super_admin'], 'Root Owner');
const PREDICTOR_MANAGER = actorFor(['predictor_manager'], 'Pia Predictor');
const CONTENT_MANAGER = actorFor(['content_manager'], 'Cara Content');

function refusalCode(result: ActionResult<unknown>): string | undefined {
    return result.ok ? undefined : result.code;
}

const stateValues = {
    name: 'Karnataka',
    slug: 'karnataka',
    code: 'KA',
    status: 'active',
};

async function seedState() {
    return State.create({ name: 'Kerala', slug: 'kerala', code: 'KL', status: 'active' });
}

async function seedSetting() {
    return SiteSetting.create({
        key: 'contact.phone',
        group: 'contact',
        label: 'Support phone',
        value: '+91 90000 00000',
        valueType: 'string',
        isPublic: true,
        isSecret: false,
    });
}

async function seedRole() {
    return Role.create({
        key: 'content_editor',
        name: 'Content Editor',
        permissions: ['article.read'],
        isSystem: true,
        isStaff: true,
    });
}

async function seedPredictor() {
    return Predictor.create({
        name: 'JEE Main College Predictor',
        slug: 'jee-main-college-predictor',
        metric: 'rank',
        status: 'published',
    });
}

const CUTOFF_IMPORT = {
    year: 2025,
    name: 'JoSAA 2025 import',
    columnMapping: {
        collegeName: 'College',
        branchName: 'Branch',
        category: 'Category',
        closingRank: 'Closing Rank',
    },
    rows: [{ College: 'NIT Trichy', Branch: 'CSE', Category: 'General', 'Closing Rank': '9000' }],
};

async function seedReview() {
    const college = await College.create({
        name: 'IIT Bombay',
        slug: 'iit-bombay',
        state: new Types.ObjectId(),
        stateName: 'Maharashtra',
        city: new Types.ObjectId(),
        cityName: 'Mumbai',
        ownership: 'Government',
        status: 'published',
    });

    const review = await Review.create({
        college: college._id,
        collegeName: 'IIT Bombay',
        collegeSlug: 'iit-bombay',
        authorName: 'Riya Sharma',
        title: 'Strong placements and faculty',
        reviewText: 'Four years of solid teaching, good labs and consistent placement support.',
        ratings: {
            overall: 5,
            placement: 5,
            faculty: 5,
            infrastructure: 5,
            campusLife: 5,
            valueForMoney: 5,
        },
        moderationStatus: 'pending',
    });

    return { college, review };
}

beforeEach(() => {
    session.actor = null;
});

describe('admin/crud.actions — settings.manage', () => {
    it('refuses an anonymous create and writes nothing', async () => {
        const result = await createResourceAction('states', stateValues);

        expect(refusalCode(result)).toBe('UNAUTHENTICATED');
        expect(await State.countDocuments({})).toBe(0);
        expect(await AuditLog.countDocuments({})).toBe(0);
    });

    it('refuses a signed-in student and writes nothing', async () => {
        session.actor = STUDENT;

        const result = await createResourceAction('states', stateValues);

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect(await State.countDocuments({})).toBe(0);
        expect(await AuditLog.countDocuments({})).toBe(0);
    });

    it('refuses a staff member who lacks the permission', async () => {
        session.actor = CONTENT_EDITOR;

        const result = await createResourceAction('states', stateValues);

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect(await State.countDocuments({})).toBe(0);
    });

    it('lets an admin with the permission create', async () => {
        session.actor = ADMIN;

        const result = await createResourceAction('states', stateValues);

        expect(result.ok).toBe(true);
        expect(await State.countDocuments({ slug: 'karnataka' })).toBe(1);
    });

    it('refuses an unauthorised update and leaves the document untouched', async () => {
        const state = await seedState();

        session.actor = STUDENT;
        const result = await updateResourceAction('states', String(state._id), {
            ...stateValues,
            name: 'Hijacked',
            slug: 'hijacked',
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        const stored = await State.findById(state._id).lean();
        expect(stored?.name).toBe('Kerala');
        expect(stored?.slug).toBe('kerala');
    });

    it('refuses an unauthorised delete and leaves the row in place', async () => {
        const state = await seedState();

        session.actor = CONTENT_EDITOR;
        const result = await deleteResourceAction('states', String(state._id));

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect(await State.countDocuments({ _id: state._id })).toBe(1);
    });

    it('lets an admin delete', async () => {
        const state = await seedState();
        session.actor = ADMIN;

        expect((await deleteResourceAction('states', String(state._id))).ok).toBe(true);
        expect(await State.countDocuments({})).toBe(0);
    });
});

describe('admin/role.actions — roles.manage', () => {
    it('refuses an anonymous caller and leaves the permission set alone', async () => {
        const role = await seedRole();

        const result = await updateRolePermissionsAction({
            roleKey: 'content_editor',
            permissions: ['users.manage'],
        });

        expect(refusalCode(result)).toBe('UNAUTHENTICATED');
        expect((await Role.findById(role._id).lean())?.permissions).toEqual(['article.read']);
    });

    it('refuses a student and leaves the permission set alone', async () => {
        const role = await seedRole();
        session.actor = STUDENT;

        const result = await updateRolePermissionsAction({
            roleKey: 'content_editor',
            permissions: ['users.manage'],
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect((await Role.findById(role._id).lean())?.permissions).toEqual(['article.read']);
    });

    it('refuses an admin, because roles.manage is reserved for the owner', async () => {
        const role = await seedRole();
        session.actor = ADMIN;

        const result = await updateRolePermissionsAction({
            roleKey: 'content_editor',
            permissions: ['users.manage'],
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect((await Role.findById(role._id).lean())?.permissions).toEqual(['article.read']);
    });

    it('lets the super admin rewrite a role', async () => {
        const role = await seedRole();
        session.actor = SUPER_ADMIN;

        const result = await updateRolePermissionsAction({
            roleKey: 'content_editor',
            permissions: ['article.read', 'article.update'],
        });

        expect(result.ok).toBe(true);
        expect((await Role.findById(role._id).lean())?.permissions).toEqual([
            'article.read',
            'article.update',
        ]);
        expect(await AuditLog.countDocuments({ action: 'role.update_permissions' })).toBe(1);
    });

    it('still refuses to reduce the super admin role itself', async () => {
        await Role.create({
            key: 'super_admin',
            name: 'Super Admin',
            permissions: ['roles.manage'],
            isSystem: true,
        });
        session.actor = SUPER_ADMIN;

        const result = await updateRolePermissionsAction({
            roleKey: 'super_admin',
            permissions: [],
        });

        expect(refusalCode(result)).toBe('CONFLICT');
        expect((await Role.findOne({ key: 'super_admin' }).lean())?.permissions).toEqual([
            'roles.manage',
        ]);
    });
});

describe('admin/settings.actions — settings.manage', () => {
    it('refuses an anonymous caller and leaves the stored value alone', async () => {
        await seedSetting();

        const result = await updateSettingsAction({
            values: { 'contact.phone': '+91 99999 99999' },
        });

        expect(refusalCode(result)).toBe('UNAUTHENTICATED');
        expect((await SiteSetting.findOne({ key: 'contact.phone' }).lean())?.value).toBe(
            '+91 90000 00000',
        );
    });

    it('refuses a student and leaves the stored value alone', async () => {
        await seedSetting();
        session.actor = STUDENT;

        const result = await updateSettingsAction({
            values: { 'contact.phone': '+91 99999 99999' },
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect((await SiteSetting.findOne({ key: 'contact.phone' }).lean())?.value).toBe(
            '+91 90000 00000',
        );
    });

    it('lets an admin save settings', async () => {
        await seedSetting();
        session.actor = ADMIN;

        const result = await updateSettingsAction({
            values: { 'contact.phone': '+91 99999 99999' },
        });

        expect(result).toMatchObject({ ok: true, data: { updated: 1 } });
        expect((await SiteSetting.findOne({ key: 'contact.phone' }).lean())?.value).toBe(
            '+91 99999 99999',
        );
        expect(await AuditLog.countDocuments({ action: 'settings.update' })).toBe(1);
    });
});

describe('admin/cutoff.actions — cutoff.import and cutoff.publish', () => {
    it('refuses an anonymous import and writes no dataset or rows', async () => {
        const predictor = await seedPredictor();

        const result = await importCutoffDatasetAction({
            ...CUTOFF_IMPORT,
            predictorId: String(predictor._id),
        });

        expect(refusalCode(result)).toBe('UNAUTHENTICATED');
        expect(await PredictorDataset.countDocuments({})).toBe(0);
        expect(await Cutoff.countDocuments({})).toBe(0);
    });

    it('refuses a student import and writes no dataset or rows', async () => {
        const predictor = await seedPredictor();
        session.actor = STUDENT;

        const result = await importCutoffDatasetAction({
            ...CUTOFF_IMPORT,
            predictorId: String(predictor._id),
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect(await PredictorDataset.countDocuments({})).toBe(0);
        expect(await Cutoff.countDocuments({})).toBe(0);
    });

    it('refuses a content editor, who has no predictor permissions', async () => {
        const predictor = await seedPredictor();
        session.actor = CONTENT_EDITOR;

        const result = await importCutoffDatasetAction({
            ...CUTOFF_IMPORT,
            predictorId: String(predictor._id),
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect(await PredictorDataset.countDocuments({})).toBe(0);
    });

    it('lets a predictor manager import a dataset', async () => {
        const predictor = await seedPredictor();
        session.actor = PREDICTOR_MANAGER;

        const result = await importCutoffDatasetAction({
            ...CUTOFF_IMPORT,
            predictorId: String(predictor._id),
        });

        expect(result).toMatchObject({ ok: true, data: { inserted: 1, skipped: 0 } });
        expect(await PredictorDataset.countDocuments({ state: 'validated' })).toBe(1);
        expect(await Cutoff.countDocuments({ isPublished: false })).toBe(1);
    });

    it('refuses an anonymous publish and leaves the dataset unpublished', async () => {
        const predictor = await seedPredictor();
        const dataset = await PredictorDataset.create({
            predictor: predictor._id,
            name: 'JoSAA 2025',
            version: 1,
            year: 2025,
            state: 'validated',
        });

        const result = await datasetStateAction({
            datasetId: String(dataset._id),
            action: 'publish',
        });

        expect(refusalCode(result)).toBe('UNAUTHENTICATED');
        expect((await PredictorDataset.findById(dataset._id).lean())?.state).toBe('validated');
    });

    it('refuses a student publish and leaves the dataset unpublished', async () => {
        const predictor = await seedPredictor();
        const dataset = await PredictorDataset.create({
            predictor: predictor._id,
            name: 'JoSAA 2025',
            version: 1,
            year: 2025,
            state: 'validated',
        });
        session.actor = STUDENT;

        const result = await datasetStateAction({
            datasetId: String(dataset._id),
            action: 'publish',
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect((await PredictorDataset.findById(dataset._id).lean())?.state).toBe('validated');
        expect(await AuditLog.countDocuments({})).toBe(0);
    });

    it('lets a predictor manager publish a dataset', async () => {
        const predictor = await seedPredictor();
        const dataset = await PredictorDataset.create({
            predictor: predictor._id,
            name: 'JoSAA 2025',
            version: 1,
            year: 2025,
            state: 'validated',
        });
        session.actor = PREDICTOR_MANAGER;

        const result = await datasetStateAction({
            datasetId: String(dataset._id),
            action: 'publish',
        });

        expect(result.ok).toBe(true);
        expect((await PredictorDataset.findById(dataset._id).lean())?.state).toBe('published');
    });
});

describe('review.actions.moderateReviewAction — review.moderate', () => {
    it('refuses an anonymous moderation and leaves the review pending', async () => {
        const { review, college } = await seedReview();

        const result = await moderateReviewAction({
            id: String(review._id),
            moderationStatus: 'approved',
        });

        expect(refusalCode(result)).toBe('UNAUTHENTICATED');
        expect((await Review.findById(review._id).lean())?.moderationStatus).toBe('pending');
        expect((await College.findById(college._id).lean())?.rating.count).toBe(0);
    });

    it('refuses a student and leaves the review pending', async () => {
        const { review, college } = await seedReview();
        session.actor = STUDENT;

        const result = await moderateReviewAction({
            id: String(review._id),
            moderationStatus: 'approved',
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect((await Review.findById(review._id).lean())?.moderationStatus).toBe('pending');
        expect((await College.findById(college._id).lean())?.rating.count).toBe(0);
        expect(await AuditLog.countDocuments({})).toBe(0);
    });

    it('refuses a content editor, who cannot moderate reviews', async () => {
        const { review } = await seedReview();
        session.actor = CONTENT_EDITOR;

        const result = await moderateReviewAction({
            id: String(review._id),
            moderationStatus: 'approved',
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect((await Review.findById(review._id).lean())?.moderationStatus).toBe('pending');
    });

    it('lets a content manager approve and refresh the college rating', async () => {
        const { review, college } = await seedReview();
        session.actor = CONTENT_MANAGER;

        const result = await moderateReviewAction({
            id: String(review._id),
            moderationStatus: 'approved',
        });

        expect(result.ok).toBe(true);
        expect((await Review.findById(review._id).lean())?.moderationStatus).toBe('approved');
        expect((await College.findById(college._id).lean())?.rating).toMatchObject({
            overall: 5,
            count: 1,
        });
        expect(await AuditLog.countDocuments({ action: 'review.moderate' })).toBe(1);
    });
});

describe('admin/lead.actions — lead.update, lead.assign, lead.export', () => {
    const SUPPORT_AGENT = actorFor(['support_agent'], 'Sam Support');
    const LEAD_MANAGER = actorFor(['lead_manager'], 'Lata Leads');
    const ANALYST = actorFor(['analyst'], 'Anil Analyst');

    let leadCounter = 0;

    async function seedLead() {
        leadCounter += 1;
        const phone = `98761${String(10_000 + leadCounter)}`;
        return Lead.create({
            reference: `AS2607${String(leadCounter).padStart(5, '0')}`,
            name: 'Aarav Sharma',
            phone,
            phoneNormalized: phone.slice(-10),
            source: 'homepage_counselling_form',
            status: 'new',
            priority: 'medium',
            consent: { given: true, givenAt: new Date() },
        });
    }

    async function seedCounsellor() {
        return Counsellor.create({
            name: 'Neha Kulkarni',
            slug: `neha-${new Types.ObjectId()}`,
            email: `neha-${new Types.ObjectId()}@example.com`,
            status: 'active',
            isAcceptingLeads: true,
            freeSessionMinutes: 30,
            maxDailyBookings: 8,
        });
    }

    beforeEach(() => {
        session.actor = null;
    });

    it('refuses an anonymous stage change', async () => {
        const lead = await seedLead();

        const result = await updateLeadWorkflowAction({ id: String(lead._id), status: 'contacted' });

        expect(refusalCode(result)).toBe('UNAUTHENTICATED');
        expect((await Lead.findById(lead._id).lean())?.status).toBe('new');
    });

    it('refuses an analyst, who may read leads but not change them', async () => {
        const lead = await seedLead();
        session.actor = ANALYST;

        const result = await updateLeadWorkflowAction({ id: String(lead._id), status: 'contacted' });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect((await Lead.findById(lead._id).lean())?.status).toBe('new');
        expect(await LeadActivity.countDocuments({})).toBe(0);
    });

    it('lets a support agent move a lead through the pipeline', async () => {
        const lead = await seedLead();
        session.actor = SUPPORT_AGENT;

        const result = await updateLeadWorkflowAction({ id: String(lead._id), status: 'contacted' });

        expect(result.ok).toBe(true);
        expect((await Lead.findById(lead._id).lean())?.status).toBe('contacted');
    });

    it('refuses a support agent reassigning a lead — assignment is its own permission', async () => {
        const lead = await seedLead();
        const counsellor = await seedCounsellor();
        session.actor = SUPPORT_AGENT;

        const result = await updateLeadWorkflowAction({
            id: String(lead._id),
            assignedTo: String(counsellor._id),
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect((await Lead.findById(lead._id).lean())?.assignedTo).toBeUndefined();
        expect((await Counsellor.findById(counsellor._id).lean())?.activeLeadCount).toBe(0);
    });

    it('lets a lead manager assign a counsellor', async () => {
        const lead = await seedLead();
        const counsellor = await seedCounsellor();
        session.actor = LEAD_MANAGER;

        const result = await updateLeadWorkflowAction({
            id: String(lead._id),
            assignedTo: String(counsellor._id),
        });

        expect(result.ok).toBe(true);
        expect((await Lead.findById(lead._id).lean())?.assignedToName).toBe('Neha Kulkarni');
    });

    it('refuses a bulk assignment without lead.assign', async () => {
        const lead = await seedLead();
        const counsellor = await seedCounsellor();
        session.actor = SUPPORT_AGENT;

        const result = await bulkUpdateLeadsAction({
            ids: [String(lead._id)],
            assignedTo: String(counsellor._id),
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect((await Lead.findById(lead._id).lean())?.assignedTo).toBeUndefined();
    });

    it('refuses a CSV export without lead.export, so lead data cannot leak', async () => {
        await seedLead();
        session.actor = SUPPORT_AGENT;

        const result = await exportLeadsAction({});

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect(await AuditLog.countDocuments({ action: 'lead.export' })).toBe(0);
    });

    it('lets a lead manager export and records the export in the audit log', async () => {
        await seedLead();
        session.actor = LEAD_MANAGER;

        const result = await exportLeadsAction({});

        expect(result.ok).toBe(true);
        expect(await AuditLog.countDocuments({ action: 'lead.export' })).toBe(1);
    });

    it('refuses manual lead creation without lead.create', async () => {
        session.actor = SUPPORT_AGENT;

        const result = await createLeadAction({
            name: 'Kabir Rao',
            phone: '9876500009',
            source: 'admin_manual',
            priority: 'medium',
        });

        expect(refusalCode(result)).toBe('FORBIDDEN');
        expect(await Lead.countDocuments({})).toBe(0);
    });
});

describe('admin/seo.actions.rescanLinkHealthAction — seo.manage', () => {
    it('refuses an anonymous scan', async () => {
        session.actor = null;
        expect(refusalCode(await rescanLinkHealthAction())).toBe('UNAUTHENTICATED');
    });

    it('refuses a content editor, who cannot manage SEO', async () => {
        session.actor = CONTENT_EDITOR;
        expect(refusalCode(await rescanLinkHealthAction())).toBe('FORBIDDEN');
    });

    it('lets a content manager run the scan', async () => {
        session.actor = CONTENT_MANAGER;
        expect((await rescanLinkHealthAction()).ok).toBe(true);
    });
});
