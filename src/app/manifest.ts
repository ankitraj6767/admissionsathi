import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { getSettings, readString } from '@/services/settings.service';
import { resolveBranding } from '@/lib/branding';

export const dynamic = 'force-dynamic';

/** Dynamic PWA manifest backed by the same branding settings as the website. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const settings = await getSettings();
    const branding = resolveBranding(settings);

    return {
        name: `${branding.name} — ${branding.tagline}`,
        short_name: branding.name,
        description: readString(
            settings,
            'seo.defaultDescription',
            siteConfig.description,
        ),
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#F5F8FD',
        theme_color: siteConfig.themeColor,
        lang: 'en-IN',
        categories: ['education', 'productivity'],
        icons: [
            { src: branding.logoUrl, sizes: 'any', purpose: 'any' },
            { src: branding.faviconUrl, sizes: 'any', purpose: 'maskable' },
        ],
        shortcuts: [
            { name: 'Find Colleges', url: '/colleges' },
            { name: 'College Predictor', url: '/predictors' },
            { name: 'Book Free Counselling', url: '/book-counselling' },
        ],
    };
}
