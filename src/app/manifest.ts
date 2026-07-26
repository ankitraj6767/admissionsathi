import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/** PWA manifest. Keeps the installed app on the brand navy/orange palette. */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: `${siteConfig.name} — ${siteConfig.tagline}`,
        short_name: siteConfig.shortName,
        description: siteConfig.description,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#F5F8FD',
        theme_color: siteConfig.themeColor,
        lang: 'en-IN',
        categories: ['education', 'productivity'],
        icons: [
            { src: '/brand/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
        shortcuts: [
            { name: 'Find Colleges', url: '/colleges' },
            { name: 'College Predictor', url: '/predictors' },
            { name: 'Book Free Counselling', url: '/book-counselling' },
        ],
    };
}
