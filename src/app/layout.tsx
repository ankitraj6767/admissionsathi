import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';
import { siteConfig } from '@/config/site';
import { AnalyticsProvider } from '@/components/analytics/analytics-provider';
import { getSettings, readString } from '@/services/settings.service';
import { resolveBranding } from '@/lib/branding';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
    preload: true,
});

const manrope = Manrope({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-manrope',
    weight: ['600', '700', '800'],
});

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSettings();
    const branding = resolveBranding(settings);
    const description = readString(
        settings,
        'seo.defaultDescription',
        siteConfig.description,
    );

    return {
        metadataBase: new URL(siteConfig.url),
        title: {
            default: `${branding.name} — ${branding.tagline}`,
            template: `%s | ${branding.name}`,
        },
        description,
        applicationName: branding.name,
        keywords: [
            'college admission',
            'career counselling',
            'college predictor',
            'entrance exams',
            'education loan',
            'scholarships',
            'courses in India',
        ],
        authors: [{ name: branding.name }],
        icons: {
            icon: [{ url: branding.faviconUrl }],
            shortcut: [{ url: branding.faviconUrl }],
            apple: [{ url: branding.faviconUrl }],
        },
        openGraph: {
            type: 'website',
            locale: siteConfig.locale,
            url: siteConfig.url,
            siteName: branding.name,
            title: `${branding.name} — ${branding.tagline}`,
            description,
        },
        twitter: {
            card: 'summary_large_image',
            site: siteConfig.twitter,
        },
        robots: { index: true, follow: true },
        alternates: { canonical: '/' },
    };
}

export const viewport: Viewport = {
    themeColor: siteConfig.themeColor,
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en-IN" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
            <body className="min-h-dvh antialiased">
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
                >
                    Skip to main content
                </a>
                {children}
                <AnalyticsProvider />
            </body>
        </html>
    );
}
