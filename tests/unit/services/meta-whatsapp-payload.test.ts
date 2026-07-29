import { describe, expect, it } from 'vitest';
import { buildMetaPayload } from '@/services/notification.service';

/**
 * Meta rejects free-form text for business-initiated conversations, so the payload
 * shape decides whether WhatsApp works in production at all.
 */
describe('buildMetaPayload', () => {
    const base = { to: '+91 98765 00001', body: 'Fallback copy' };

    it('sends an approved template when one is configured', () => {
        const payload = buildMetaPayload({
            ...base,
            providerTemplateName: 'lead_ack_v1',
            templateParams: ['Aarav', 'AS2607001'],
            templateLanguage: 'en_US',
        });

        expect(payload).toEqual({
            messaging_product: 'whatsapp',
            to: '919876500001',
            type: 'template',
            template: {
                name: 'lead_ack_v1',
                language: { code: 'en_US' },
                components: [
                    {
                        type: 'body',
                        parameters: [
                            { type: 'text', text: 'Aarav' },
                            { type: 'text', text: 'AS2607001' },
                        ],
                    },
                ],
            },
        });
    });

    it('defaults the language when the template does not name one', () => {
        const payload = buildMetaPayload({
            ...base,
            providerTemplateName: 'lead_ack_v1',
            templateParams: ['Aarav'],
        });

        expect((payload.template as { language: { code: string } }).language.code).toBe('en');
    });

    it('strips non-digits from the destination number', () => {
        expect(buildMetaPayload(base).to).toBe('919876500001');
    });

    it('falls back to plain text when no provider template name is set', () => {
        const payload = buildMetaPayload({ ...base, templateParams: ['Aarav'] });

        expect(payload.type).toBe('text');
        expect(payload.text).toEqual({ body: 'Fallback copy' });
    });

    it('falls back to plain text when a template name has no parameters', () => {
        const payload = buildMetaPayload({ ...base, providerTemplateName: 'lead_ack_v1' });

        expect(payload.type).toBe('text');
    });

    it('keeps positional order, since Meta placeholders are numbered not named', () => {
        const payload = buildMetaPayload({
            ...base,
            providerTemplateName: 'booking_v1',
            templateParams: ['first', 'second', 'third'],
        });

        const parameters = (payload.template as { components: { parameters: { text: string }[] }[] })
            .components[0]!.parameters;
        expect(parameters.map((p) => p.text)).toEqual(['first', 'second', 'third']);
    });
});
