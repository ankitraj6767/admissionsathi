import { describe, expect, it } from 'vitest';
import {
    isSupportedVideoUrl,
    parseVideoUrl,
    toEmbedUrl,
    videoProviderLabel,
} from '@/lib/media/video';

describe('parseVideoUrl — YouTube', () => {
    const id = 'dQw4w9WgXcQ';

    it.each([
        `https://www.youtube.com/watch?v=${id}`,
        `https://youtube.com/watch?v=${id}`,
        `https://m.youtube.com/watch?v=${id}`,
        `https://youtu.be/${id}`,
        `https://www.youtube.com/embed/${id}`,
        `https://www.youtube.com/shorts/${id}`,
        `https://www.youtube.com/live/${id}`,
        `https://www.youtube.com/v/${id}`,
    ])('recognises %s', (url) => {
        expect(parseVideoUrl(url)).toMatchObject({ provider: 'youtube', videoId: id });
    });

    it('keeps extra query parameters out of the embed URL', () => {
        const parsed = parseVideoUrl(`https://www.youtube.com/watch?v=${id}&t=42s&list=PLabc`);

        expect(parsed?.embedUrl).toBe(`https://www.youtube-nocookie.com/embed/${id}`);
    });

    it('uses the no-cookie host so no tracking cookie is set before playback', () => {
        expect(parseVideoUrl(`https://youtu.be/${id}`)?.embedUrl).toContain('youtube-nocookie.com');
    });

    it('derives a poster frame', () => {
        expect(parseVideoUrl(`https://youtu.be/${id}`)?.thumbnailUrl).toBe(
            `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        );
    });

    it('rejects an id that is not 11 characters', () => {
        expect(parseVideoUrl('https://www.youtube.com/watch?v=tooshort')).toBeNull();
    });

    it('rejects a YouTube URL with no id at all', () => {
        expect(parseVideoUrl('https://www.youtube.com/feed/subscriptions')).toBeNull();
    });
});

describe('parseVideoUrl — Vimeo', () => {
    it.each([
        'https://vimeo.com/123456789',
        'https://www.vimeo.com/123456789',
        'https://player.vimeo.com/video/123456789',
    ])('recognises %s', (url) => {
        expect(parseVideoUrl(url)).toMatchObject({ provider: 'vimeo', videoId: '123456789' });
    });

    it('builds the player embed URL', () => {
        expect(parseVideoUrl('https://vimeo.com/123456789')?.embedUrl).toBe(
            'https://player.vimeo.com/video/123456789',
        );
    });

    it('has no thumbnail, because Vimeo exposes none by convention', () => {
        expect(parseVideoUrl('https://vimeo.com/123456789')?.thumbnailUrl).toBeUndefined();
    });
});

describe('parseVideoUrl — direct files', () => {
    it.each(['mp4', 'webm', 'ogg', 'mov', 'm4v'])('recognises a .%s URL', (extension) => {
        const url = `https://cdn.example.org/tour.${extension}`;
        expect(parseVideoUrl(url)).toMatchObject({ provider: 'file', embedUrl: url });
    });

    it('is case-insensitive about the extension', () => {
        expect(parseVideoUrl('https://cdn.example.org/Tour.MP4')?.provider).toBe('file');
    });
});

describe('parseVideoUrl — rejections', () => {
    it('rejects empty and whitespace input', () => {
        expect(parseVideoUrl('')).toBeNull();
        expect(parseVideoUrl('   ')).toBeNull();
    });

    it('rejects a non-URL', () => {
        expect(parseVideoUrl('not a url')).toBeNull();
    });

    /**
     * The parsed `embedUrl` is written straight into an `iframe src`, so a
     * script-bearing scheme must never survive parsing.
     */
    it.each([
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
    ])('rejects the %s scheme', (url) => {
        expect(parseVideoUrl(url)).toBeNull();
    });

    it('rejects an unknown video host', () => {
        expect(parseVideoUrl('https://evil.test/watch?v=dQw4w9WgXcQ')).toBeNull();
    });

    it('does not treat a lookalike host as YouTube', () => {
        expect(parseVideoUrl('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ')).toBeNull();
    });
});

describe('isSupportedVideoUrl', () => {
    it('mirrors parseVideoUrl', () => {
        expect(isSupportedVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
        expect(isSupportedVideoUrl('https://evil.test/x')).toBe(false);
    });
});

describe('toEmbedUrl', () => {
    it('normalises a watch URL', () => {
        expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
            'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        );
    });

    it('is idempotent for an already-embedded URL', () => {
        const embed = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
        expect(toEmbedUrl(toEmbedUrl(embed))).toBe(embed);
    });

    /**
     * Legacy `College.videoUrl` values were stored as raw provider embed URLs, so
     * an unrecognised-but-https URL passes through rather than breaking on save.
     */
    it('passes an unrecognised https URL through unchanged', () => {
        expect(toEmbedUrl('https://example.org/embed/custom-player')).toBe(
            'https://example.org/embed/custom-player',
        );
    });

    it('refuses a non-https unrecognised URL', () => {
        expect(toEmbedUrl('http://example.org/embed/x')).toBeNull();
        expect(toEmbedUrl('javascript:alert(1)')).toBeNull();
    });

    it('returns null for empty input', () => {
        expect(toEmbedUrl('')).toBeNull();
        expect(toEmbedUrl(null)).toBeNull();
        expect(toEmbedUrl(undefined)).toBeNull();
    });
});

describe('videoProviderLabel', () => {
    it('gives a human label', () => {
        expect(videoProviderLabel('youtube')).toBe('YouTube');
        expect(videoProviderLabel('vimeo')).toBe('Vimeo');
        expect(videoProviderLabel('file')).toBe('Video file');
    });
});
