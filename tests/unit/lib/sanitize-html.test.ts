import { describe, expect, it } from 'vitest';
import { sanitizeRichText, stripHtmlTags } from '@/lib/html/sanitize';
import { isBlankHtml, isSafeUrl } from '@/lib/html/policy';

describe('sanitizeRichText — stored XSS vectors', () => {
    it('drops a script tag and its contents', () => {
        expect(sanitizeRichText('<p>Hi</p><script>alert(1)</script>')).toBe('<p>Hi</p>');
    });

    it('drops a style tag and its contents', () => {
        expect(sanitizeRichText('<p>Hi</p><style>body{display:none}</style>')).toBe('<p>Hi</p>');
    });

    it('strips event handler attributes', () => {
        expect(sanitizeRichText('<p onclick="alert(1)">Click</p>')).toBe('<p>Click</p>');
        expect(sanitizeRichText('<p onmouseover="steal()">Hover</p>')).toBe('<p>Hover</p>');
    });

    it('removes a javascript: link but keeps the text', () => {
        const result = sanitizeRichText('<p><a href="javascript:alert(1)">Click me</a></p>');

        expect(result).not.toContain('javascript');
        expect(result).toContain('Click me');
    });

    it('removes a data: URI link', () => {
        const result = sanitizeRichText(
            '<p><a href="data:text/html;base64,PHNjcmlwdD4=">x</a></p>',
        );

        expect(result).not.toContain('data:');
    });

    it('defeats control characters smuggled into a scheme', () => {
        // Browsers parse `java\tscript:` as `javascript:`.
        const result = sanitizeRichText('<p><a href="java\tscript:alert(1)">x</a></p>');

        expect(result).not.toMatch(/javascript/i);
    });

    it('drops an iframe entirely', () => {
        expect(sanitizeRichText('<p>a</p><iframe src="https://evil.test"></iframe>')).toBe('<p>a</p>');
    });

    it('drops form controls that could phish', () => {
        const result = sanitizeRichText('<form action="https://evil.test"><input name="pw"></form>');

        expect(result).toBeUndefined();
    });

    it('refuses a protocol-relative link', () => {
        const result = sanitizeRichText('<p><a href="//evil.test/x">x</a></p>');

        expect(result).not.toContain('//evil.test');
    });

    it('strips inline styles under the web policy', () => {
        expect(sanitizeRichText('<p style="position:fixed;top:0">a</p>')).toBe('<p>a</p>');
    });

    it('strips class attributes so content cannot hijack site styling', () => {
        expect(sanitizeRichText('<p class="fixed inset-0 z-50">a</p>')).toBe('<p>a</p>');
    });
});

describe('sanitizeRichText — content preservation', () => {
    it('keeps the tags an editor legitimately produces', () => {
        const html =
            '<h2>Overview</h2><p>Some <strong>bold</strong> and <em>italic</em> text.</p><ul><li>One</li></ul>';

        expect(sanitizeRichText(html)).toBe(html);
    });

    it('normalises presentational tags to semantic ones', () => {
        expect(sanitizeRichText('<p><b>a</b> <i>b</i></p>')).toBe('<p><strong>a</strong> <em>b</em></p>');
    });

    it('unwraps a div into a paragraph', () => {
        expect(sanitizeRichText('<div>Body copy</div>')).toBe('<p>Body copy</p>');
    });

    it('keeps a table, which the stylesheet supports', () => {
        const html = '<table><tbody><tr><th>A</th><td>B</td></tr></tbody></table>';

        expect(sanitizeRichText(html)).toContain('<table>');
    });

    it('keeps a relative internal link untouched', () => {
        expect(sanitizeRichText('<p><a href="/colleges/iit-bombay">IIT Bombay</a></p>')).toBe(
            '<p><a href="/colleges/iit-bombay">IIT Bombay</a></p>',
        );
    });

    it('hardens an external link with noopener and nofollow', () => {
        const result = sanitizeRichText('<p><a href="https://example.org">x</a></p>');

        expect(result).toContain('target="_blank"');
        expect(result).toContain('rel="noopener noreferrer nofollow"');
    });

    it('does not force internal links into a new tab', () => {
        expect(sanitizeRichText('<p><a href="/about">x</a></p>')).not.toContain('target');
    });

    it('preserves mailto and tel links', () => {
        expect(sanitizeRichText('<p><a href="mailto:a@b.com">mail</a></p>')).toContain('mailto:');
        expect(sanitizeRichText('<p><a href="tel:+919155555555">call</a></p>')).toContain('tel:');
    });

    it('leaves {{variable}} placeholders intact', () => {
        expect(sanitizeRichText('<p>Hi {{name}}, ref {{reference}}.</p>')).toBe(
            '<p>Hi {{name}}, ref {{reference}}.</p>',
        );
    });
});

describe('sanitizeRichText — blank handling', () => {
    it('treats an empty string as absent', () => {
        expect(sanitizeRichText('')).toBeUndefined();
        expect(sanitizeRichText('   ')).toBeUndefined();
    });

    it('treats what a cleared contentEditable leaves behind as absent', () => {
        expect(sanitizeRichText('<p><br></p>')).toBeUndefined();
        expect(sanitizeRichText('<p>&nbsp;</p>')).toBeUndefined();
    });

    it('returns undefined for a non-string', () => {
        expect(sanitizeRichText(null)).toBeUndefined();
        expect(sanitizeRichText(42)).toBeUndefined();
    });
});

describe('sanitizeRichText — email policy', () => {
    it('keeps safe inline styles that email clients need', () => {
        const result = sanitizeRichText('<p style="color:#073174;text-align:center">Hi</p>', 'email');

        expect(result).toContain('color:#073174');
        expect(result).toContain('text-align:center');
    });

    it('keeps layout divs instead of collapsing them to paragraphs', () => {
        expect(sanitizeRichText('<div>Body</div>', 'email')).toContain('<div>');
    });

    it('still refuses a script under the email policy', () => {
        expect(sanitizeRichText('<p>a</p><script>alert(1)</script>', 'email')).toBe('<p>a</p>');
    });

    it('still refuses a javascript: link under the email policy', () => {
        expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>', 'email')).not.toMatch(
            /javascript/i,
        );
    });

    it('drops a style declaration that is not on the allow-list', () => {
        const result = sanitizeRichText('<p style="position:fixed;color:red">a</p>', 'email');

        expect(result).not.toContain('position');
        expect(result).toContain('color:red');
    });
});

describe('stripHtmlTags', () => {
    it('reduces markup to its text', () => {
        expect(stripHtmlTags('<p>Hello <strong>there</strong></p>')).toBe('Hello there');
    });

    it('returns an empty string for a non-string', () => {
        expect(stripHtmlTags(undefined)).toBe('');
    });
});

describe('isSafeUrl', () => {
    it('accepts the permitted schemes and relative paths', () => {
        ['https://a.test', 'http://a.test', 'mailto:a@b.com', 'tel:+91', '/x', '#anchor', '?q=1'].forEach(
            (url) => expect(isSafeUrl(url), url).toBe(true),
        );
    });

    it('rejects script-bearing and protocol-relative URLs', () => {
        ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', '//evil.test'].forEach(
            (url) => expect(isSafeUrl(url), url).toBe(false),
        );
    });
});

describe('isBlankHtml', () => {
    it('recognises visually empty markup', () => {
        ['', '<p></p>', '<p><br></p>', '<p>&nbsp;</p>', '<h2>  </h2>'].forEach((html) =>
            expect(isBlankHtml(html), html).toBe(true),
        );
    });

    it('recognises real content', () => {
        expect(isBlankHtml('<p>a</p>')).toBe(false);
    });
});
