import 'server-only';
import type { FilterQuery } from 'mongoose';
import {
    College,
    CollegeCourse,
    Ranking,
    type CollegeCourseDoc,
    type CollegeDoc,
    type RankingDoc,
} from '@/db/models/college.model';
import { connectToDatabase } from '@/db/connect';
import { escapeRegex } from '@/lib/utils';
import {
    aggregateLean,
    countDocs,
    distinctLean,
    findLean,
    findOneLean,
    listSlugRows,
    paginate,
    type SlugRow,
} from './base.repository';
import type { Paginated } from '@/types/common';

const PUBLISHED = { status: 'published' as const };

/** Published, indexable and not soft-deleted — what the sitemap may advertise. */
const SITEMAP_FILTER = {
    status: 'published',
    isDeleted: { $ne: true },
    'seo.noIndex': { $ne: true },
} as const;

export const COLLEGE_CARD_PROJECTION = {
    name: 1,
    slug: 1,
    shortName: 1,
    logo: 1,
    banner: 1,
    cityName: 1,
    stateName: 1,
    ownership: 1,
    establishedYear: 1,
    approvals: 1,
    accreditation: 1,
    'feeRange.min': 1,
    'feeRange.max': 1,
    'rating.overall': 1,
    'rating.count': 1,
    'ranking.nirfOverall': 1,
    'ranking.nirfCategory': 1,
    'ranking.nirfCategoryName': 1,
    'placement.averagePackage': 1,
    'placement.highestPackage': 1,
    'placement.placementPercentage': 1,
    hostelAvailable: 1,
    isFeatured: 1,
    isVerified: 1,
    description: 1,
} as const;

/**
 * Repository-level filters. Callers pass resolved ids, not slugs: slug lookup is
 * the service's job (`resolveCollegeFilters`), which keeps this layer free of a
 * second round-trip and makes an unknown slug an explicit decision up there.
 */
export interface CollegeListFilters {
    q?: string;
    stateId?: string;
    cityId?: string;
    courseId?: string;
    categoryId?: string;
    examId?: string;
    ownership?: string[];
    approval?: string[];
    accreditation?: string[];
    rankingMax?: number;
    feeMin?: number;
    feeMax?: number;
    studyMode?: string;
    ratingMin?: number;
    hostel?: boolean;
    placementMin?: number;
    featured?: boolean;
    page?: number;
    pageSize?: number;
    sort?: string;
}

const COLLEGE_SORTS: Record<string, Record<string, 1 | -1>> = {
    relevance: { isFeatured: -1, 'ranking.nirfOverall': 1, 'rating.overall': -1 },
    ranking: { 'ranking.nirfOverall': 1 },
    rating: { 'rating.overall': -1, 'rating.count': -1 },
    'fee-low': { 'feeRange.min': 1 },
    'fee-high': { 'feeRange.min': -1 },
    'name-asc': { name: 1 },
    placement: { 'placement.averagePackage': -1 },
    newest: { publishedAt: -1 },
};

export function buildCollegeFilter(filters: CollegeListFilters): FilterQuery<CollegeDoc> {
    const filter: FilterQuery<CollegeDoc> = { ...PUBLISHED };

    if (filters.q) {
        const rx = new RegExp(escapeRegex(filters.q), 'i');
        filter.$or = [{ name: rx }, { shortName: rx }, { cityName: rx }, { stateName: rx }, { aliases: rx }];
    }
    if (filters.stateId) filter.state = filters.stateId;
    if (filters.cityId) filter.city = filters.cityId;
    if (filters.courseId) filter.courses = filters.courseId;
    if (filters.categoryId) filter.categories = filters.categoryId;
    if (filters.examId) filter.examsAccepted = filters.examId;
    if (filters.ownership?.length) filter.ownership = { $in: filters.ownership };
    if (filters.approval?.length) filter.approvals = { $in: filters.approval };
    if (filters.accreditation?.length) filter.accreditation = { $in: filters.accreditation };
    if (filters.rankingMax) filter['ranking.nirfOverall'] = { $lte: filters.rankingMax, $gt: 0 };
    if (filters.studyMode) filter.studyModes = filters.studyMode;
    if (filters.ratingMin) filter['rating.overall'] = { $gte: filters.ratingMin };
    if (filters.hostel) filter.hostelAvailable = true;
    if (filters.placementMin) filter['placement.placementPercentage'] = { $gte: filters.placementMin };
    if (filters.featured) filter.isFeatured = true;

    if (filters.feeMin !== undefined || filters.feeMax !== undefined) {
        filter['feeRange.min'] = {
            ...(filters.feeMin !== undefined ? { $gte: filters.feeMin } : {}),
            ...(filters.feeMax !== undefined ? { $lte: filters.feeMax } : {}),
        };
    }

    return filter;
}

export async function listColleges(filters: CollegeListFilters): Promise<Paginated<CollegeDoc>> {
    return paginate<CollegeDoc>(College, {
        filter: buildCollegeFilter(filters),
        page: filters.page,
        pageSize: filters.pageSize,
        sort: COLLEGE_SORTS[filters.sort ?? 'relevance'] ?? COLLEGE_SORTS.relevance,
        projection: COLLEGE_CARD_PROJECTION,
    });
}

export async function getCollegeBySlug(slug: string): Promise<CollegeDoc | null> {
    return findOneLean<CollegeDoc>(
        College,
        { slug, status: 'published' },
        {
            populate: [
                { path: 'examsAccepted', select: 'name shortName slug' },
                { path: 'categories', select: 'name slug icon themeColor' },
            ],
        },
    );
}

export async function getCollegeBySlugHistory(slug: string): Promise<CollegeDoc | null> {
    return findOneLean<CollegeDoc>(College, { 'slugHistory.slug': slug, status: 'published' });
}

export async function getCollegesBySlugs(slugs: string[]): Promise<CollegeDoc[]> {
    if (slugs.length === 0) return [];
    return findLean<CollegeDoc>(
        College,
        { slug: { $in: slugs.slice(0, 4) }, status: 'published' },
        { limit: 4, sort: { name: 1 } },
    );
}

export async function listFeaturedColleges(limit = 6): Promise<CollegeDoc[]> {
    return findLean<CollegeDoc>(
        College,
        { ...PUBLISHED, isFeatured: true },
        {
            sort: { displayOrder: 1, 'ranking.nirfOverall': 1 },
            limit,
            projection: COLLEGE_CARD_PROJECTION,
        },
    );
}

export async function listSimilarColleges(
    college: Pick<CollegeDoc, '_id' | 'state' | 'categories'>,
    limit = 6,
): Promise<CollegeDoc[]> {
    return findLean<CollegeDoc>(
        College,
        {
            ...PUBLISHED,
            _id: { $ne: college._id },
            $or: [{ state: college.state }, { categories: { $in: college.categories ?? [] } }],
        },
        { sort: { 'rating.overall': -1 }, limit, projection: COLLEGE_CARD_PROJECTION },
    );
}

export async function collegeAutocomplete(term: string, limit = 6): Promise<CollegeDoc[]> {
    const rx = new RegExp(`${escapeRegex(term)}`, 'i');
    return findLean<CollegeDoc>(
        College,
        { ...PUBLISHED, $or: [{ name: rx }, { shortName: rx }, { aliases: rx }] },
        {
            sort: { isFeatured: -1, 'rating.overall': -1 },
            limit,
            projection: {
                name: 1,
                slug: 1,
                shortName: 1,
                cityName: 1,
                stateName: 1,
                logo: 1,
                ownership: 1,
                'rating.overall': 1,
                'feeRange.min': 1,
            },
        },
    );
}

export async function countPublishedColleges(filter: FilterQuery<CollegeDoc> = {}): Promise<number> {
    return countDocs(College, { ...PUBLISHED, ...filter });
}

/**
 * Indexable college slugs for the sitemap, most recently updated first.
 * `noIndex` rows are excluded so the sitemap never advertises a page that asks
 * crawlers to stay away.
 */
export async function listCollegeSitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<CollegeDoc>(College, SITEMAP_FILTER, { limit });
}

/** Ownership facet counts for the college filter panel. */
export async function aggregateCollegeOwnershipCounts(): Promise<{ _id: string; count: number }[]> {
    return aggregateLean<{ _id: string; count: number }>(College, [
        { $match: { status: 'published', isDeleted: { $ne: true } } },
        { $group: { _id: '$ownership', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
}

/** Ids for a set of slugs, used when persisting a comparison. */
export async function listCollegeIdsBySlugs(slugs: string[]): Promise<unknown[]> {
    if (slugs.length === 0) return [];
    const rows = await findLean<CollegeDoc>(
        College,
        { slug: { $in: slugs } },
        { projection: { _id: 1 }, limit: slugs.length, sort: { name: 1 } },
    );
    return rows.map((row) => row._id);
}

/** Bumps the "added to a comparison" counter for every college in a comparison. */
export async function incrementCollegeCompareCounts(slugs: string[]): Promise<void> {
    if (slugs.length === 0) return;
    await connectToDatabase();
    await College.updateMany({ slug: { $in: slugs } }, { $inc: { compareCount: 1 } }).exec();
}

/** Best-effort page-view counter. */
export async function incrementCollegeViewCount(id: string): Promise<void> {
    await connectToDatabase();
    await College.updateOne({ _id: id }, { $inc: { viewCount: 1 } }).exec();
}

/** Denormalised name for a slug, for the CRM fields on a lead. */
export async function findCollegeNameBySlug(
    slug: string,
): Promise<Pick<CollegeDoc, '_id' | 'name'> | null> {
    return findOneLean<CollegeDoc>(College, { slug }, { projection: { name: 1 } });
}

/* ----------------------------- college courses --------------------------- */

export async function listCollegeCourses(
    collegeId: string,
    limit = 100,
): Promise<CollegeCourseDoc[]> {
    return findLean<CollegeCourseDoc>(
        CollegeCourse,
        { college: collegeId, status: 'active' },
        { sort: { level: 1, courseName: 1 }, limit },
    );
}

/** How many active programmes a college lists. */
export async function countActiveCollegeCourses(collegeId: unknown): Promise<number> {
    // Counted in the database rather than by fetching rows and reading `.length`:
    // the comparison page only needs the integer, and the old form pulled up to
    // 200 full documents per college over the wire to produce it.
    return countDocs<CollegeCourseDoc>(CollegeCourse, {
        college: collegeId,
        status: 'active',
    } as FilterQuery<CollegeCourseDoc>);
}

/**
 * Ids of every course at least one college actively offers.
 * The sitemap uses it so `/colleges/course/[slug]` is only published for courses
 * that will render a non-empty page.
 */
export async function distinctOfferedCourseIds(): Promise<unknown[]> {
    return distinctLean<CollegeCourseDoc, unknown>(CollegeCourse, 'course', { status: 'active' });
}

export async function listCollegesOfferingCourse(
    courseId: string,
    args: { page?: number; pageSize?: number; sort?: string } = {},
): Promise<Paginated<CollegeCourseDoc>> {
    return paginate<CollegeCourseDoc>(CollegeCourse, {
        filter: { course: courseId, status: 'active' },
        page: args.page,
        pageSize: args.pageSize,
        sort: args.sort === 'fee-low' ? { annualFee: 1 } : { annualFee: -1 },
    });
}

/* --------------------------------- rankings ------------------------------ */

export async function listCollegeRankings(collegeId: string): Promise<RankingDoc[]> {
    return findLean<RankingDoc>(
        Ranking,
        { college: collegeId, status: 'active' },
        { sort: { year: -1, rank: 1 }, limit: 20 },
    );
}

/* ------------------------- admin counts & recency ------------------------ */

export async function countColleges(filter: FilterQuery<CollegeDoc> = {}): Promise<number> {
    return countDocs(College, filter);
}

export async function listRecentlyUpdatedColleges(limit = 5): Promise<CollegeDoc[]> {
    return findLean<CollegeDoc>(
        College,
        {},
        {
            sort: { updatedAt: -1 },
            limit,
            projection: { name: 1, slug: 1, status: 1, updatedAt: 1 },
        },
    );
}

/** Keeps the denormalised shortlist counter in step with SavedItem rows. */
export async function adjustCollegeSavedCount(collegeId: string, delta: 1 | -1): Promise<void> {
    await connectToDatabase();
    await College.updateOne({ _id: collegeId }, { $inc: { savedCount: delta } }).exec();
}

/**
 * Minimal identity lookup by id, including unpublished colleges.
 * Review submission needs the denormalised name/slug it stamps on the review.
 */
export async function findCollegeIdentity(
    id: string,
): Promise<Pick<CollegeDoc, '_id' | 'name' | 'slug'> | null> {
    return findOneLean<CollegeDoc>(College, { _id: id }, { projection: { name: 1, slug: 1 } });
}

export interface CollegeRatingValues {
    overall: number;
    placement: number;
    faculty: number;
    infrastructure: number;
    campusLife: number;
    valueForMoney: number;
    count: number;
}

/** Writes the denormalised rating block recomputed from approved reviews. */
export async function setCollegeRating(
    collegeId: string,
    rating: CollegeRatingValues,
): Promise<void> {
    await connectToDatabase();
    await College.updateOne({ _id: collegeId }, { $set: { rating } }).exec();
}
