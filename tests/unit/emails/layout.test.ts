import { describe, expect, it } from 'vitest';
import {
    absoluteEmailUrl,
    escapeHtml,
    renderEmailHtml,
    renderEmailText,
} from '@/emails/layout';
import { siteConfig } from '@/config/site';

const base = { title: 'Your session is confirmed', body: 'Hi Aman, see you on Friday.' };

describe('escapeHtml', () => {
    it('escapes every character that could break out of the markup', () => {
        expect(escapeHtml(`<script>"a"&'b'</script>`)).toBe(
            '&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;',
        );
    });
});

describe('absoluteEmailUrl', () => {
    it('leaves an absolute URL untouched', () => {
        expect(absoluteEmailUrl('https://example.org/x')).toBe('https://example.org/x');
    });

    it('resolves a relative path against the site URL', () => {
        expect(absoluteEmailUrl('/dashboard')).toBe(`${siteConfig.url.replace(/\/$/, '')}/dashboard`);
    });

    it('adds the missing separator for a bare path', () => {
        expect(absoluteEmailUrl('dashboard')).toContain('/dashboard');
    });
});

describe('renderEmailHtml', () => {
    it('renders a complete document with the title and body', () => {
        const html = renderEmailHtml(base);

        expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
        expect(html).toContain('Your session is confirmed');
        expect(html).toContain('Hi Aman, see you on Friday.');
    });

    it('escapes interpolated content rather than trusting it', () => {
        const html = renderEmailHtml({
            title: '<img src=x onerror=alert(1)>',
            body: 'safe',
        });

        expect(html).not.toContain('<img src=x');
        expect(html).toContain('&lt;img src=x');
    });

    it('renders a CTA with an absolute URL when an action is given', () => {
        const html = renderEmailHtml({
            ...base,
            action: { label: 'View booking', url: '/dashboard/bookings' },
        });

        expect(html).toContain('View booking');
        expect(html).toContain(`${siteConfig.url.replace(/\/$/, '')}/dashboard/bookings`);
    });

    it('omits the CTA block entirely when there is no action', () => {
        expect(renderEmailHtml(base)).not.toContain('<a href');
    });

    it('splits blank-line separated blocks into paragraphs', () => {
        const html = renderEmailHtml({ ...base, body: 'First block.\n\nSecond block.' });

        expect(html.match(/<p style="margin:0 0 12px/g)).toHaveLength(2);
    });

    it('shows the preferences link only when asked', () => {
        expect(renderEmailHtml(base)).not.toContain('notification preferences');
        expect(renderEmailHtml({ ...base, showPreferencesLink: true })).toContain(
            'notification preferences',
        );
    });

    it('always carries the verify-with-official-sources disclaimer', () => {
        expect(renderEmailHtml(base)).toContain('confirm them with the official source');
    });

    it('renders the footnote under a divider when provided', () => {
        expect(renderEmailHtml({ ...base, footnote: 'Reference BK2600001' })).toContain(
            'Reference BK2600001',
        );
    });
});

describe('renderEmailText', () => {
    it('includes the title, body and resolved action URL', () => {
        const text = renderEmailText({
            ...base,
            action: { label: 'View booking', url: '/dashboard/bookings' },
        });

        expect(text).toContain('Your session is confirmed');
        expect(text).toContain('Hi Aman, see you on Friday.');
        expect(text).toContain('View booking: ');
        expect(text).toContain('/dashboard/bookings');
    });

    it('does not escape anything, since it is not markup', () => {
        expect(renderEmailText({ title: 'a & b', body: '<x>' })).toContain('a & b');
    });
});
