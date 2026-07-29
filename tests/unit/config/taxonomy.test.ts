import { describe, expect, it } from 'vitest';
import { COURSE_LEVELS, EXAM_CATEGORIES } from '@/config/constants';
import {
    COURSE_LEVEL_LANDINGS,
    EXAM_CATEGORY_LANDINGS,
    findCourseLevelLanding,
    findExamCategoryLanding,
} from '@/config/taxonomy';

describe('COURSE_LEVEL_LANDINGS', () => {
    it('publishes one landing per level enum value', () => {
        expect(COURSE_LEVEL_LANDINGS.map((entry) => entry.value)).toEqual([...COURSE_LEVELS]);
    });

    it('derives URL-safe slugs', () => {
        for (const entry of COURSE_LEVEL_LANDINGS) {
            expect(entry.slug).toMatch(/^[a-z0-9-]+$/);
        }
    });

    it('gives every level its own editorial description', () => {
        const descriptions = COURSE_LEVEL_LANDINGS.map((entry) => entry.description);
        expect(new Set(descriptions).size).toBe(descriptions.length);
    });
});

describe('EXAM_CATEGORY_LANDINGS', () => {
    it('publishes one landing per category enum value', () => {
        expect(EXAM_CATEGORY_LANDINGS.map((entry) => entry.value)).toEqual([...EXAM_CATEGORIES]);
    });

    it('slugifies categories that contain punctuation', () => {
        const arts = EXAM_CATEGORY_LANDINGS.find((entry) => entry.value === 'Arts & Humanities');
        expect(arts?.slug).toBe('arts-humanities');
    });

    it('keeps slugs unique', () => {
        const slugs = EXAM_CATEGORY_LANDINGS.map((entry) => entry.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
    });
});

describe('landing lookups', () => {
    it('finds a level by slug', () => {
        expect(findCourseLevelLanding('undergraduate')?.value).toBe('Undergraduate');
    });

    it('finds a category by slug', () => {
        expect(findExamCategoryLanding('engineering')?.value).toBe('Engineering');
    });

    it('returns undefined for an unknown slug so the page can 404', () => {
        expect(findCourseLevelLanding('post-doctorate')).toBeUndefined();
        expect(findExamCategoryLanding('astrology')).toBeUndefined();
    });
});
