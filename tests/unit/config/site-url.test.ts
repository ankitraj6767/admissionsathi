import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveSiteUrl } from '@/config/site';
import { absoluteUrl } from '@/lib/utils';

/**
 * Guards the canonical-origin resolution.
 *
 * If this falls back to localhost on a real deployment, every canonical tag, OG
 * card, JSON-LD block and sitemap entry publishes an unreachable URL — which is
 * silent and expensive to discover later.
 */
const KEYS = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL',
    'VERCEL_PROJECT_PRODUCTION_URL',
    'NEXT_PUBLIC_VERCEL_URL',
    'VERCEL_URL',
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
    for (const key of KEYS) delete process.env[key];
});

afterEach(() => {
    for (const key of KEYS) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
    }
});

describe('resolveSiteUrl', () => {
    it('prefers NEXT_PUBLIC_SITE_URL', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'https://admissionsathi.org';
        expect(resolveSiteUrl()).toBe('https://admissionsathi.org');
    });

    it('strips a trailing slash', () => {
        process.env.NEXT_PUBLIC_SITE_URL = 'https://admissionsathi.org/';
        expect(resolveSiteUrl()).toBe('https://admissionsathi.org');
    });

    it('falls back to the Vercel production domain, adding https', () => {
        process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL = 'admissionsathi.vercel.app';
        expect(resolveSiteUrl()).toBe('https://admissionsathi.vercel.app');
    });

    it('prefers the production domain over the per-deployment domain', () => {
        process.env.VERCEL_PROJECT_PRODUCTION_URL = 'admissionsathi.vercel.app';
        process.env.VERCEL_URL = 'admissionsathi-git-abc123.vercel.app';
        expect(resolveSiteUrl()).toBe('https://admissionsathi.vercel.app');
    });

    it('uses the per-deployment domain when nothing else is set', () => {
        process.env.VERCEL_URL = 'admissionsathi-git-abc123.vercel.app';
        expect(resolveSiteUrl()).toBe('https://admissionsathi-git-abc123.vercel.app');
    });

    it('does not double up the protocol if the host already carries one', () => {
        process.env.VERCEL_URL = 'https://admissionsathi.vercel.app';
        expect(resolveSiteUrl()).toBe('https://admissionsathi.vercel.app');
    });

    it('ignores blank values', () => {
        process.env.NEXT_PUBLIC_SITE_URL = '   ';
        process.env.VERCEL_URL = 'admissionsathi.vercel.app';
        expect(resolveSiteUrl()).toBe('https://admissionsathi.vercel.app');
    });

    it('falls back to localhost only when no host is available', () => {
        expect(resolveSiteUrl()).toBe('http://localhost:3000');
    });
});

describe('absoluteUrl', () => {
    it('shares the resolver, so a Vercel host reaches the sitemap URLs', () => {
        process.env.VERCEL_PROJECT_PRODUCTION_URL = 'admissionsathi.vercel.app';
        expect(absoluteUrl('/sitemaps/colleges.xml')).toBe(
            'https://admissionsathi.vercel.app/sitemaps/colleges.xml',
        );
    });
});
