/**
 * Safety and presentation helpers for admin-authored URLs.
 *
 * Editors type these into the console (college website, brochure, apply link,
 * official exam site), and they end up in an `href`. An unchecked `href` is a
 * script-execution sink via `javascript:` and a tabnabbing risk when it opens in
 * a new tab, so every such link is funnelled through here.
 *
 * Dependency-free and free of `server-only` so the admin field can validate a
 * pasted URL in the browser with exactly the rules the server enforces on write.
 */

/** Schemes a link may use. `javascript:` and `data:` are absent on purpose. */
export const LINK_SCHEMES = ['http', 'https', 'mailto', 'tel'] as const;

/** Schemes allowed for a field that must point at a real web page. */
export const WEB_SCHEMES = ['http', 'https'] as const;

/**
 * Strips characters browsers ignore when resolving a scheme.
 * `java\tscript:` and `java\0script:` are both read as `javascript:`.
 */
function normalise(value: string): string {
    return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
}

function schemeOf(value: string): string | undefined {
    return /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1]?.toLowerCase();
}

/**
 * Returns a safe `href`, or `null` when the value must not be linked.
 *
 * Returning `null` rather than a sanitised string is deliberate: the caller then
 * has to decide between rendering plain text and rendering nothing, instead of
 * silently emitting a link to somewhere unintended.
 */
export function safeHref(value?: string | null): string | null {
    if (!value) return null;

    const cleaned = normalise(value);
    if (!cleaned) return null;

    // Protocol-relative inherits the page scheme and resolves off-site.
    if (cleaned.startsWith('//')) return null;

    // Relative and anchor links are in-app and carry no scheme.
    if (/^[/#?]/.test(cleaned)) return cleaned;

    const scheme = schemeOf(cleaned);

    if (!scheme) {
        /*
         * A bare "example.org" is what an editor most often types into a website
         * field. Treated as https rather than rejected, because rejecting it would
         * mean the value is stored and then silently never linked.
         */
        return /^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(cleaned) ? `https://${cleaned}` : null;
    }

    return (LINK_SCHEMES as readonly string[]).includes(scheme) ? cleaned : null;
}

/**
 * Same as `safeHref` but restricted to real web pages — no `mailto:`/`tel:` and
 * no relative paths. Used to validate admin `url` fields on write.
 */
export function safeWebUrl(value?: string | null): string | null {
    const href = safeHref(value);
    if (!href) return null;

    const scheme = schemeOf(href);
    return scheme && (WEB_SCHEMES as readonly string[]).includes(scheme) ? href : null;
}

/** True when following the link leaves the site. */
export function isExternalHref(href: string): boolean {
    return /^https?:\/\//i.test(href);
}

/**
 * Host without `www.`, for showing an editor (and a visitor) where a link goes.
 * Falls back to the raw value so a display string is always available.
 */
export function displayHost(value?: string | null): string {
    const href = safeHref(value);
    if (!href) return '';

    try {
        return new URL(href).hostname.replace(/^www\./i, '');
    } catch {
        return href;
    }
}
