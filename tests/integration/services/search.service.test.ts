import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { College } from '@/db/models/college.model';
import { Course } from '@/db/models/course.model';
import { Exam } from '@/db/models/exam.model';
import { SearchQuery, SearchSynonym } from '@/db/models/system.model';
import { globalSearch, logSearchQuery } from '@/services/search.service';

async function seedCollege(overrides: Record<string, unknown> = {}) {
    return College.create({
        name: 'Delhi Technological University',
        slug: 'delhi-technological-university',
        shortName: 'DTU',
        state: new Types.ObjectId(),
        stateName: 'Delhi',
        city: new Types.ObjectId(),
        cityName: 'New Delhi',
        ownership: 'Government',
        status: 'published',
        ...overrides,
    });
}

async function seedCourse(overrides: Record<string, unknown> = {}) {
    return Course.create({
        name: 'Delhi Design Diploma',
        slug: 'delhi-design-diploma',
        category: new Types.ObjectId(),
        categoryName: 'Design',
        level: 'Diploma',
        durationMonths: 24,
        durationLabel: '2 Years',
        status: 'published',
        ...overrides,
    });
}

async function seedExam(overrides: Record<string, unknown> = {}) {
    return Exam.create({
        name: 'Delhi Entrance Examination',
        shortName: 'DEE',
        slug: 'delhi-entrance-examination',
        conductingBody: 'Delhi Board',
        level: 'State',
        category: 'Engineering',
        examYear: 2026,
        status: 'published',
        ...overrides,
    });
}

describe('globalSearch', () => {
    it('returns nothing for a term shorter than two characters', async () => {
        await seedCollege();

        const response = await globalSearch('d');

        expect(response).toMatchObject({ groups: [], total: 0, tookMs: 0 });
    });

    it('groups hits across colleges, courses and exams', async () => {
        await seedCollege();
        await seedCourse();
        await seedExam();

        const response = await globalSearch('delhi');

        expect(response.groups.map((group) => group.type)).toEqual(['college', 'course', 'exam']);
        expect(response.total).toBe(3);
    });

    it('builds the public url and a sublabel for each hit type', async () => {
        await seedCollege();
        await seedCourse();

        const response = await globalSearch('delhi');
        const college = response.groups.find((group) => group.type === 'college')?.hits[0];
        const course = response.groups.find((group) => group.type === 'course')?.hits[0];

        expect(college).toMatchObject({
            url: '/colleges/delhi-technological-university',
            sublabel: 'New Delhi, Delhi',
        });
        expect(course).toMatchObject({ url: '/courses/delhi-design-diploma', meta: 'Diploma' });
    });

    it('omits a group that has no hits', async () => {
        await seedCollege();

        const response = await globalSearch('delhi');

        expect(response.groups.map((group) => group.type)).toEqual(['college']);
    });

    it('respects limitPerGroup', async () => {
        await Promise.all(
            Array.from({ length: 4 }, (_, index) =>
                seedCollege({ name: `Delhi College ${index}`, slug: `delhi-college-${index}` }),
            ),
        );

        const response = await globalSearch('delhi', { limitPerGroup: 2 });

        expect(response.groups[0]?.hits).toHaveLength(2);
        expect(response.total).toBe(2);
    });

    it('searches only the requested entity types', async () => {
        await seedCollege();
        await seedCourse();

        const response = await globalSearch('delhi', { types: ['course'] });

        expect(response.groups.map((group) => group.type)).toEqual(['course']);
    });

    it('never returns unpublished rows', async () => {
        await seedCollege({ slug: 'draft-delhi-college', name: 'Draft Delhi College', status: 'draft' });

        expect(await globalSearch('delhi')).toMatchObject({ total: 0, groups: [] });
    });

    it('puts an admin synonym’s promoted result first', async () => {
        await seedCollege();
        await SearchSynonym.create({
            term: 'dtu',
            synonyms: ['delhi technological university'],
            promotedEntityType: 'college',
            promotedLabel: 'Delhi Technological University — official page',
            promotedUrl: '/colleges/delhi-technological-university',
            status: 'active',
        });

        const response = await globalSearch('dtu');

        expect(response.groups[0]?.label).toBe('Suggested');
        expect(response.groups[0]?.hits[0]).toMatchObject({
            promoted: true,
            badge: 'Suggested',
            url: '/colleges/delhi-technological-university',
        });
    });

    it('ignores an inactive synonym rule', async () => {
        await seedCollege();
        await SearchSynonym.create({
            term: 'dtu',
            synonyms: [],
            promotedEntityType: 'college',
            promotedLabel: 'Promoted but disabled',
            promotedUrl: '/colleges/delhi-technological-university',
            status: 'inactive',
        });

        const response = await globalSearch('dtu');

        expect(response.groups.every((group) => group.label !== 'Suggested')).toBe(true);
    });

    it('treats regex metacharacters in the term as literals', async () => {
        await seedCollege();

        expect(await globalSearch('.*')).toMatchObject({ total: 0 });
    });
});

describe('logSearchQuery', () => {
    it('stores the term, its normalised form and the result count', async () => {
        await logSearchQuery({ term: '  Delhi Colleges ', resultCount: 7, scope: 'header' });

        const row = await SearchQuery.findOne({}).lean();
        // The schema trims `term`; `normalizedTerm` is also lowercased.
        expect(row).toMatchObject({
            term: 'Delhi Colleges',
            normalizedTerm: 'delhi colleges',
            resultCount: 7,
            zeroResults: false,
            scope: 'header',
        });
    });

    it('flags a search that found nothing', async () => {
        await logSearchQuery({ term: 'qqqq', resultCount: 0 });

        expect((await SearchQuery.findOne({}).lean())?.zeroResults).toBe(true);
    });

    it('records the anonymous id when there is no signed-in user', async () => {
        await logSearchQuery({ term: 'delhi', resultCount: 1, anonymousId: 'anon-9' });

        const row = await SearchQuery.findOne({}).lean();
        expect(row?.anonymousId).toBe('anon-9');
        expect(row?.user).toBeUndefined();
    });

    it('never throws when the write fails', async () => {
        // A term longer than the schema maximum is rejected by validation.
        await expect(
            logSearchQuery({ term: 'x'.repeat(500), resultCount: 1 }),
        ).resolves.toBeUndefined();
    });
});
