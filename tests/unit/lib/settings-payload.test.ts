import { describe, expect, it } from 'vitest';
import { readSubmittedSettingValue } from '@/lib/settings-payload';

describe('readSubmittedSettingValue', () => {
    it('reads the canonical flat settings payload', () => {
        expect(
            readSubmittedSettingValue(
                { 'contact.phone': '+91 90000 00000' },
                'contact.phone',
            ),
        ).toEqual({ found: true, value: '+91 90000 00000' });
    });

    it('prefers an edited nested value from the legacy dotted-name form', () => {
        expect(
            readSubmittedSettingValue(
                {
                    'contact.phone': '+91 91555 55555',
                    contact: { phone: '+91 90000 00000' },
                },
                'contact.phone',
            ),
        ).toEqual({ found: true, value: '+91 90000 00000' });
    });

    it('distinguishes a submitted false value from a missing setting', () => {
        expect(
            readSubmittedSettingValue(
                { features: { newsletterEnabled: false } },
                'features.newsletterEnabled',
            ),
        ).toEqual({ found: true, value: false });
        expect(readSubmittedSettingValue({}, 'features.newsletterEnabled')).toEqual({ found: false });
    });
});
