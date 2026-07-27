import 'server-only';
import sanitizeHtml from 'sanitize-html';
import {
    ALLOWED_ATTRIBUTES,
    ALLOWED_SCHEMES,
    ALLOWED_TAGS,
    EMAIL_EXTRA_ATTRIBUTES,
    EMAIL_EXTRA_TAGS,
    TAG_REPLACEMENTS,
    isBlankHtml,
    type HtmlPolicy,
} from './policy';

/**
 * Authoritative HTML sanitiser. Runs on every write of admin-authored rich text.
 *
 * The browser editor also cleans content as it is typed and pasted, but that is a
 * convenience only — anything arriving at a Server Action is untrusted, including
 * a hand-crafted request that never went near the editor. This is the layer that
 * actually prevents stored XSS, which is why it lives behind `server-only` and is
 * applied inside the Zod schema rather than in the UI.
 */

/**
 * Tags whose *content* is discarded, not just unwrapped.
 * `textarea` and `option` are part of the library default and are kept here
 * because overriding `nonTextTags` replaces that default rather than extending it.
 */
const DISCARDED_TAGS = [
    'script',
    'style',
    'textarea',
    'option',
    'iframe',
    'object',
    'embed',
    'form',
    'input',
    'noscript',
];

/**
 * Rewrites `<a>` so an editor cannot create a link that reaches back into the
 * app or lends it ranking signal: `noopener` severs `window.opener`, and
 * `nofollow` stops arbitrary third parties inheriting authority. Internal links
 * keep their default behaviour so in-app navigation is not forced into a new tab.
 */
function transformAnchor(tagName: string, attribs: Record<string, string>) {
    const href = attribs.href ?? '';
    const isExternal = /^https?:\/\//i.test(href);

    if (!isExternal) {
        const { target: _target, rel: _rel, ...internal } = attribs;
        return { tagName, attribs: internal };
    }

    return {
        tagName,
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' },
    };
}

/**
 * `div`/`span` are unwrapped for web content but kept for email, where they are
 * the only available layout primitives.
 */
function replacementsFor(policy: HtmlPolicy): Record<string, string> {
    const entries = Object.entries(TAG_REPLACEMENTS).filter(
        ([from, replacement]) =>
            replacement !== '' && !(policy === 'email' && (from === 'div' || from === 'span')),
    );
    return Object.fromEntries(entries);
}

function optionsFor(policy: HtmlPolicy): sanitizeHtml.IOptions {
    const isEmail = policy === 'email';

    return {
        allowedTags: [...ALLOWED_TAGS, ...(isEmail ? EMAIL_EXTRA_TAGS : [])],
        allowedAttributes: {
            ...Object.fromEntries(
                Object.entries(ALLOWED_ATTRIBUTES).map(([tag, attrs]) => [tag, [...attrs]]),
            ),
            ...(isEmail
                ? Object.fromEntries(
                    Object.entries(EMAIL_EXTRA_ATTRIBUTES).map(([tag, attrs]) => [
                        tag,
                        [...attrs, ...(ALLOWED_ATTRIBUTES[tag] ?? [])],
                    ]),
                )
                : {}),
        },
        allowedSchemes: [...ALLOWED_SCHEMES],
        // `//evil.com` would otherwise inherit the page's scheme and resolve.
        allowProtocolRelative: false,
        nonTextTags: DISCARDED_TAGS,
        // Even with `style` allowed, only these declarations survive — `style` is
        // otherwise a vector via `expression()` and `url(javascript:…)`.
        allowedStyles: isEmail
            ? {
                '*': {
                    color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i, /^[a-z-]+$/i],
                    'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i, /^[a-z-]+$/i],
                    'text-align': [/^(left|right|center|justify)$/],
                    'font-size': [/^\d+(\.\d+)?(px|em|rem|%|pt)$/],
                    'font-weight': [/^(normal|bold|[1-9]00)$/],
                    'font-family': [/^[\w\s,'"-]+$/],
                    padding: [/^[\d\s.]+(px|em|rem|%)?$/],
                    margin: [/^[\d\s.a-z]+$/],
                    border: [/^[\w\s#().,%-]+$/],
                    width: [/^\d+(\.\d+)?(px|em|rem|%)$/],
                    'line-height': [/^[\d.]+(px|em|rem|%)?$/],
                },
            }
            : undefined,
        transformTags: {
            // Unwrap presentational markup into its semantic equivalent rather
            // than deleting the words inside it.
            ...replacementsFor(policy),
            a: transformAnchor,
        },
    };
}

const OPTIONS_BY_POLICY: Record<HtmlPolicy, sanitizeHtml.IOptions> = {
    web: optionsFor('web'),
    email: optionsFor('email'),
};

/**
 * Sanitises one rich-text value.
 *
 * Returns `undefined` when the content is blank once markup is removed, so an
 * editor that was focused and then cleared stores nothing rather than the
 * `<p><br></p>` that `contentEditable` leaves behind.
 */
export function sanitizeRichText(value: unknown, policy: HtmlPolicy = 'web'): string | undefined {
    if (typeof value !== 'string' || value.trim() === '') return undefined;

    const cleaned = sanitizeHtml(value, OPTIONS_BY_POLICY[policy]).trim();

    return isBlankHtml(cleaned) ? undefined : cleaned;
}

/**
 * Strips every tag, leaving text. For values that must never carry markup —
 * plain-text settings, meta descriptions, headings.
 */
export function stripHtmlTags(value: unknown): string {
    if (typeof value !== 'string') return '';
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
