import { describe, expect, it } from 'vitest';
import { reviveDates } from '@/lib/cache';

/**
 * `reviveDates` exists because the Next.js data cache stores values as
 * `JSON.stringify(result)`, which flattens every `Date` to a string. These tests
 * pin the two properties that matter: real timestamps come back as `Date`, and
 * strings that merely contain digits and dashes are left alone.
 */
describe('reviveDates', () => {
    it('restores a full ISO UTC timestamp to a Date', () => {
        const revived = reviveDates({ publishedAt: '2026-07-28T04:30:00.000Z' });
        expect(revived.publishedAt).toBeInstanceOf(Date);
        expect((revived.publishedAt as unknown as Date).toISOString()).toBe(
            '2026-07-28T04:30:00.000Z',
        );
    });

    it('accepts a timestamp without milliseconds', () => {
        const revived = reviveDates({ at: '2026-07-28T04:30:00Z' });
        expect(revived.at).toBeInstanceOf(Date);
    });

    it('walks nested objects and arrays', () => {
        const revived = reviveDates({
            college: { slug: 'x', createdAt: '2026-01-02T03:04:05.000Z' },
            reviews: [{ createdAt: '2026-01-02T03:04:05.000Z' }],
        });
        expect(revived.college.createdAt).toBeInstanceOf(Date);
        expect(revived.reviews[0]!.createdAt).toBeInstanceOf(Date);
        expect(revived.college.slug).toBe('x');
    });

    it('leaves date-like strings that are not full timestamps alone', () => {
        const revived = reviveDates({
            slug: 'jee-main-2026-01-02',
            dateOnly: '2026-01-02',
            local: '2026-01-02T03:04:05+05:30',
            prose: 'Exam on 2026-01-02T03:04:05.000Z as scheduled',
        });
        expect(revived.slug).toBe('jee-main-2026-01-02');
        expect(revived.dateOnly).toBe('2026-01-02');
        expect(revived.local).toBe('2026-01-02T03:04:05+05:30');
        expect(revived.prose).toBe('Exam on 2026-01-02T03:04:05.000Z as scheduled');
    });

    it('passes through primitives and null', () => {
        expect(reviveDates(null)).toBeNull();
        expect(reviveDates(7)).toBe(7);
        expect(reviveDates(false)).toBe(false);
        expect(reviveDates(undefined)).toBeUndefined();
    });
});
