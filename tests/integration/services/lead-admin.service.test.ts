import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { Lead, LeadActivity } from '@/db/models/lead.model';
import { Counsellor } from '@/db/models/counselling.model';
import { Notification } from '@/db/models/system.model';
import {
    applyBulkLeadUpdate,
    applyLeadWorkflow,
    createLeadManually,
    exportLeadsCsv,
    getLeadAnalytics,
    getLeadBoardData,
    getLeadDetailData,
} from '@/services/admin/lead-admin.service';
import type { SessionActor } from '@/lib/auth/rbac';

const ACTOR: SessionActor = {
    id: String(new Types.ObjectId()),
    name: 'Riya Menon',
    email: 'riya@example.org',
    image: null,
    roles: ['lead_manager'],
    permissions: ['lead.read', 'lead.update', 'lead.assign', 'lead.export', 'lead.create'],
};

let leadSequence = 0;

async function seedLead(overrides: Record<string, unknown> = {}) {
    leadSequence += 1;
    const phone = `98765${String(10_000 + leadSequence)}`;
    return Lead.create({
        reference: `AS2607${String(leadSequence).padStart(5, '0')}`,
        name: 'Aarav Sharma',
        phone,
        phoneNormalized: phone.slice(-10),
        source: 'homepage_counselling_form',
        status: 'new',
        priority: 'medium',
        consent: { given: true, givenAt: new Date() },
        ...overrides,
    });
}

async function seedCounsellor(overrides: Record<string, unknown> = {}) {
    return Counsellor.create({
        name: 'Neha Kulkarni',
        slug: `neha-${new Types.ObjectId()}`,
        email: `neha-${new Types.ObjectId()}@example.org`,
        status: 'active',
        isAcceptingLeads: true,
        activeLeadCount: 0,
        freeSessionMinutes: 30,
        maxDailyBookings: 8,
        ...overrides,
    });
}

describe('getLeadBoardData', () => {
    it('returns one column per lifecycle stage, in lifecycle order', async () => {
        await seedLead();

        const board = await getLeadBoardData({});

        expect(board.columns.map((column) => column.status)).toEqual([
            'new',
            'contacted',
            'qualified',
            'session_scheduled',
            'session_completed',
            'follow_up',
            'converted',
            'closed',
            'lost',
        ]);
    });

    it('counts and buckets leads into their own stage', async () => {
        await seedLead({ status: 'new' });
        await seedLead({ status: 'contacted' });
        await seedLead({ status: 'contacted' });

        const board = await getLeadBoardData({});

        expect(board.columns.find((c) => c.status === 'new')?.total).toBe(1);
        expect(board.columns.find((c) => c.status === 'contacted')?.total).toBe(2);
        expect(board.total).toBe(3);
    });

    it('keeps empty stages present so the board never collapses', async () => {
        await seedLead({ status: 'new' });

        const board = await getLeadBoardData({});

        expect(board.columns.find((c) => c.status === 'lost')).toEqual({
            status: 'lost',
            total: 0,
            items: [],
        });
    });

    it('applies the search filter to the board', async () => {
        await seedLead({ name: 'Aarav Sharma' });
        await seedLead({ name: 'Meera Iyer' });

        const board = await getLeadBoardData({ q: 'Meera' });

        expect(board.total).toBe(1);
        expect(board.columns.find((c) => c.status === 'new')?.items[0]?.name).toBe('Meera Iyer');
    });

    it('excludes soft-deleted leads', async () => {
        await seedLead({ isDeleted: true });

        expect((await getLeadBoardData({})).total).toBe(0);
    });
});

describe('applyLeadWorkflow', () => {
    it('moves a lead to a new stage and records the change on the timeline', async () => {
        const lead = await seedLead();

        await applyLeadWorkflow({ id: String(lead._id), status: 'qualified' }, ACTOR);

        expect((await Lead.findById(lead._id).lean())?.status).toBe('qualified');
        const activity = await LeadActivity.findOne({ lead: lead._id, type: 'status_change' }).lean();
        expect(activity?.fromValue).toBe('new');
        expect(activity?.toValue).toBe('qualified');
    });

    it('stamps convertedAt when a lead converts', async () => {
        const lead = await seedLead();

        await applyLeadWorkflow({ id: String(lead._id), status: 'converted' }, ACTOR);

        expect((await Lead.findById(lead._id).lean())?.convertedAt).toBeInstanceOf(Date);
    });

    it('counts a contact attempt when the lead is marked contacted', async () => {
        const lead = await seedLead();

        await applyLeadWorkflow({ id: String(lead._id), status: 'contacted' }, ACTOR);

        const updated = await Lead.findById(lead._id).lean();
        expect(updated?.contactAttempts).toBe(1);
        expect(updated?.lastContactedAt).toBeInstanceOf(Date);
    });

    it('writes no status activity when the stage is unchanged', async () => {
        const lead = await seedLead({ status: 'contacted' });

        await applyLeadWorkflow({ id: String(lead._id), status: 'contacted' }, ACTOR);

        expect(await LeadActivity.countDocuments({ lead: lead._id, type: 'status_change' })).toBe(0);
    });

    it('assigns a counsellor, denormalises the name and increments their load', async () => {
        const lead = await seedLead();
        const counsellor = await seedCounsellor();

        await applyLeadWorkflow({ id: String(lead._id), assignedTo: String(counsellor._id) }, ACTOR);

        const updated = await Lead.findById(lead._id).lean();
        expect(updated?.assignedToName).toBe('Neha Kulkarni');
        expect((await Counsellor.findById(counsellor._id).lean())?.activeLeadCount).toBe(1);
    });

    it('moves the load counter when a lead is reassigned', async () => {
        const first = await seedCounsellor({ activeLeadCount: 1 });
        const second = await seedCounsellor({ name: 'Rahul Verma' });
        const lead = await seedLead({ assignedTo: first._id, assignedToName: first.name });

        await applyLeadWorkflow({ id: String(lead._id), assignedTo: String(second._id) }, ACTOR);

        expect((await Counsellor.findById(first._id).lean())?.activeLeadCount).toBe(0);
        expect((await Counsellor.findById(second._id).lean())?.activeLeadCount).toBe(1);
    });

    it('clears an assignment and releases the counsellor load', async () => {
        const counsellor = await seedCounsellor({ activeLeadCount: 1 });
        const lead = await seedLead({ assignedTo: counsellor._id, assignedToName: counsellor.name });

        await applyLeadWorkflow({ id: String(lead._id), assignedTo: '' }, ACTOR);

        expect((await Lead.findById(lead._id).lean())?.assignedToName).toBeUndefined();
        expect((await Counsellor.findById(counsellor._id).lean())?.activeLeadCount).toBe(0);
    });

    it('rejects an unknown counsellor rather than storing a dangling reference', async () => {
        const lead = await seedLead();

        await expect(
            applyLeadWorkflow({ id: String(lead._id), assignedTo: String(new Types.ObjectId()) }, ACTOR),
        ).rejects.toThrow(/Counsellor not found/i);
    });

    it('rejects an unknown lead', async () => {
        await expect(
            applyLeadWorkflow({ id: String(new Types.ObjectId()), status: 'contacted' }, ACTOR),
        ).rejects.toThrow(/Lead not found/i);
    });

    it('queues a scheduled reminder when a follow-up date is set', async () => {
        const lead = await seedLead();
        const followUp = new Date(Date.now() + 86_400_000);

        await applyLeadWorkflow({ id: String(lead._id), followUpAt: followUp.toISOString() }, ACTOR);

        const notification = await Notification.findOne({ event: 'lead.follow_up_reminder' }).lean();
        expect(notification?.scheduledFor?.toISOString()).toBe(followUp.toISOString());
        expect((await Lead.findById(lead._id).lean())?.followUpAt).toBeInstanceOf(Date);
    });

    it('logs a call attempt with its outcome', async () => {
        const lead = await seedLead();

        await applyLeadWorkflow(
            { id: String(lead._id), callOutcome: 'not_answered', note: 'Rang twice' },
            ACTOR,
        );

        const call = await LeadActivity.findOne({ lead: lead._id, type: 'call' }).lean();
        expect(call?.callOutcome).toBe('not_answered');
        expect(call?.detail).toBe('Rang twice');
        // The note belongs to the call, so it is not duplicated as a standalone note.
        expect(await LeadActivity.countDocuments({ lead: lead._id, type: 'note' })).toBe(0);
    });

    it('records a standalone note when no call is logged', async () => {
        const lead = await seedLead();

        await applyLeadWorkflow({ id: String(lead._id), note: 'Wants Pune colleges only' }, ACTOR);

        const note = await LeadActivity.findOne({ lead: lead._id, type: 'note' }).lean();
        expect(note?.detail).toBe('Wants Pune colleges only');
        expect(note?.actorName).toBe('Riya Menon');
    });

    it('applies several changes from one submit', async () => {
        const lead = await seedLead();
        const counsellor = await seedCounsellor();

        await applyLeadWorkflow(
            {
                id: String(lead._id),
                status: 'session_scheduled',
                priority: 'high',
                assignedTo: String(counsellor._id),
                note: 'Session booked for Friday',
            },
            ACTOR,
        );

        const updated = await Lead.findById(lead._id).lean();
        expect(updated?.status).toBe('session_scheduled');
        expect(updated?.priority).toBe('high');
        expect(updated?.assignedToName).toBe('Neha Kulkarni');
    });
});

describe('applyBulkLeadUpdate', () => {
    it('updates every selected lead and logs one activity each', async () => {
        const first = await seedLead();
        const second = await seedLead();

        const modified = await applyBulkLeadUpdate(
            { ids: [String(first._id), String(second._id)], status: 'contacted' },
            ACTOR,
        );

        expect(modified).toBe(2);
        expect(await Lead.countDocuments({ status: 'contacted' })).toBe(2);
        expect(await LeadActivity.countDocuments({ type: 'system' })).toBe(2);
    });

    it('does nothing when no field was chosen', async () => {
        const lead = await seedLead();

        expect(await applyBulkLeadUpdate({ ids: [String(lead._id)] }, ACTOR)).toBe(0);
    });

    it('rejects an unknown counsellor for a bulk assignment', async () => {
        const lead = await seedLead();

        await expect(
            applyBulkLeadUpdate(
                { ids: [String(lead._id)], assignedTo: String(new Types.ObjectId()) },
                ACTOR,
            ),
        ).rejects.toThrow(/Counsellor not found/i);
    });
});

describe('createLeadManually', () => {
    it('creates a lead with a generated reference and a creation activity', async () => {
        const result = await createLeadManually(
            {
                name: 'Kabir Rao',
                phone: '9876500001',
                email: '',
                stateId: '',
                cityId: '',
                courseInterest: 'B.Tech CSE',
                source: 'admin_manual',
                priority: 'high',
                assignedTo: '',
                message: 'Called the helpline',
            },
            ACTOR,
        );

        expect(result.reference).toMatch(/^AS\d{9}$/);
        const lead = await Lead.findById(result.leadId).lean();
        expect(lead?.name).toBe('Kabir Rao');
        expect(lead?.priority).toBe('high');
        expect(lead?.consent.textVersion).toBe('staff-verbal');
        expect(await LeadActivity.countDocuments({ lead: lead?._id, type: 'created' })).toBe(1);
    });

    it('assigns at creation time and takes up counsellor load', async () => {
        const counsellor = await seedCounsellor();

        const result = await createLeadManually(
            {
                name: 'Ishita Nair',
                phone: '9876500002',
                source: 'admin_manual',
                priority: 'medium',
                assignedTo: String(counsellor._id),
            },
            ACTOR,
        );

        expect((await Lead.findById(result.leadId).lean())?.assignedToName).toBe('Neha Kulkarni');
        expect((await Counsellor.findById(counsellor._id).lean())?.activeLeadCount).toBe(1);
    });
});

describe('getLeadDetailData', () => {
    it('returns the lead with its activity timeline, newest first', async () => {
        const lead = await seedLead();
        await applyLeadWorkflow({ id: String(lead._id), status: 'contacted' }, ACTOR);
        await applyLeadWorkflow({ id: String(lead._id), note: 'Second touch' }, ACTOR);

        const data = await getLeadDetailData(String(lead._id));

        expect(data?.lead.reference).toBe(lead.reference);
        expect(data?.activities[0]?.type).toBe('note');
    });

    it('returns null for a malformed id instead of throwing a cast error', async () => {
        expect(await getLeadDetailData('not-an-object-id')).toBeNull();
    });

    it('returns null for an id that does not exist', async () => {
        expect(await getLeadDetailData(String(new Types.ObjectId()))).toBeNull();
    });
});

describe('getLeadAnalytics', () => {
    it('computes the conversion rate from the status counts', async () => {
        await seedLead({ status: 'converted' });
        await seedLead({ status: 'new' });
        await seedLead({ status: 'lost' });
        await seedLead({ status: 'new' });

        const analytics = await getLeadAnalytics();

        expect(analytics.total).toBe(4);
        expect(analytics.converted).toBe(1);
        expect(analytics.conversionRate).toBe(25);
    });

    it('reports a zero conversion rate on an empty pipeline rather than NaN', async () => {
        const analytics = await getLeadAnalytics();

        expect(analytics.total).toBe(0);
        expect(analytics.conversionRate).toBe(0);
    });

    it('groups counsellor load, treating unassigned leads as their own bucket', async () => {
        const counsellor = await seedCounsellor();
        await seedLead({ assignedTo: counsellor._id, assignedToName: counsellor.name, status: 'converted' });
        await seedLead();

        const analytics = await getLeadAnalytics();

        expect(analytics.counsellors).toEqual(
            expect.arrayContaining([
                { counsellorName: 'Neha Kulkarni', total: 1, converted: 1 },
                { counsellorName: 'Unassigned', total: 1, converted: 0 },
            ]),
        );
    });
});

describe('exportLeadsCsv', () => {
    it('emits a header row and one row per lead', async () => {
        await seedLead({ name: 'Aarav Sharma' });
        await seedLead({ name: 'Meera Iyer' });

        const csv = await exportLeadsCsv({}, ACTOR);
        const lines = csv.split('\n');

        expect(lines[0]).toContain('"Reference"');
        expect(lines).toHaveLength(3);
    });

    it('honours the active filters', async () => {
        await seedLead({ status: 'new' });
        await seedLead({ status: 'converted' });

        const csv = await exportLeadsCsv({ status: 'converted' }, ACTOR);

        expect(csv.split('\n')).toHaveLength(2);
    });

    it('escapes embedded quotes so a cell cannot break the row', async () => {
        await seedLead({ name: 'Aarav "AJ" Sharma' });

        const csv = await exportLeadsCsv({}, ACTOR);

        expect(csv).toContain('"Aarav ""AJ"" Sharma"');
    });

    it('neutralises formula injection in a lead name', async () => {
        await seedLead({ name: '=HYPERLINK("http://evil.test")' });

        const csv = await exportLeadsCsv({}, ACTOR);

        expect(csv).toContain(`"'=HYPERLINK(""http://evil.test"")"`);
    });

    it('never exports the consent IP hash', async () => {
        await seedLead({ consent: { given: true, givenAt: new Date(), ipHash: 'secret-hash' } });

        const csv = await exportLeadsCsv({}, ACTOR);

        expect(csv).not.toContain('secret-hash');
    });
});
