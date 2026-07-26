import { describe, expect, it } from 'vitest';
import {
    absoluteUrl,
    buildQuery,
    chunk,
    clamp,
    cn,
    escapeRegex,
    formatCompactCount,
    formatCompactINR,
    formatCurrency,
    formatDate,
    formatRelativeTime,
    hashString,
    initials,
    maskEmail,
    maskPhone,
    readingTimeMinutes,
    slugify,
    stripHtml,
    truncate,
    unique,
} from '@/lib/utils';

describe('cn', () => {
    it('merges class names and lets the last tailwind utility win', () => {
        expect(cn('px-2', 'px-4')).toBe('px-4');
        expect(cn('text-sm', false && 'hidden', undefined, 'font-bold')).toBe('text-sm font-bold');
    });
});

describe('slugify', () => {
    it('lowercases and hyphenates', () => {
        expect(slugify('IIT Bombay')).toBe('iit-bombay');
    });

    it('drops punctuation and collapses repeated separators', () => {
        expect(slugify('B.Tech (CSE) — 2025!!')).toBe('btech-cse-2025');
    });

    it('strips diacritics', () => {
        expect(slugify('Café Résumé')).toBe('cafe-resume');
    });

    it('trims surrounding whitespace instead of leaving edge hyphens', () => {
        expect(slugify('  Delhi University  ')).toBe('delhi-university');
    });

    it('caps the output at 120 characters', () => {
        expect(slugify('a'.repeat(200)).length).toBe(120);
    });

    it('returns an empty string when nothing survives normalisation', () => {
        expect(slugify('!!!')).toBe('');
    });
});

describe('escapeRegex', () => {
    it('escapes regex metacharacters', () => {
        expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
        expect(escapeRegex('(hello)')).toBe('\\(hello\\)');
    });

    it('produces a pattern that matches the literal input', () => {
        const raw = 'B.Tech (CSE) [2025]';
        expect(new RegExp(escapeRegex(raw)).test(raw)).toBe(true);
    });

    it('leaves safe input untouched', () => {
        expect(escapeRegex('iit delhi')).toBe('iit delhi');
    });
});

describe('formatCurrency', () => {
    it('formats INR without decimals', () => {
        const formatted = formatCurrency(250_000);
        expect(formatted).toContain('₹');
        expect(formatted).toContain('2,50,000');
        expect(formatted).not.toContain('.');
    });

    it('returns an em dash for nullish or NaN values', () => {
        expect(formatCurrency(undefined)).toBe('—');
        expect(formatCurrency(null)).toBe('—');
        expect(formatCurrency(Number.NaN)).toBe('—');
    });

    it('formats zero', () => {
        expect(formatCurrency(0)).toContain('0');
    });
});

describe('formatCompactINR', () => {
    it('uses lakh and crore buckets', () => {
        expect(formatCompactINR(240_000)).toBe('₹ 2.4 L');
        expect(formatCompactINR(1_500_000)).toBe('₹ 15 L');
        expect(formatCompactINR(12_000_000)).toBe('₹ 1.2 Cr');
        expect(formatCompactINR(5_000)).toBe('₹ 5 K');
        expect(formatCompactINR(999)).toBe('₹ 999');
    });

    it('returns an em dash for nullish values', () => {
        expect(formatCompactINR(null)).toBe('—');
        expect(formatCompactINR(undefined)).toBe('—');
    });
});

describe('formatCompactCount', () => {
    it('adds the plus suffix by default', () => {
        expect(formatCompactCount(1_000)).toBe('1K+');
        expect(formatCompactCount(20_000)).toBe('20K+');
        expect(formatCompactCount(100_000)).toBe('1 Lakh+');
        expect(formatCompactCount(999)).toBe('999+');
    });

    it('accepts a custom suffix', () => {
        expect(formatCompactCount(500, '')).toBe('500');
    });
});

describe('formatDate', () => {
    it('formats an ISO string in IST', () => {
        expect(formatDate('2025-03-15T06:00:00.000Z')).toBe('15 Mar 2025');
    });

    it('returns an em dash for empty or invalid dates', () => {
        expect(formatDate(null)).toBe('—');
        expect(formatDate(undefined)).toBe('—');
        expect(formatDate('not-a-date')).toBe('—');
    });
});

describe('formatRelativeTime', () => {
    it('describes recent timestamps', () => {
        expect(formatRelativeTime(new Date())).toBe('just now');
        expect(formatRelativeTime(new Date(Date.now() - 10 * 60_000))).toBe('10m ago');
        expect(formatRelativeTime(new Date(Date.now() - 3 * 3_600_000))).toBe('3h ago');
        expect(formatRelativeTime(new Date(Date.now() - 5 * 86_400_000))).toBe('5d ago');
    });

    it('falls back to an absolute date beyond 30 days', () => {
        expect(formatRelativeTime(new Date(Date.now() - 400 * 86_400_000))).toMatch(
            /\d{2} [A-Za-z]{3} \d{4}/,
        );
    });

    it('returns an empty string when there is no value', () => {
        expect(formatRelativeTime(null)).toBe('');
    });
});

describe('truncate', () => {
    it('leaves short text untouched', () => {
        expect(truncate('short text', 20)).toBe('short text');
    });

    it('appends an ellipsis when trimming', () => {
        const result = truncate('abcdefghij', 5);
        expect(result).toBe('abcd…');
        expect(result.length).toBe(5);
    });

    it('respects the exact boundary', () => {
        expect(truncate('12345', 5)).toBe('12345');
    });

    it('drops trailing whitespace before the ellipsis', () => {
        expect(truncate('hello world', 7)).toBe('hello…');
    });
});

describe('stripHtml', () => {
    it('removes tags and collapses whitespace', () => {
        expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
    });

    it('handles plain text', () => {
        expect(stripHtml('no markup here')).toBe('no markup here');
    });

    it('returns an empty string for markup-only input', () => {
        expect(stripHtml('<br/>')).toBe('');
    });
});

describe('readingTimeMinutes', () => {
    it('is at least one minute', () => {
        expect(readingTimeMinutes('<p>tiny</p>')).toBe(1);
    });

    it('scales with word count at ~220 wpm', () => {
        const html = `<p>${'word '.repeat(660).trim()}</p>`;
        expect(readingTimeMinutes(html)).toBe(3);
    });
});

describe('initials', () => {
    it('takes the first letters of up to two words', () => {
        expect(initials('Ankit Raj')).toBe('AR');
        expect(initials('ankit kumar raj')).toBe('AK');
        expect(initials('Ankit')).toBe('A');
    });

    it('ignores extra whitespace', () => {
        expect(initials('  Ankit   Raj ')).toBe('AR');
    });
});

describe('clamp', () => {
    it('bounds the value', () => {
        expect(clamp(5, 1, 10)).toBe(5);
        expect(clamp(-5, 1, 10)).toBe(1);
        expect(clamp(50, 1, 10)).toBe(10);
        expect(clamp(1, 1, 1)).toBe(1);
    });
});

describe('unique / chunk', () => {
    it('removes duplicates preserving first occurrence order', () => {
        expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
        expect(unique([])).toEqual([]);
    });

    it('splits into fixed size chunks', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
        expect(chunk([], 3)).toEqual([]);
    });
});

describe('buildQuery', () => {
    it('serialises truthy values with a leading question mark', () => {
        expect(buildQuery({ q: 'iit', page: 2 })).toBe('?q=iit&page=2');
    });

    it('drops empty, null, undefined and false values', () => {
        expect(buildQuery({ q: '', page: undefined, sort: null, featured: false })).toBe('');
    });

    it('keeps true values', () => {
        expect(buildQuery({ featured: true })).toBe('?featured=true');
    });

    it('encodes special characters', () => {
        expect(buildQuery({ q: 'b tech & cse' })).toBe('?q=b+tech+%26+cse');
    });
});

describe('maskPhone / maskEmail', () => {
    it('keeps only the last four phone digits', () => {
        expect(maskPhone('9876543210')).toBe('••••••3210');
        expect(maskPhone('123')).toBe('••••');
    });

    it('masks the local part of an email', () => {
        expect(maskEmail('student@example.com')).toBe('st•••••@example.com');
        expect(maskEmail('not-an-email')).toBe('•••');
    });
});

describe('hashString', () => {
    it('is deterministic and non-negative', () => {
        expect(hashString('admission-sathi')).toBe(hashString('admission-sathi'));
        expect(hashString('admission-sathi')).toBeGreaterThanOrEqual(0);
        expect(hashString('')).toBe(0);
    });

    it('differs for different input', () => {
        expect(hashString('a')).not.toBe(hashString('b'));
    });
});

describe('absoluteUrl', () => {
    it('joins the site URL with the path exactly once', () => {
        expect(absoluteUrl('/colleges')).toBe('http://localhost:3000/colleges');
        expect(absoluteUrl('colleges')).toBe('http://localhost:3000/colleges');
    });

    it('honours a trailing slash on the base URL', () => {
        const previous = process.env.NEXT_PUBLIC_SITE_URL;
        process.env.NEXT_PUBLIC_SITE_URL = 'https://admissionsathi.org/';
        try {
            expect(absoluteUrl('/exams')).toBe('https://admissionsathi.org/exams');
        } finally {
            process.env.NEXT_PUBLIC_SITE_URL = previous;
        }
    });
});
