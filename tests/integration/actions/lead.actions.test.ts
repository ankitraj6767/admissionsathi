import { describe, expect, it, vi } from 'vitest';

/** The public lead form is anonymous; only the actor lookup is stubbed. */
vi.mock('@/lib/auth/session', () => ({
    getCurrentActor: async () => null,
}));

// Server Actions run outside a request in tests, so the request-scoped Next.js
// primitives are stubbed. Everything below them (services, repositories, Mongo)
// is the real stack.
vi.mock('next/headers', () => ({
    headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.10', 'user-agent': 'vitest' }),
}));

vi.mock('next/cache', () => ({
    revalidatePath: () => undefined,
    revalidateTag: () => undefined,
    updateTag: () => undefined,
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { submitLeadAction, subscribeNewsletterAction } from '@/actions/lead.actions';
import { Lead, LeadActivity } from '@/db/models/lead.model';

let phoneCounter = 0;
let keyCounter = 0;

/** Each case uses its own phone/email so the in-memory rate limiter never bites. */
function uniquePhone(): string {
    phoneCounter += 1;
    return `98765${String(43000 + phoneCounter).padStart(5, '0')}`;
}

function leadInput(overrides: Record<string, unknown> = {}) {
    keyCounter += 1;
    return {
        name: 'Aman Verma',
        phone: uniquePhone(),
        email: `aman${keyCounter}@example.com`,
        consent: true,
        source: 'homepage_counselling_form',
        idempotencyKey: `form-token-${String(keyCounter).padStart(8, '0')}`,
        ...overrides,
    };
}

describe('submitLeadAction', () => {
    it('creates a real lead row from valid input', async () => {
        const input = leadInput();

        const result = await submitLeadAction(input);

        expect(result.ok).toBe(true);
        const lead = await Lead.findOne({}).lean();
        expect(lead?.name).toBe('Aman Verma');
        expect(lead?.phoneNormalized).toBe(input.phone);
        expect(lead?.status).toBe('new');
        expect(lead?.consent.given).toBe(true);
        expect(result.ok && result.data.reference).toBe(lead?.reference);
    });

    it('records a created activity on the lead timeline', async () => {
        await submitLeadAction(leadInput());

        const activities = await LeadActivity.find({}).lean();
        expect(activities.map((activity) => activity.type)).toEqual(['created']);
    });

    it('rejects invalid input with field errors and writes nothing', async () => {
        const result = await submitLeadAction({
            name: 'A',
            phone: '123',
            consent: false,
            idempotencyKey: 'short',
        });

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.code).toBe('VALIDATION');
        expect(result.ok === false && Object.keys(result.fieldErrors ?? {}).sort()).toEqual([
            'consent',
            'idempotencyKey',
            'name',
            'phone',
        ]);
        expect(await Lead.countDocuments({})).toBe(0);
    });

    it('rejects a payload with no recognisable shape and writes nothing', async () => {
        const result = await submitLeadAction('not-an-object');

        expect(result.ok === false && result.code).toBe('VALIDATION');
        expect(await Lead.countDocuments({})).toBe(0);
    });

    it('is idempotent: the same key twice produces one row', async () => {
        const input = leadInput();

        const first = await submitLeadAction(input);
        const second = await submitLeadAction(input);

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
        expect(await Lead.countDocuments({})).toBe(1);
        expect(first.ok && second.ok && first.data.reference).toBe(second.ok && second.data.reference);
    });

    it('flags a second submission from the same number as a duplicate', async () => {
        const phone = uniquePhone();
        await submitLeadAction(leadInput({ phone }));
        await submitLeadAction(leadInput({ phone }));

        const leads = await Lead.find({}).sort({ createdAt: 1 }).lean();
        expect(leads).toHaveLength(2);
        expect(leads[1]?.isDuplicate).toBe(true);
        expect(String(leads[1]?.duplicateOf)).toBe(String(leads[0]?._id));
    });

    it('answers a filled honeypot with a fake success and writes no lead', async () => {
        const result = await submitLeadAction({ ...leadInput(), website: 'http://spam.example' });

        // A bot must not be able to tell the honeypot exists, so the response
        // looks like every other success — but nothing is persisted.
        expect(result.ok).toBe(true);
        expect(result.ok && result.data.reference).toBe('AS000000');
        expect(await Lead.countDocuments({})).toBe(0);
    });

    it('still accepts a submission that leaves the honeypot empty', async () => {
        const result = await submitLeadAction({ ...leadInput(), website: '' });

        expect(result.ok).toBe(true);
        expect(await Lead.countDocuments({})).toBe(1);
    });

    it('refuses a form submitted faster than a human could', async () => {
        const result = await submitLeadAction({ ...leadInput(), elapsedMs: 200 });

        expect(result.ok === false && result.code).toBe('VALIDATION');
        expect(await Lead.countDocuments({})).toBe(0);
    });

    it('rate limits repeated submissions from the same number', async () => {
        const phone = uniquePhone();
        const results = [];
        for (let attempt = 0; attempt < 6; attempt += 1) {
            results.push(await submitLeadAction(leadInput({ phone })));
        }

        expect(results[5]?.ok).toBe(false);
        expect(results[5]?.ok === false && results[5]?.code).toBe('RATE_LIMITED');
        expect(await Lead.countDocuments({})).toBe(5);
    });
});

describe('subscribeNewsletterAction', () => {
    it('creates a newsletter lead for a new email', async () => {
        const result = await subscribeNewsletterAction({ email: 'reader1@example.com' });

        expect(result.ok).toBe(true);
        const lead = await Lead.findOne({}).lean();
        expect(lead?.source).toBe('newsletter');
        expect(lead?.email).toBe('reader1@example.com');
        expect(lead?.priority).toBe('low');
    });

    it('is idempotent per email', async () => {
        await subscribeNewsletterAction({ email: 'reader2@example.com' });
        const second = await subscribeNewsletterAction({ email: 'reader2@example.com' });

        expect(second.ok).toBe(true);
        expect(second.ok && second.message).toBe('You are already subscribed.');
        expect(await Lead.countDocuments({})).toBe(1);
    });

    it('treats a differently cased email as the same subscriber', async () => {
        await subscribeNewsletterAction({ email: 'reader3@example.com' });
        await subscribeNewsletterAction({ email: 'Reader3@Example.com' });

        expect(await Lead.countDocuments({})).toBe(1);
    });

    it('rejects an invalid email and writes nothing', async () => {
        const result = await subscribeNewsletterAction({ email: 'not-an-email' });

        expect(result.ok === false && result.code).toBe('VALIDATION');
        expect(await Lead.countDocuments({})).toBe(0);
    });
});
