import { describe, expect, it } from 'vitest';
import {
    EMPTY_SLUG_SETS,
    classifyHref,
    extractHrefs,
    normalizePath,
    resolvesInternally,
    type SlugSets,
} from '@/lib/seo/link-resolver';

function slugs(overrides: Partial<Record<keyof SlugSets, string[]>> = {}): SlugSets {
    const next: SlugSets = { ...EMPTY_SLUG_SETS };
    for (const key of Object.keys(next) as (keyof SlugSets)[]) {
        next[key] = new Set(overrides[key] ?? []);
    }
    return next;
}

describe('classifyHref', () => {
    it('treats absolute http(s) URLs as external', () => {
        expect(classifyHref('https://nta.ac.in')).toBe('external');
        expect(classifyHref('//cdn.example.com/a.pdf')).toBe('external');
    });

    it('treats other schemes as external', () => {
        expect(classifyHref('mailto:hello@example.org')).toBe('external');
        expect(classifyHref('tel:+919155555555')).toBe('external');
    });

    it('recognises in-page anchors', () => {
        expect(classifyHref('#fees')).toBe('anchor');
    });

    it('flags schema-less relative links, which break under a different base path', () => {
        expect(classifyHref('colleges/iit-bombay')).toBe('relative');
    });

    it('recognises site-relative paths', () => {
        expect(classifyHref('/colleges/iit-bombay')).toBe('internal');
    });

    it('reports empty and whitespace-only hrefs', () => {
        expect(classifyHref('   ')).toBe('empty');
    });
});

describe('normalizePath', () => {
    it('drops the query string and hash', () => {
        expect(normalizePath('/colleges?state=goa#fees')).toBe('/colleges');
    });

    it('trims trailing slashes but keeps the root', () => {
        expect(normalizePath('/courses/')).toBe('/courses');
        expect(normalizePath('/')).toBe('/');
    });
});

describe('extractHrefs', () => {
    it('pulls every href out of stored rich text', () => {
        const html = '<p><a href="/colleges">a</a> and <a href=\'/exams/jee-main\'>b</a></p>';
        expect(extractHrefs(html)).toEqual(['/colleges', '/exams/jee-main']);
    });

    it('returns nothing for empty content', () => {
        expect(extractHrefs(undefined)).toEqual([]);
    });
});

describe('resolvesInternally', () => {
    it('accepts static routes', () => {
        expect(resolvesInternally('/colleges', slugs())).toBe(true);
        expect(resolvesInternally('/counselling/state', slugs())).toBe(true);
    });

    it('rejects a path that matches no route at all', () => {
        expect(resolvesInternally('/not-a-section/whatever', slugs())).toBe(false);
    });

    it('accepts a college detail page only for a published slug', () => {
        const published = slugs({ college: ['iit-bombay'] });
        expect(resolvesInternally('/colleges/iit-bombay', published)).toBe(true);
        expect(resolvesInternally('/colleges/iit-atlantis', published)).toBe(false);
    });

    it('validates college sub-tabs against the tab list', () => {
        const published = slugs({ college: ['iit-bombay'] });
        expect(resolvesInternally('/colleges/iit-bombay/placements', published)).toBe(true);
        expect(resolvesInternally('/colleges/iit-bombay/canteen', published)).toBe(false);
    });

    it('resolves geo landing pages against state and city slugs', () => {
        const published = slugs({ state: ['maharashtra'], city: ['pune'] });
        expect(resolvesInternally('/colleges/state/maharashtra', published)).toBe(true);
        expect(resolvesInternally('/colleges/city/pune', published)).toBe(true);
        expect(resolvesInternally('/colleges/state/pune', published)).toBe(false);
    });

    it('resolves the enum-backed level and category landings without a database', () => {
        expect(resolvesInternally('/courses/level/postgraduate', slugs())).toBe(true);
        expect(resolvesInternally('/courses/level/post-doctorate', slugs())).toBe(false);
        expect(resolvesInternally('/exams/category/medical', slugs())).toBe(true);
        expect(resolvesInternally('/exams/category/astrology', slugs())).toBe(false);
    });

    it('validates exam sections against the configured segments', () => {
        const published = slugs({ exam: ['neet-ug'] });
        expect(resolvesInternally('/exams/neet-ug/cutoff', published)).toBe(true);
        expect(resolvesInternally('/exams/neet-ug/horoscope', published)).toBe(false);
    });

    it('resolves scholarships by course only for a published course', () => {
        const published = slugs({ course: ['btech-cse'] });
        expect(resolvesInternally('/scholarships/course/btech-cse', published)).toBe(true);
        expect(resolvesInternally('/scholarships/course/btech-astrophysics', published)).toBe(false);
    });

    it('maps every resource listing prefix onto the resource slug set', () => {
        const published = slugs({ resource: ['jee-2025-paper'] });
        for (const prefix of ['guides', 'previous-year-papers', 'mock-tests', 'ebooks', 'webinars', 'resources']) {
            expect(resolvesInternally(`/${prefix}/jee-2025-paper`, published)).toBe(true);
        }
    });

    it('falls back to the CMS page catch-all for single-segment paths', () => {
        const published = slugs({ page: ['about-us'] });
        expect(resolvesInternally('/about-us', published)).toBe(true);
        expect(resolvesInternally('/about-them', published)).toBe(false);
    });

    it('rejects a college slug used as an article slug', () => {
        const published = slugs({ college: ['iit-bombay'] });
        expect(resolvesInternally('/articles/iit-bombay', published)).toBe(false);
    });
});
