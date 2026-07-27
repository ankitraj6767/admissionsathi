/**
 * The single allow-list for admin-authored rich text.
 *
 * Shared deliberately by the browser editor (paste cleanup) and the server
 * sanitiser (authoritative, runs on every write), so what an editor sees while
 * typing is what actually gets stored. This file must stay dependency-free and
 * free of `server-only` so the client bundle can import it.
 *
 * The tag list mirrors what `.prose-sathi` in `globals.css` actually styles —
 * allowing a tag the stylesheet does not cover would let an editor produce
 * content that renders unstyled on the public site.
 */

/** Block and inline tags an editor may produce. */
export const ALLOWED_TAGS = [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'a',
    'blockquote',
    'hr',
    'code',
    'pre',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
] as const;

/** Attributes permitted per tag. Everything else is stripped. */
export const ALLOWED_ATTRIBUTES: Record<string, readonly string[]> = {
    a: ['href', 'title', 'target', 'rel'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
};

/**
 * URL schemes a link may use.
 *
 * `javascript:` and `data:` are absent on purpose — they are the two schemes
 * that turn a link into script execution.
 */
export const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'] as const;

/**
 * Tags rewritten to their semantic equivalent.
 *
 * `contentEditable` and pasted Word/Google Docs markup emit presentational tags;
 * normalising them keeps stored content consistent regardless of how it was
 * authored, and keeps it styleable by one stylesheet.
 */
export const TAG_REPLACEMENTS: Record<string, string> = {
    b: 'strong',
    i: 'em',
    strike: 's',
    del: 's',
    div: 'p',
    h1: 'h2',
    h5: 'h4',
    h6: 'h4',
    span: '',
    font: '',
};

/**
 * Which allow-list a field uses.
 *
 * `web` is the default and matches `.prose-sathi`, so page content stays
 * consistently styled by the site stylesheet. `email` is looser because email
 * clients strip `<style>` blocks and classes — inline styles and layout tables
 * are the only way to style a message, so stripping them would break templates.
 */
export type HtmlPolicy = 'web' | 'email';

/** Extra tags and attributes permitted only in email templates. */
export const EMAIL_EXTRA_TAGS = ['img', 'div', 'span', 'center'] as const;

export const EMAIL_EXTRA_ATTRIBUTES: Record<string, readonly string[]> = {
    '*': ['style', 'align', 'valign', 'width', 'height', 'bgcolor'],
    img: ['src', 'alt', 'width', 'height'],
    table: ['cellpadding', 'cellspacing', 'border', 'role'],
};

export function isAllowedTag(tag: string): boolean {
    return (ALLOWED_TAGS as readonly string[]).includes(tag.toLowerCase());
}

export function allowedAttributesFor(tag: string): readonly string[] {
    return ALLOWED_ATTRIBUTES[tag.toLowerCase()] ?? [];
}

/**
 * True when a URL is safe to put in `href`.
 *
 * Control characters are stripped first because `java\0script:` and
 * `java\tscript:` are both parsed as `javascript:` by browsers.
 */
export function isSafeUrl(value: string): boolean {
    const cleaned = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();

    // Protocol-relative: `//evil.test` inherits the page scheme and resolves
    // off-site. Rejected before the "no scheme means relative" branch below.
    if (cleaned.startsWith('//')) return false;

    // Relative, root-relative and anchor links carry no scheme and are safe.
    if (/^[/#?]/.test(cleaned)) return true;

    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned)?.[1]?.toLowerCase();
    if (!scheme) return true;

    return (ALLOWED_SCHEMES as readonly string[]).includes(scheme);
}

/** True when the value contains no markup at all. */
export function isPlainText(html: string): boolean {
    return !/<[a-z!/]/i.test(html);
}

/**
 * True when rich text is empty for a human.
 *
 * An editor that has been focused and cleared leaves `<p><br></p>` behind, which
 * is not nothing to a validator but is nothing to a reader — treating it as
 * empty stops "required" checks passing on visually blank content.
 */
export function isBlankHtml(html?: string | null): boolean {
    if (!html) return true;
    const withoutTags = html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();
    return withoutTags.length === 0;
}
