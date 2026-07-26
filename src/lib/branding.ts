import { siteConfig } from '@/config/site';

export interface BrandingConfig {
    name: string;
    tagline: string;
    logoUrl: string;
    logoDarkUrl: string;
    faviconUrl: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
    name: siteConfig.name,
    tagline: siteConfig.tagline,
    logoUrl: '/brand/logo.svg',
    logoDarkUrl: '/brand/logo-light.svg',
    faviconUrl: '/icon.svg',
};

function readText(
    settings: Record<string, unknown>,
    key: string,
    fallback: string,
): string {
    const value = settings[key];
    return typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : fallback;
}

/**
 * Branding assets may be local public files or HTTPS media-library URLs.
 * Unsupported schemes are discarded so editable metadata can never emit
 * javascript:, data: or protocol-relative URLs.
 */
export function resolveBrandAssetUrl(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;

    const candidate = value.trim();
    if (!candidate) return fallback;
    if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;

    try {
        const url = new URL(candidate);
        return url.protocol === 'https:' ? url.toString() : fallback;
    } catch {
        return fallback;
    }
}

/** Resolves the single branding model consumed by UI, metadata and manifests. */
export function resolveBranding(
    settings: Record<string, unknown> = {},
): BrandingConfig {
    const faviconUrl = resolveBrandAssetUrl(
        settings['site.faviconUrl'],
        DEFAULT_BRANDING.faviconUrl,
    );

    return {
        name: readText(settings, 'site.name', DEFAULT_BRANDING.name),
        tagline: readText(settings, 'site.tagline', DEFAULT_BRANDING.tagline),
        logoUrl: resolveBrandAssetUrl(
            settings['site.logoUrl'],
            DEFAULT_BRANDING.logoUrl,
        ),
        logoDarkUrl: resolveBrandAssetUrl(
            settings['site.logoDarkUrl'],
            DEFAULT_BRANDING.logoDarkUrl,
        ),
        // Older seeds used /favicon.ico even though that file was never
        // shipped. Transparently repair that legacy value for existing sites.
        faviconUrl:
            faviconUrl === '/favicon.ico'
                ? DEFAULT_BRANDING.faviconUrl
                : faviconUrl,
    };
}
