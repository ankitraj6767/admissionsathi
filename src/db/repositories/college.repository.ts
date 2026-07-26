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
import { escapeRegex } from '@/lib/utils';
import { countDocs, findLean, findOneLean, paginate } from './base.repository';
import type { Paginated } from '@/types/common';

const PUBLISHED = { status: 'published' as const };

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

export interface CollegeListFilters {
    q?: string;
    stateSlug?: string;
    stateId?: string;
    citySlug?: string;
    cityId?: string;
    courseId?: string;
    courseSlug?: string;
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
