import {
    TAG_REPLACEMENTS,
    allowedAttributesFor,
    isAllowedTag,
    isSafeUrl,
} from './policy';

/**
 * Browser-side rich-text cleanup, used by the admin editor.
 *
 * This is a convenience layer, not a security boundary: the server sanitiser in
 * `sanitize.ts` is what actually protects the stored value. Its job is to make
 * pasted content usable — Word, Google Docs and web pages all paste a wall of
 * `<span style>`, `<font>`, `<div>` and `class="MsoNormal"` that would otherwise
 * be stored verbatim and render unstyled on the public site.
 *
 * Parsing goes through `DOMParser`, never a regex: the browser's own HTML parser
 * is the only thing that agrees with how a browser will later read the markup.
 */

const DISCARDED_TAGS = new Set([
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'form',
    'input',
    'textarea',
    'noscript',
    'meta',
    'link',
    'title',
]);

/** Replaces a node with its own children, preserving the text. */
function unwrap(node: Element): void {
    const parent = node.parentNode;
    if (!parent) return;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
}

function renameElement(node: Element, tagName: string): Element {
    const replacement = node.ownerDocument.createElement(tagName);
    while (node.firstChild) replacement.appendChild(node.firstChild);
    node.parentNode?.replaceChild(replacement, node);
    return replacement;
}

function cleanElement(node: Element): void {
    const tag = node.tagName.toLowerCase();

    if (DISCARDED_TAGS.has(tag)) {
        node.remove();
        return;
    }

    const replacement = TAG_REPLACEMENTS[tag];
    let current = node;

    if (replacement === '') {
        // `span` / `font` carry no meaning — keep the words, drop the wrapper.
        Array.from(node.children).forEach(cleanElement);
        unwrap(node);
        return;
    }

    if (replacement) {
        current = renameElement(node, replacement);
    } else if (!isAllowedTag(tag)) {
        Array.from(node.children).forEach(cleanElement);
        unwrap(node);
        return;
    }

    const allowed = allowedAttributesFor(current.tagName.toLowerCase());
    Array.from(current.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();

        if (!allowed.includes(name)) {
            current.removeAttribute(attribute.name);
            return;
        }
        if ((name === 'href' || name === 'src') && !isSafeUrl(attribute.value)) {
            current.removeAttribute(attribute.name);
        }
    });

    Array.from(current.children).forEach(cleanElement);
}

/** Cleans an HTML fragment down to the shared allow-list. */
export function cleanPastedHtml(html: string): string {
    if (typeof window === 'undefined') return html;

    const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    Array.from(parsed.body.children).forEach(cleanElement);

    return parsed.body.innerHTML
        // Word emits runs of non-breaking spaces for indentation.
        .replace(/(&nbsp;\s*){2,}/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** Wraps plain text as paragraphs, splitting on blank lines. */
export function plainTextToHtml(text: string): string {
    const escape = (value: string) =>
        value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return text
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => `<p>${escape(block).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

/**
 * Normalises what `contentEditable` produced before it is handed to the form.
 * Empty editors report `<p><br></p>` or `<br>`, which must become an empty string
 * so "required" validation behaves the way an editor expects.
 */
export function normaliseEditorHtml(html: string): string {
    const trimmed = html.trim();
    if (trimmed === '' || trimmed === '<br>' || /^<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>$/i.test(trimmed)) {
        return '';
    }
    return trimmed;
}
