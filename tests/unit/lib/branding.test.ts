import { describe, expect, it } from 'vitest';
import {
    DEFAULT_BRANDING,
    resolveBrandAssetUrl,
    resolveBranding,
} from '@/lib/branding';

describe('dynamic branding', () => {
    it('resolves saved branding values for every consumer', () => {
        expect(
            resolveBranding({
                'site.name': 'Campus Guide',
                'site.tagline': 'Find your next step',
                'site.logoUrl': 'https://res.cloudinary.com/demo/image/upload/logo.png',
                'site.logoDarkUrl': '/uploads/logo-dark.svg',
                'site.faviconUrl': 'https://res.cloudinary.com/demo/image/upload/icon.png',
            }),
        ).toEqual({
            name: 'Campus Guide',
            tagline: 'Find your next step',
            logoUrl: 'https://res.cloudinary.com/demo/image/upload/logo.png',
            logoDarkUrl: '/uploads/logo-dark.svg',
            faviconUrl: 'https://res.cloudinary.com/demo/image/upload/icon.png',
        });
    });

    it('keeps safe defaults for blank, malformed and unsafe asset values', () => {
        expect(
            resolveBranding({
                'site.name': '   ',
                'site.logoUrl': 'javascript:alert(1)',
                'site.logoDarkUrl': '//untrusted.example/logo.svg',
                'site.faviconUrl': '/favicon.ico',
            }),
        ).toEqual(DEFAULT_BRANDING);

        expect(resolveBrandAssetUrl('http://example.com/logo.svg', '/safe.svg')).toBe(
            '/safe.svg',
        );
        expect(resolveBrandAssetUrl('/local/logo.svg', '/safe.svg')).toBe(
            '/local/logo.svg',
        );
    });
});
