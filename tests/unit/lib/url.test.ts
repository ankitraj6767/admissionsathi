import { describe, expect, it } from 'vitest';
import { displayHost, isExternalHref, safeHref, safeWebUrl } from '@/lib/url';

describe('safeHref — rejects script sinks', () => {
    it.each([
        'javascript:alert(1)',
        'JavaScript:alert(1)',
        '  javascript:alert(1)  ',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
    ])('rejects %s', (value) => {
        expect(safeHref(value)).toBeNull();
    });

    it('defeats control characters smuggled into the scheme', () => {
        // Browsers read `java\tscript:` as `javascript:`.
        expect(safeHref('java\tscript:alert(1)')).toBeNull();
        expect(safeHref('java\u0000script:alert(1)')).toBeNull();
    });

    it('rejects a protocol-relative URL', () => {
        expect(safeHref('//evil.test/x')).toBeNull();
    });

    it('returns null for empty input', () => {
        expect(safeHref('')).toBeNull();
        expect(safeHref('   ')).toBeNull();
        expect(safeHref(null)).toBeNull();
        expect(safeHref(undefined)).toBeNull();
    });
});

describe('safeHref — allows real links', () => {
    it.each([
        'https://example.org',
        'http://example.org/path?q=1#a',
        'mailto:admissions@example.org',
        'tel:+919155555555',
    ])('allows %s', (value) => {
        expect(safeHref(value)).toBe(value);
    });

    it('allows in-app relative and anchor links', () => {
        expect(safeHref('/colleges/iit-bombay')).toBe('/colleges/iit-bombay');
        expect(safeHref('#reviews')).toBe('#reviews');
        expect(safeHref('?page=2')).toBe('?page=2');
    });

    /**
     * A bare domain is what editors most often type into a website field.
     * Upgrading it beats storing a value that is then never linked.
     */
    it('upgrades a bare domain to https', () => {
        expect(safeHref('example.org')).toBe('https://example.org');
        expect(safeHref('www.silverpeak.example.org/admissions')).toBe(
            'https://www.silverpeak.example.org/admissions',
        );
    });

    it('does not treat a single word as a domain', () => {
        expect(safeHref('example')).toBeNull();
        expect(safeHref('not a url')).toBeNull();
    });
});

describe('safeWebUrl', () => {
    it('allows only http and https', () => {
        expect(safeWebUrl('https://example.org')).toBe('https://example.org');
        expect(safeWebUrl('http://example.org')).toBe('http://example.org');
    });

    it('rejects mailto and tel, which are not web pages', () => {
        expect(safeWebUrl('mailto:a@b.com')).toBeNull();
        expect(safeWebUrl('tel:+91')).toBeNull();
    });

    it('rejects relative paths', () => {
        expect(safeWebUrl('/about')).toBeNull();
    });

    it('still upgrades a bare domain', () => {
        expect(safeWebUrl('example.org')).toBe('https://example.org');
    });

    it('rejects script schemes', () => {
        expect(safeWebUrl('javascript:alert(1)')).toBeNull();
    });
});

describe('isExternalHref', () => {
    it('is true only for absolute http(s) links', () => {
        expect(isExternalHref('https://example.org')).toBe(true);
        expect(isExternalHref('http://example.org')).toBe(true);
        expect(isExternalHref('/about')).toBe(false);
        expect(isExternalHref('mailto:a@b.com')).toBe(false);
    });
});

describe('displayHost', () => {
    it('strips the scheme, www and path', () => {
        expect(displayHost('https://www.silverpeak.example.org/admissions')).toBe(
            'silverpeak.example.org',
        );
    });

    it('works on a bare domain', () => {
        expect(displayHost('example.org')).toBe('example.org');
    });

    it('is empty for an unsafe value', () => {
        expect(displayHost('javascript:alert(1)')).toBe('');
        expect(displayHost(undefined)).toBe('');
    });
});
