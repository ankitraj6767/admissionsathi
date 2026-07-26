import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/settings.service', () => ({
    getSettings: vi.fn().mockResolvedValue({
        'site.name': 'Campus Guide',
        'site.tagline': 'Find your next step',
        'site.logoUrl': 'https://res.cloudinary.com/demo/image/upload/logo.png',
        'site.faviconUrl': 'https://res.cloudinary.com/demo/image/upload/icon.png',
        'seo.defaultDescription': 'Dynamic site description',
    }),
    readString: (
        settings: Record<string, unknown>,
        key: string,
        fallback: string,
    ) => (typeof settings[key] === 'string' ? settings[key] : fallback),
}));

import manifest from '@/app/manifest';

describe('dynamic web manifest', () => {
    it('uses the saved branding values and icons', async () => {
        const result = await manifest();

        expect(result).toMatchObject({
            name: 'Campus Guide — Find your next step',
            short_name: 'Campus Guide',
            description: 'Dynamic site description',
            icons: [
                {
                    src: 'https://res.cloudinary.com/demo/image/upload/logo.png',
                    sizes: 'any',
                    purpose: 'any',
                },
                {
                    src: 'https://res.cloudinary.com/demo/image/upload/icon.png',
                    sizes: 'any',
                    purpose: 'maskable',
                },
            ],
        });
    });
});
