/**
 * Resolves the canonical origin.
 *
 * `NEXT_PUBLIC_SITE_URL` is authoritative and should always be set in
 * production. The Vercel fallbacks exist so a deployment that forgot it still
 * emits real absolute URLs instead of silently publishing `http://localhost:3000`
 * in every canonical tag, OG card, JSON-LD block and sitemap entry.
 *
 * Vercel injects `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` (the stable
 * production domain) and `NEXT_PUBLIC_VERCEL_URL` (the per-deployment domain)
 * for Next.js projects, neither of which includes a protocol.
 */
export function resolveSiteUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, '');

    const host =
        process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
        process.env.NEXT_PUBLIC_VERCEL_URL?.trim() ||
        process.env.VERCEL_URL?.trim();

    if (host) return `https://${host.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

    return 'http://localhost:3000';
}

/**
 * Public, non-secret site constants.
 * Safe for both Server and Client Components.
 * Editable operational values (phones, emails, banners) live in the SiteSetting collection.
 */
export const siteConfig = {
    name: 'Admission Sathi',
    shortName: 'AdmissionSathi',
    tagline: 'Your Career, Our Mission',
    description:
        'Admission Sathi helps students discover courses and colleges, predict admission chances, prepare for entrance exams, compare education loans and book free expert counselling.',
    url: resolveSiteUrl(),
    locale: 'en_IN',
    themeColor: '#073174',
    twitter: '@admissionsathi',
    defaults: {
        supportPhone: '+91 91555 55555',
        supportEmail: 'info@admissionsathi.org',
        utilityMessage: "India's Most Trusted Admission & Career Guidance Platform",
        androidUrl: 'https://play.google.com',
        iosUrl: 'https://www.apple.com/app-store/',
        whatsappCommunityUrl: 'https://chat.whatsapp.com/',
    },
    pagination: {
        listing: 12,
        admin: 20,
        maxLimit: 100,
    },
    compare: {
        maxColleges: 4,
    },
} as const;

export type SiteConfig = typeof siteConfig;
