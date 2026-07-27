import { describe, expect, it } from 'vitest';
import nextConfig from '../../../next.config';

/**
 * The Content-Security-Policy is the one place where a missing host turns a
 * working feature into a silently blank box in production only — nothing fails
 * locally without HTTPS headers, and the browser reports it only to the console.
 * These assertions pin the hosts each media feature depends on.
 */
async function cspDirectives(): Promise<Map<string, string>> {
    const headers = await nextConfig.headers!();
    const policy = headers
        .flatMap((entry) => entry.headers)
        .find((header) => header.key === 'Content-Security-Policy')?.value;

    if (!policy) throw new Error('No Content-Security-Policy header is configured');

    return new Map(
        policy.split(';').map((part) => {
            const [name, ...values] = part.trim().split(/\s+/);
            return [name!, values.join(' ')];
        }),
    );
}

describe('Content-Security-Policy — gallery media', () => {
    it('allows the YouTube no-cookie player to be framed', async () => {
        expect((await cspDirectives()).get('frame-src')).toContain('https://www.youtube-nocookie.com');
    });

    it('allows the Vimeo player to be framed', async () => {
        expect((await cspDirectives()).get('frame-src')).toContain('https://player.vimeo.com');
    });

    it('still allows the plain youtube.com host used by legacy embeds', async () => {
        expect((await cspDirectives()).get('frame-src')).toContain('https://www.youtube.com');
    });

    it('allows YouTube and Vimeo poster frames as images', async () => {
        const imgSrc = (await cspDirectives()).get('img-src') ?? '';

        expect(imgSrc).toContain('https://i.ytimg.com');
        expect(imgSrc).toContain('https://i.vimeocdn.com');
    });

    it('allows uploaded images from the configured storage provider', async () => {
        const imgSrc = (await cspDirectives()).get('img-src') ?? '';

        expect(imgSrc).toContain("'self'");
        expect(imgSrc).toContain('https://res.cloudinary.com');
    });

    it('allows a native player to load a direct video file', async () => {
        expect((await cspDirectives()).get('media-src')).toBeDefined();
    });
});

describe('Content-Security-Policy — hardening is intact', () => {
    it('keeps object-src closed', async () => {
        expect((await cspDirectives()).get('object-src')).toBe("'none'");
    });

    it('does not let the site itself be framed', async () => {
        expect((await cspDirectives()).get('frame-ancestors')).toBe("'none'");
    });

    it('does not open frame-src to everything', async () => {
        const sources = ((await cspDirectives()).get('frame-src') ?? '').split(/\s+/);

        // A bare `https:` or `*` source would allow framing any origin. Each
        // entry must name a specific host (or be `'self'`).
        expect(sources).not.toContain('https:');
        expect(sources).not.toContain('*');
    });
});
