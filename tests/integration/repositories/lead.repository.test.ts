import type { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { Lead } from '@/db/models/lead.model';
import {
    findLeadByIdempotencyKey,
    findNewsletterSubscription,
    findRecentDuplicate,
    generateLeadReference,
    listLeadsForEmail,
    normalizePhone,
} from '@/db/repositories/lead.repository';

let referenceCounter = 0;

async function seedLead(overrides: Record<string, unknown> = {}) {
    referenceCounter += 1;
    return Lead.create({
        reference: `ASTEST${String(referenceCounter).padStart(4, '0')}`,
        name: 'Aman Verma',
        phone: '+91 98765 43210',
        phoneNormalized: normalizePhone('+91 98765 43210'),
        source: 'homepage_counselling_form',
        consent: { given: true, givenAt: new Date(), ipHash: 'hashed-ip-value' },
        userAgent: 'Mozilla/5.0 (integration test)',
        ...overrides,
    });
}

/**
 * Back-dates a lead. Mongoose treats `createdAt` as immutable, so the fixture
 * writes through the driver collection instead of the model.
 */
async function setCreatedAt(id: Types.ObjectId, createdAt: Date) {
    await Lead.collection.updateOne({ _id: id }, { $set: { createdAt } });
}

describe('normalizePhone', () => {
    it('keeps the last ten digits of an Indian mobile number', () => {
        expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
    });

    it('strips every non-digit character', () => {
        expect(normalizePhone('(098) 765-43210')).toBe('9876543210');
    });

    it('leaves an already normalised number unchanged', () => {
        expect(normalizePhone('9876543210')).toBe('9876543210');
    });

    it('returns a shorter string untouched rather than padding it', () => {
        expect(normalizePhone('12345')).toBe('12345');
    });

    it('returns an empty string when there are no digits', () => {
        expect(normalizePhone('not-a-phone')).toBe('');
    });
});

describe('generateLeadReference', () => {
    it('formats the reference as AS + year + month + a five-digit sequence', async () => {
        const now = new Date();
        const prefix = `AS${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

        const reference = await generateLeadReference();

        expect(reference).toMatch(/^AS\d{9}$/);
        expect(reference.startsWith(prefix)).toBe(true);
        expect(reference).toBe(`${prefix}00001`);
    });

    it('advances the sequence for each lead created this month', async () => {
        await seedLead();
        const second = await generateLeadReference();

        await seedLead();
        const third = await generateLeadReference();

        expect(second.endsWith('00002')).toBe(true);
        expect(third.endsWith('00003')).toBe(true);
        expect(second).not.toBe(third);
    });

    it('produces a reference the unique index accepts', async () => {
        const reference = await generateLeadReference();
        await seedLead({ reference });

        expect(await Lead.countDocuments({ reference })).toBe(1);
    });
});

describe('findLeadByIdempotencyKey', () => {
    it('returns the lead stored under the key', async () => {
        await seedLead({ idempotencyKey: 'form-token-abc123' });

        const lead = await findLeadByIdempotencyKey('form-token-abc123');

        expect(lead?.name).toBe('Aman Verma');
    });

    it('returns null for an unknown key', async () => {
        await seedLead({ idempotencyKey: 'form-token-abc123' });

        expect(await findLeadByIdempotencyKey('form-token-zzz999')).toBeNull();
    });

    it('does not match a lead submitted without a key', async () => {
        await seedLead();

        expect(await findLeadByIdempotencyKey('')).toBeNull();
    });
});

describe('findRecentDuplicate', () => {
    it('finds a lead with the same normalised phone inside the window', async () => {
        const lead = await seedLead();
        await setCreatedAt(lead._id, new Date(Date.now() - 2 * 3600 * 1000));

        const duplicate = await findRecentDuplicate('9876543210', 24);

        expect(String(duplicate?._id)).toBe(String(lead._id));
    });

    it('ignores a lead that is older than the window', async () => {
        const lead = await seedLead();
        await setCreatedAt(lead._id, new Date(Date.now() - 30 * 3600 * 1000));

        expect(await findRecentDuplicate('9876543210', 24)).toBeNull();
    });

    it('ignores a different phone number', async () => {
        await seedLead();

        expect(await findRecentDuplicate('9000000000', 24)).toBeNull();
    });

    it('returns the most recent match when several exist', async () => {
        const older = await seedLead();
        const newer = await seedLead();
        await setCreatedAt(older._id, new Date(Date.now() - 10 * 3600 * 1000));
        await setCreatedAt(newer._id, new Date(Date.now() - 1 * 3600 * 1000));

        const duplicate = await findRecentDuplicate('9876543210', 24);

        expect(String(duplicate?._id)).toBe(String(newer._id));
    });

    it('matches across sources — the phone number alone defines a duplicate', async () => {
        await seedLead({ source: 'college_enquiry' });

        expect(await findRecentDuplicate('9876543210', 24)).not.toBeNull();
    });

    it('narrows the match when a shorter window is requested', async () => {
        const lead = await seedLead();
        await setCreatedAt(lead._id, new Date(Date.now() - 5 * 3600 * 1000));

        expect(await findRecentDuplicate('9876543210', 24)).not.toBeNull();
        expect(await findRecentDuplicate('9876543210', 2)).toBeNull();
    });
});

describe('findNewsletterSubscription', () => {
    it('finds an existing newsletter signup for the email', async () => {
        await seedLead({ email: 'reader@example.com', source: 'newsletter' });

        expect(await findNewsletterSubscription('reader@example.com')).not.toBeNull();
    });

    it('matches case-insensitively by lowercasing the email', async () => {
        await seedLead({ email: 'reader@example.com', source: 'newsletter' });

        expect(await findNewsletterSubscription('Reader@Example.com')).not.toBeNull();
    });

    it('ignores leads from other sources with the same email', async () => {
        await seedLead({ email: 'reader@example.com', source: 'college_enquiry' });

        expect(await findNewsletterSubscription('reader@example.com')).toBeNull();
    });

    it('returns the id only', async () => {
        await seedLead({ email: 'reader@example.com', source: 'newsletter' });

        const row = await findNewsletterSubscription('reader@example.com');

        expect(row?._id).toBeDefined();
        expect(row?.name).toBeUndefined();
    });
});

describe('listLeadsForEmail', () => {
    it('returns the leads submitted with that email, newest first', async () => {
        const older = await seedLead({ email: 'student@example.com', message: 'first enquiry' });
        const newer = await seedLead({ email: 'student@example.com', message: 'second enquiry' });
        await setCreatedAt(older._id, new Date('2026-01-01T00:00:00.000Z'));
        await setCreatedAt(newer._id, new Date('2026-02-01T00:00:00.000Z'));

        const rows = await listLeadsForEmail('student@example.com');

        expect(rows.map((lead) => lead.message)).toEqual(['second enquiry', 'first enquiry']);
    });

    it('excludes the hashed IP and the user agent from the export', async () => {
        await seedLead({ email: 'student@example.com' });

        const [lead] = await listLeadsForEmail('student@example.com');

        expect(lead?.consent.given).toBe(true);
        expect(lead?.consent.ipHash).toBeUndefined();
        expect(lead?.userAgent).toBeUndefined();
    });

    it('lowercases the requested email before matching', async () => {
        await seedLead({ email: 'student@example.com' });

        expect(await listLeadsForEmail('STUDENT@example.com')).toHaveLength(1);
    });

    it('does not return another student’s leads', async () => {
        await seedLead({ email: 'student@example.com' });
        await seedLead({ email: 'other@example.com' });

        const rows = await listLeadsForEmail('student@example.com');

        expect(rows).toHaveLength(1);
        expect(rows[0]?.email).toBe('student@example.com');
    });

    it('excludes soft-deleted leads', async () => {
        await seedLead({ email: 'student@example.com', isDeleted: true });

        expect(await listLeadsForEmail('student@example.com')).toEqual([]);
    });
});
