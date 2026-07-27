import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
// Registers every model: getCollegeBySlug populates Exam and CourseCategory.
import '@/db/models';
import { College } from '@/db/models/college.model';
import {
    adjustCollegeSavedCount,
    buildCollegeFilter,
    collegeAutocomplete,
    countPublishedColleges,
    getCollegeBySlug,
    getCollegeBySlugHistory,
    getCollegesBySlugs,
    listColleges,
} from '@/db/repositories/college.repository';

const STATE_ID = new Types.ObjectId();
const CITY_ID = new Types.ObjectId();

async function seedCollege(overrides: Record<string, unknown> = {}) {
    return College.create({
        name: 'Indian Institute of Technology Bombay',
        slug: 'iit-bombay',
        shortName: 'IIT Bombay',
        state: STATE_ID,
        stateName: 'Maharashtra',
        city: CITY_ID,
        cityName: 'Mumbai',
        ownership: 'Government',
        status: 'published',
        ...overrides,
    });
}

describe('buildCollegeFilter', () => {
    it('always constrains the query to published colleges', () => {
        expect(buildCollegeFilter({})).toEqual({ status: 'published' });
    });

    it('searches name, short name, city, state and aliases for a free-text term', () => {
        const filter = buildCollegeFilter({ q: 'iit' });

        expect(filter.$or).toEqual([
            { name: /iit/i },
            { shortName: /iit/i },
            { cityName: /iit/i },
            { stateName: /iit/i },
            { aliases: /iit/i },
        ]);
    });

    it('escapes regex metacharacters in the free-text term', () => {
        const filter = buildCollegeFilter({ q: 'a.b*' });

        expect(filter.$or?.[0]).toEqual({ name: /a\.b\*/i });
    });

    it('maps reference ids onto their document fields', () => {
        expect(
            buildCollegeFilter({
                stateId: 'state-1',
                cityId: 'city-1',
                courseId: 'course-1',
                categoryId: 'category-1',
                examId: 'exam-1',
            }),
        ).toEqual({
            status: 'published',
            state: 'state-1',
            city: 'city-1',
            courses: 'course-1',
            categories: 'category-1',
            examsAccepted: 'exam-1',
        });
    });

    it('turns multi-value facets into $in clauses', () => {
        expect(
            buildCollegeFilter({
                ownership: ['Government', 'Private'],
                approval: ['AICTE'],
                accreditation: ['NAAC A++'],
            }),
        ).toMatchObject({
            ownership: { $in: ['Government', 'Private'] },
            approvals: { $in: ['AICTE'] },
            accreditation: { $in: ['NAAC A++'] },
        });
    });

    it('excludes unranked colleges from a ranking ceiling', () => {
        // Without the `$gt: 0` guard a college with no NIRF rank would sort first.
        expect(buildCollegeFilter({ rankingMax: 100 })['ranking.nirfOverall']).toEqual({
            $lte: 100,
            $gt: 0,
        });
    });

    it('builds a bounded fee range from either or both bounds', () => {
        expect(buildCollegeFilter({ feeMin: 50_000 })['feeRange.min']).toEqual({ $gte: 50_000 });
        expect(buildCollegeFilter({ feeMax: 200_000 })['feeRange.min']).toEqual({ $lte: 200_000 });
        expect(buildCollegeFilter({ feeMin: 1, feeMax: 2 })['feeRange.min']).toEqual({
            $gte: 1,
            $lte: 2,
        });
    });

    it('maps the remaining scalar facets', () => {
        expect(
            buildCollegeFilter({
                studyMode: 'Full Time',
                ratingMin: 4,
                hostel: true,
                placementMin: 80,
                featured: true,
            }),
        ).toMatchObject({
            studyModes: 'Full Time',
            'rating.overall': { $gte: 4 },
            hostelAvailable: true,
            'placement.placementPercentage': { $gte: 80 },
            isFeatured: true,
        });
    });

    it('leaves falsy facets out of the filter entirely', () => {
        const filter = buildCollegeFilter({ ownership: [], hostel: false, featured: false, q: '' });

        expect(Object.keys(filter)).toEqual(['status']);
    });
});

describe('listColleges', () => {
    it('returns only published colleges', async () => {
        await seedCollege();
        await seedCollege({ name: 'Draft College', slug: 'draft-college', status: 'draft' });
        await seedCollege({ name: 'Archived College', slug: 'archived-college', status: 'archived' });

        const result = await listColleges({});

        expect(result.items.map((college) => college.slug)).toEqual(['iit-bombay']);
    });

    it('excludes soft-deleted rows from both the page and the total', async () => {
        await seedCollege();
        await seedCollege({ name: 'Removed College', slug: 'removed-college', isDeleted: true });

        const result = await listColleges({});

        expect(result.items).toHaveLength(1);
        expect(result.total).toBe(1);
    });

    it('reports page, pageSize, total, hasNext and hasPrev', async () => {
        await Promise.all(
            Array.from({ length: 5 }, (_, index) =>
                seedCollege({ name: `College ${index}`, slug: `college-${index}` }),
            ),
        );

        const first = await listColleges({ pageSize: 2 });
        const second = await listColleges({ page: 2, pageSize: 2 });
        const last = await listColleges({ page: 3, pageSize: 2 });

        expect(first).toMatchObject({ page: 1, pageSize: 2, total: 5, hasNext: true, hasPrev: false });
        expect(second).toMatchObject({ page: 2, hasNext: true, hasPrev: true });
        expect(last).toMatchObject({ page: 3, hasNext: false, hasPrev: true });
    });

    it('sorts alphabetically for name-asc', async () => {
        await seedCollege({ name: 'Zed Institute', slug: 'zed-institute' });
        await seedCollege({ name: 'Alpha Institute', slug: 'alpha-institute' });

        const result = await listColleges({ sort: 'name-asc' });

        expect(result.items.map((college) => college.slug)).toEqual([
            'alpha-institute',
            'zed-institute',
        ]);
    });

    it('sorts by cheapest fee first for fee-low', async () => {
        await seedCollege({ name: 'Costly', slug: 'costly', feeRange: { min: 900_000 } });
        await seedCollege({ name: 'Cheap', slug: 'cheap', feeRange: { min: 50_000 } });

        const result = await listColleges({ sort: 'fee-low' });

        expect(result.items.map((college) => college.slug)).toEqual(['cheap', 'costly']);
    });

    it('sorts by NIRF rank ascending for ranking', async () => {
        await seedCollege({ name: 'Rank 9', slug: 'rank-9', ranking: { nirfOverall: 9 } });
        await seedCollege({ name: 'Rank 2', slug: 'rank-2', ranking: { nirfOverall: 2 } });

        const result = await listColleges({ sort: 'ranking' });

        expect(result.items.map((college) => college.slug)).toEqual(['rank-2', 'rank-9']);
    });

    it('falls back to the relevance sort for an unknown sort key', async () => {
        await seedCollege({ name: 'Plain', slug: 'plain' });
        await seedCollege({ name: 'Featured', slug: 'featured', isFeatured: true });

        const result = await listColleges({ sort: 'not-a-sort' });

        expect(result.items.map((college) => college.slug)).toEqual(['featured', 'plain']);
    });

    it('returns card fields only, never the heavy HTML blocks', async () => {
        await seedCollege({ overviewHtml: '<p>long</p>', admissionsHtml: '<p>long</p>' });

        const [college] = (await listColleges({})).items;

        expect(college?.name).toBe('Indian Institute of Technology Bombay');
        expect(college?.overviewHtml).toBeUndefined();
        expect(college?.admissionsHtml).toBeUndefined();
    });

    it('applies the built filter to the listing', async () => {
        await seedCollege();
        await seedCollege({ name: 'Private College', slug: 'private-college', ownership: 'Private' });

        const result = await listColleges({ ownership: ['Private'] });

        expect(result.items.map((college) => college.slug)).toEqual(['private-college']);
    });
});

describe('getCollegeBySlug', () => {
    it('finds a published college by slug', async () => {
        await seedCollege();

        expect((await getCollegeBySlug('iit-bombay'))?.name).toBe(
            'Indian Institute of Technology Bombay',
        );
    });

    it('ignores unpublished and soft-deleted rows', async () => {
        await seedCollege({ slug: 'draft-one', name: 'Draft One', status: 'draft' });
        await seedCollege({ slug: 'deleted-one', name: 'Deleted One', isDeleted: true });

        expect(await getCollegeBySlug('draft-one')).toBeNull();
        expect(await getCollegeBySlug('deleted-one')).toBeNull();
    });
});

describe('getCollegeBySlugHistory', () => {
    it('resolves a renamed college through its slug history', async () => {
        await seedCollege({
            slug: 'iit-bombay-powai',
            slugHistory: [{ slug: 'iit-bombay', changedAt: new Date() }],
        });

        const college = await getCollegeBySlugHistory('iit-bombay');

        expect(college?.slug).toBe('iit-bombay-powai');
    });

    it('returns null for a slug that was never used', async () => {
        await seedCollege();

        expect(await getCollegeBySlugHistory('some-other-slug')).toBeNull();
    });

    it('does not resolve history for an unpublished college', async () => {
        await seedCollege({
            slug: 'now-draft',
            status: 'draft',
            slugHistory: [{ slug: 'was-published', changedAt: new Date() }],
        });

        expect(await getCollegeBySlugHistory('was-published')).toBeNull();
    });
});

describe('getCollegesBySlugs', () => {
    it('returns an empty list without querying for an empty input', async () => {
        await seedCollege();

        expect(await getCollegesBySlugs([])).toEqual([]);
    });

    it('returns the requested published colleges sorted by name', async () => {
        await seedCollege({ name: 'Zeta College', slug: 'zeta' });
        await seedCollege({ name: 'Alpha College', slug: 'alpha' });

        const rows = await getCollegesBySlugs(['zeta', 'alpha']);

        expect(rows.map((college) => college.slug)).toEqual(['alpha', 'zeta']);
    });

    it('caps a comparison at four colleges', async () => {
        await Promise.all(
            Array.from({ length: 6 }, (_, index) =>
                seedCollege({ name: `Compare ${index}`, slug: `compare-${index}` }),
            ),
        );

        const rows = await getCollegesBySlugs([
            'compare-0',
            'compare-1',
            'compare-2',
            'compare-3',
            'compare-4',
            'compare-5',
        ]);

        expect(rows).toHaveLength(4);
    });

    it('skips unpublished slugs', async () => {
        await seedCollege({ name: 'Published', slug: 'published-one' });
        await seedCollege({ name: 'Draft', slug: 'draft-one', status: 'draft' });

        const rows = await getCollegesBySlugs(['published-one', 'draft-one']);

        expect(rows.map((college) => college.slug)).toEqual(['published-one']);
    });
});

describe('collegeAutocomplete', () => {
    it('matches on name, short name and aliases', async () => {
        await seedCollege({ name: 'Sardar Patel Institute', slug: 'spit', shortName: 'SPIT' });
        await seedCollege({ name: 'Somaiya Vidyavihar', slug: 'somaiya', aliases: ['KJ Somaiya'] });

        expect((await collegeAutocomplete('spit')).map((row) => row.slug)).toEqual(['spit']);
        expect((await collegeAutocomplete('kj somaiya')).map((row) => row.slug)).toEqual(['somaiya']);
    });

    it('treats a regex metacharacter in the term as a literal', async () => {
        await seedCollege();

        // Unescaped, `.*` would match every college — proving the escaping is real.
        await expect(collegeAutocomplete('.*')).resolves.toEqual([]);
    });

    it('respects the requested limit', async () => {
        await Promise.all(
            Array.from({ length: 5 }, (_, index) =>
                seedCollege({ name: `Suggest ${index}`, slug: `suggest-${index}` }),
            ),
        );

        expect(await collegeAutocomplete('Suggest', 2)).toHaveLength(2);
    });

    it('never suggests an unpublished college', async () => {
        await seedCollege({ name: 'Hidden Suggest', slug: 'hidden-suggest', status: 'draft' });

        expect(await collegeAutocomplete('Hidden')).toEqual([]);
    });
});

describe('countPublishedColleges', () => {
    it('counts published rows only', async () => {
        await seedCollege();
        await seedCollege({ name: 'Draft', slug: 'draft-count', status: 'draft' });

        expect(await countPublishedColleges()).toBe(1);
    });

    it('excludes soft-deleted rows', async () => {
        await seedCollege();
        await seedCollege({ name: 'Gone', slug: 'gone-count', isDeleted: true });

        expect(await countPublishedColleges()).toBe(1);
    });

    it('narrows the count with an extra filter', async () => {
        await seedCollege();
        await seedCollege({ name: 'Private', slug: 'private-count', ownership: 'Private' });

        expect(await countPublishedColleges({ ownership: 'Private' })).toBe(1);
    });
});

describe('adjustCollegeSavedCount', () => {
    it('increments and decrements the denormalised counter', async () => {
        const college = await seedCollege();
        const id = String(college._id);

        await adjustCollegeSavedCount(id, 1);
        expect((await College.findById(id).lean())?.savedCount).toBe(1);

        await adjustCollegeSavedCount(id, -1);
        expect((await College.findById(id).lean())?.savedCount).toBe(0);
    });

    it('leaves other colleges untouched', async () => {
        const target = await seedCollege();
        const other = await seedCollege({ name: 'Other', slug: 'other-college' });

        await adjustCollegeSavedCount(String(target._id), 1);

        expect((await College.findById(other._id).lean())?.savedCount).toBe(0);
    });
});
