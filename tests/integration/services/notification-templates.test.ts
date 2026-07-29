import { describe, expect, it, vi } from 'vitest';
import { EmailTemplate, Notification, WhatsAppTemplate } from '@/db/models/system.model';
import {
    processNotificationQueue,
    queueNotification,
    renderTemplate,
    unresolvedPlaceholders,
} from '@/services/notification.service';
import { logger } from '@/lib/logger';

/**
 * Admin-managed templates must actually reach the outbound message.
 *
 * The default adapters are the console stubs, so delivery is observed through the
 * `notification.console_send` log line — which carries the resolved subject, body
 * and the template key that produced them.
 */
function captureSend() {
    const sends: Record<string, unknown>[] = [];
    vi.spyOn(logger, 'info').mockImplementation((event: string, meta?: Record<string, unknown>) => {
        if (event === 'notification.console_send' && meta) sends.push(meta);
    });
    return sends;
}

async function seedEmailTemplate(overrides: Record<string, unknown> = {}) {
    return EmailTemplate.create({
        key: 'lead.acknowledgement',
        name: 'Lead acknowledgement',
        subject: 'Hello {{name}}, ref {{reference}}',
        bodyHtml: '<p>Hi {{name}}, {{counsellorName}} will call you.</p>',
        bodyText: 'Hi {{name}}, {{counsellorName}} will call you.',
        availableVariables: ['name', 'reference', 'counsellorName'],
        status: 'active',
        ...overrides,
    });
}

async function seedWhatsappTemplate(overrides: Record<string, unknown> = {}) {
    return WhatsAppTemplate.create({
        key: 'booking.confirmed',
        name: 'Booking confirmation',
        bodyText: 'Hi {{name}}, your session is on {{scheduledAt}}.',
        availableVariables: ['name', 'scheduledAt'],
        approvalStatus: 'approved',
        status: 'active',
        ...overrides,
    });
}

describe('renderTemplate', () => {
    it('substitutes placeholders, with or without inner spaces', () => {
        expect(renderTemplate('Hi {{name}} / {{ name }}', { name: 'Aarav' })).toBe('Hi Aarav / Aarav');
    });

    it('replaces an unknown placeholder with an empty string rather than leaving it raw', () => {
        expect(renderTemplate('Hi {{name}}{{missing}}', { name: 'Aarav' })).toBe('Hi Aarav');
    });
});

describe('email templates applied by the worker', () => {
    it('uses the admin template subject and body over the queued copy', async () => {
        await seedEmailTemplate();
        const sends = captureSend();

        await queueNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            to: 'aarav@example.com',
            title: 'Inline fallback subject',
            body: 'Inline fallback body',
            variables: { name: 'Aarav', reference: 'AS2607001', counsellorName: 'Neha' },
        });
        await processNotificationQueue(10);

        expect(sends).toHaveLength(1);
        expect(sends[0]?.subject).toBe('Hello Aarav, ref AS2607001');
        expect(sends[0]?.templateKey).toBe('lead.acknowledgement');
    });

    it('falls back to the queued copy when no template exists for the event', async () => {
        const sends = captureSend();

        await queueNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            to: 'aarav@example.com',
            title: 'Inline fallback subject',
            body: 'Inline fallback body',
            variables: { name: 'Aarav' },
        });
        await processNotificationQueue(10);

        expect(sends[0]?.subject).toBe('Inline fallback subject');
        expect(sends[0]?.templateKey).toBe('(inline fallback)');
    });

    it('ignores an inactive template, so unpublishing one restores the fallback', async () => {
        await seedEmailTemplate({ status: 'inactive' });
        const sends = captureSend();

        await queueNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            to: 'aarav@example.com',
            title: 'Inline fallback subject',
            body: 'Inline fallback body',
        });
        await processNotificationQueue(10);

        expect(sends[0]?.subject).toBe('Inline fallback subject');
    });

    it('keeps the queued subject when the template renders an empty one', async () => {
        await seedEmailTemplate({ subject: '{{missingVariable}}' });
        const sends = captureSend();

        await queueNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            to: 'aarav@example.com',
            title: 'Inline fallback subject',
            body: 'Inline fallback body',
        });
        await processNotificationQueue(10);

        expect(sends[0]?.subject).toBe('Inline fallback subject');
    });
});

describe('WhatsApp templates applied by the worker', () => {
    it('uses an approved template body', async () => {
        await seedWhatsappTemplate();
        const sends = captureSend();

        await queueNotification({
            event: 'booking.confirmed',
            channel: 'whatsapp',
            to: '9876500001',
            title: 'Session confirmed',
            body: 'Inline fallback body',
            variables: { name: 'Aarav', scheduledAt: '12 Aug, 4:00 pm' },
        });
        await processNotificationQueue(10);

        expect(sends[0]?.preview).toBe('Hi Aarav, your session is on 12 Aug, 4:00 pm.');
        expect(sends[0]?.templateKey).toBe('booking.confirmed');
    });

    it('refuses an unapproved template — the provider would reject it anyway', async () => {
        await seedWhatsappTemplate({ approvalStatus: 'draft' });
        const sends = captureSend();

        await queueNotification({
            event: 'booking.confirmed',
            channel: 'whatsapp',
            to: '9876500001',
            title: 'Session confirmed',
            body: 'Inline fallback body',
            variables: { name: 'Aarav', scheduledAt: '12 Aug, 4:00 pm' },
        });
        await processNotificationQueue(10);

        expect(sends[0]?.preview).toBe('Inline fallback body');
        expect(sends[0]?.templateKey).toBe('(inline fallback)');
    });
});

describe('queueNotification', () => {
    it('stores the template variables on the notification for the worker to use', async () => {
        await queueNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            to: 'aarav@example.com',
            title: 'Subject',
            body: 'Body',
            variables: { name: 'Aarav' },
        });

        const row = await Notification.findOne({ event: 'lead.acknowledgement' }).lean();
        expect((row?.payload as { variables?: Record<string, string> })?.variables).toEqual({
            name: 'Aarav',
        });
    });
});

describe('templates whose placeholders cannot be filled', () => {
    it('falls back rather than sending "Hi ," when no variables were supplied', async () => {
        await seedEmailTemplate({ bodyHtml: '<p>Hi {{name}}, ref {{reference}}.</p>', subject: 'Hello' });
        const sends = captureSend();

        await queueNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            to: 'aarav@example.com',
            title: 'Inline fallback subject',
            body: 'Inline fallback body',
            // no `variables` — the mistake this guard exists to catch
        });
        await processNotificationQueue(10);

        expect(sends[0]?.templateKey).toBe('(inline fallback)');
        expect(sends[0]?.subject).toBe('Inline fallback subject');
    });

    it('falls back when only some placeholders are supplied', async () => {
        await seedEmailTemplate({ bodyHtml: '<p>Hi {{name}}, ref {{reference}}.</p>', subject: 'Hello' });
        const sends = captureSend();

        await queueNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            to: 'aarav@example.com',
            title: 'Inline fallback subject',
            body: 'Inline fallback body',
            variables: { name: 'Aarav' },
        });
        await processNotificationQueue(10);

        expect(sends[0]?.templateKey).toBe('(inline fallback)');
    });

    it('uses a placeholder-free template even with no variables', async () => {
        await seedEmailTemplate({ subject: 'Welcome to Admission Sathi', bodyHtml: '<p>Your account is ready.</p>' });
        const sends = captureSend();

        await queueNotification({
            event: 'lead.acknowledgement',
            channel: 'email',
            to: 'aarav@example.com',
            title: 'Inline fallback subject',
            body: 'Inline fallback body',
        });
        await processNotificationQueue(10);

        expect(sends[0]?.subject).toBe('Welcome to Admission Sathi');
        expect(sends[0]?.templateKey).toBe('lead.acknowledgement');
    });

    it('applies the same rule to WhatsApp', async () => {
        await seedWhatsappTemplate({ bodyText: 'Hi {{name}}, on {{scheduledAt}}.' });
        const sends = captureSend();

        await queueNotification({
            event: 'booking.confirmed',
            channel: 'whatsapp',
            to: '9876500001',
            title: 'Session confirmed',
            body: 'Inline fallback body',
            variables: { name: 'Aarav' },
        });
        await processNotificationQueue(10);

        expect(sends[0]?.preview).toBe('Inline fallback body');
    });
});

describe('unresolvedPlaceholders', () => {
    it('lists each missing key once', () => {
        expect(unresolvedPlaceholders('{{a}} {{b}} {{a}}', { a: 'x' })).toEqual(['b']);
    });

    it('treats an empty-string value as missing', () => {
        expect(unresolvedPlaceholders('{{a}}', { a: '' })).toEqual(['a']);
    });

    it('returns nothing for a template without placeholders', () => {
        expect(unresolvedPlaceholders('Plain copy', {})).toEqual([]);
    });
});
