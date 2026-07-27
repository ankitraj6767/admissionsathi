/**
 * Video URL parsing, shared by the admin editor and the public gallery.
 *
 * Videos are referenced by URL rather than uploaded. That is deliberate: video
 * files are far too large for the 5 MB image ceiling in `lib/storage`, and
 * serving them from our own storage would mean no adaptive bitrate, no poster
 * frames and a large egress bill. YouTube and Vimeo already solve all three, and
 * they hand us a thumbnail for free.
 *
 * Dependency-free and free of `server-only` so the admin editor can validate a
 * pasted URL in the browser using exactly the rules the server will apply.
 */

export type VideoProvider = 'youtube' | 'vimeo' | 'file';

export interface ParsedVideo {
    provider: VideoProvider;
    /** Provider-side id. Absent for a direct file. */
    videoId?: string;
    /** URL to put in an `<iframe src>` (youtube/vimeo) or `<video src>` (file). */
    embedUrl: string;
    /** Poster frame, when the provider exposes one by convention. */
    thumbnailUrl?: string;
    /** The URL the editor originally supplied, preserved for round-tripping. */
    sourceUrl: string;
}

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'];
const VIMEO_HOSTS = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'];

const VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg|mov|m4v)$/i;

/** YouTube ids are exactly 11 URL-safe characters. */
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function youtubeIdFrom(url: URL): string | undefined {
    // youtu.be/<id>
    if (url.hostname.endsWith('youtu.be')) {
        const candidate = url.pathname.slice(1).split('/')[0];
        return candidate && YOUTUBE_ID_PATTERN.test(candidate) ? candidate : undefined;
    }

    // /watch?v=<id>
    const queryId = url.searchParams.get('v');
    if (queryId && YOUTUBE_ID_PATTERN.test(queryId)) return queryId;

    // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
    const match = /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/.exec(url.pathname);
    return match?.[1];
}

function vimeoIdFrom(url: URL): string | undefined {
    // vimeo.com/<id> and player.vimeo.com/video/<id>
    const match = /\/(?:video\/)?(\d{6,12})/.exec(url.pathname);
    return match?.[1];
}

/**
 * Normalises a pasted video URL into something embeddable.
 *
 * Returns `null` for anything unrecognised rather than guessing, so an editor
 * gets told the URL is unsupported instead of the public page rendering a broken
 * iframe. Only `http(s)` is accepted — a `javascript:` URL must never reach an
 * `iframe src`.
 */
export function parseVideoUrl(input: string): ParsedVideo | null {
    const trimmed = input?.trim();
    if (!trimmed) return null;

    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return null;
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const host = url.hostname.toLowerCase();

    if (YOUTUBE_HOSTS.includes(host)) {
        const videoId = youtubeIdFrom(url);
        if (!videoId) return null;
        return {
            provider: 'youtube',
            videoId,
            // `youtube-nocookie` avoids setting tracking cookies until playback.
            embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
            thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            sourceUrl: trimmed,
        };
    }

    if (VIMEO_HOSTS.includes(host)) {
        const videoId = vimeoIdFrom(url);
        if (!videoId) return null;
        return {
            provider: 'vimeo',
            videoId,
            embedUrl: `https://player.vimeo.com/video/${videoId}`,
            sourceUrl: trimmed,
        };
    }

    if (VIDEO_FILE_PATTERN.test(url.pathname)) {
        return { provider: 'file', embedUrl: trimmed, sourceUrl: trimmed };
    }

    return null;
}

export function isSupportedVideoUrl(input: string): boolean {
    return parseVideoUrl(input) !== null;
}

/**
 * Accepts either a bare embed URL already stored on a record or a watch URL.
 *
 * Legacy `College.videoUrl` values were stored as raw embed URLs, so re-parsing
 * has to be tolerant: if the value is not recognisable as a provider URL but is
 * a plain https URL, it is passed through as a file/iframe source unchanged.
 */
export function toEmbedUrl(input?: string | null): string | null {
    if (!input) return null;

    const parsed = parseVideoUrl(input);
    if (parsed) return parsed.embedUrl;

    try {
        const url = new URL(input.trim());
        return url.protocol === 'https:' ? url.toString() : null;
    } catch {
        return null;
    }
}

/** Human label for the admin UI. */
export function videoProviderLabel(provider: VideoProvider): string {
    if (provider === 'youtube') return 'YouTube';
    if (provider === 'vimeo') return 'Vimeo';
    return 'Video file';
}
