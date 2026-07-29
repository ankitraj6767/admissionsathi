import 'server-only';
import type { FilterQuery } from 'mongoose';
import {
    Course,
    CourseCategory,
    Specialization,
    type CourseCategoryDoc,
    type CourseDoc,
    type SpecializationDoc,
} from '@/db/models/course.model';
import { connectToDatabase } from '@/db/connect';
import { escapeRegex } from '@/lib/utils';
import {
    countDocs,
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

/** Same rule for collections that use the `active` status enum. */
const ACTIVE_SITEMAP_FILTER = {
    status: 'active',
    isDeleted: { $ne: true },
    'seo.noIndex': { $ne: true },
} as const;

export const COURSE_CARD_PROJECTION = {
    name: 1,
    slug: 1,
    shortName: 1,
    categoryName: 1,
    category: 1,
    level: 1,
    durationLabel: 1,
    studyModes: 1,
    averageFee: 1,
    averageSalary: 1,
    collegeCount: 1,
    icon: 1,
    themeColor: 1,
    heroImage: 1,
    isFeatured: 1,
    overview: 1,
} as const;

/* ------------------------------- categories ------------------------------ */

export async function listCourseCategories(options?: {
    featuredOnly?: boolean;
    limit?: number;
    slugs?: string[];
}): Promise<CourseCategoryDoc[]> {
    const filter: FilterQuery<CourseCategoryDoc> = { status: 'active' };
    if (options?.featuredOnly) filter.isFeatured = true;
    if (options?.slugs?.length) filter.slug = { $in: options.slugs };

    return findLean<CourseCategoryDoc>(CourseCategory, filter, {
        sort: { displayOrder: 1 },
        limit: options?.limit ?? 20,
    });
}

export async function getCourseCategoryBySlug(slug: string): Promise<CourseCategoryDoc | null> {
    return findOneLean<CourseCategoryDoc>(CourseCategory, { slug, status: 'active' });
}

/* -------------------------------- courses -------------------------------- */

export interface CourseListFilters {
    q?: string;
    categorySlug?: string;
    categoryId?: string;
    level?: string;
    studyMode?: string;
    durationMax?: number;
    examSlug?: string;
    examId?: string;
    specialization?: string;
    feeMax?: number;
    featured?: boolean;
    page?: number;
    pageSize?: number;
    sort?: string;
}

const COURSE_SORTS: Record<string, Record<string, 1 | -1>> = {
    popular: { viewCount: -1, collegeCount: -1 },
    colleges: { collegeCount: -1 },
    'fee-low': { 'averageFee.min': 1 },
    'fee-high': { 'averageFee.min': -1 },
    'name-asc': { name: 1 },
    newest: { publishedAt: -1 },
    default: { displayOrder: 1, isFeatured: -1, collegeCount: -1 },
};

export async function listCourses(filters: CourseListFilters): Promise<Paginated<CourseDoc>> {
    const filter: FilterQuery<CourseDoc> = { ...PUBLISHED };

    if (filters.q) {
        const rx = new RegExp(escapeRegex(filters.q), 'i');
        filter.$or = [{ name: rx }, { shortName: rx }, { categoryName: rx }];
    }
    if (filters.categoryId) filter.category = filters.categoryId;
    if (filters.categorySlug && !filters.categoryId) {
        const category = await getCourseCategoryBySlug(filters.categorySlug);
        if (!category) {
            return { items: [], page: 1, pageSize: 12, total: 0, totalPages: 1, hasNext: false, hasPrev: false };
        }
        filter.category = category._id;
    }
    if (filters.level) filter.level = filters.level;
    if (filters.studyMode) filter.studyModes = filters.studyMode;
    if (filters.durationMax) filter.durationMonths = { $lte: filters.durationMax };
    if (filters.examId) filter.entranceExams = filters.examId;
    if (filters.feeMax) filter['averageFee.min'] = { $lte: filters.feeMax };
    if (filters.featured) filter.isFeatured = true;

    return paginate<CourseDoc>(Course, {
        filter,
        page: filters.page,
        pageSize: filters.pageSize,
        sort: COURSE_SORTS[filters.sort ?? 'default'] ?? COURSE_SORTS.default,
        projection: COURSE_CARD_PROJECTION,
    });
}

export async function getCourseBySlug(slug: string): Promise<CourseDoc | null> {
    return findOneLean<CourseDoc>(
        Course,
        { slug, status: 'published' },
        {
            populate: [
                { path: 'entranceExams', select: 'name shortName slug examYear', options: { limit: 12 } },
                { path: 'category', select: 'name slug icon themeColor' },
            ],
        },
    );
}

export async function getCourseBySlugHistory(slug: string): Promise<CourseDoc | null> {
    return findOneLean<CourseDoc>(Course, { 'slugHistory.slug': slug, status: 'published' });
}

export async function listFeaturedCourses(limit = 8): Promise<CourseDoc[]> {
    return findLean<CourseDoc>(
        Course,
        { ...PUBLISHED, isFeatured: true },
        { sort: { displayOrder: 1 }, limit, projection: COURSE_CARD_PROJECTION },
    );
}

export async function listCoursesByCategory(
    categoryId: string,
    limit = 8,
): Promise<CourseDoc[]> {
    return findLean<CourseDoc>(
        Course,
        { ...PUBLISHED, category: categoryId },
        { sort: { collegeCount: -1 }, limit, projection: COURSE_CARD_PROJECTION },
    );
}

export async function listRelatedCourses(
    course: Pick<CourseDoc, '_id' | 'category'>,
    limit = 6,
): Promise<CourseDoc[]> {
    return findLean<CourseDoc>(
        Course,
        { ...PUBLISHED, category: course.category, _id: { $ne: course._id } },
        { sort: { collegeCount: -1 }, limit, projection: COURSE_CARD_PROJECTION },
    );
}

export async function countPublishedCourses(): Promise<number> {
    return countDocs(Course, PUBLISHED);
}

/** Indexable course slugs for the sitemap, most recently updated first. */
export async function listCourseSitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<CourseDoc>(Course, SITEMAP_FILTER as FilterQuery<CourseDoc>, { limit });
}

/** Indexable course category slugs for the sitemap. */
export async function listCourseCategorySitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<CourseCategoryDoc>(
        CourseCategory,
        ACTIVE_SITEMAP_FILTER as FilterQuery<CourseCategoryDoc>,
        { limit },
    );
}

/**
 * Slugs for a known set of course ids, in natural collection order.
 * The sitemap uses it to publish `/colleges/course/[slug]` only for courses a
 * college actually offers.
 */
export async function listCourseSlugsByIds(ids: unknown[], limit: number): Promise<string[]> {
    if (ids.length === 0) return [];
    await connectToDatabase();
    const rows = (await Course.find({ _id: { $in: ids }, ...SITEMAP_FILTER } as FilterQuery<CourseDoc>)
        .select({ slug: 1 })
        .limit(limit)
        .lean()
        .exec()) as { slug?: string }[];
    return rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug));
}

/**
 * Published courses for a set of ids, with just enough fields to render a
 * directory tile. Used by `/scholarships/course` so the index only links to
 * courses that actually have a scholarship mapped to them.
 */
export async function listCourseOptionsByIds(ids: unknown[], limit = 200): Promise<CourseDoc[]> {
    if (ids.length === 0) return [];
    return findLean<CourseDoc>(
        Course,
        { _id: { $in: ids }, ...SITEMAP_FILTER } as FilterQuery<CourseDoc>,
        {
            sort: { displayOrder: 1, name: 1 },
            limit,
            projection: { name: 1, shortName: 1, slug: 1, categoryName: 1, level: 1 },
        },
    );
}

/** Best-effort page-view counter. */
export async function incrementCourseViewCount(id: string): Promise<void> {
    await connectToDatabase();
    await Course.updateOne({ _id: id }, { $inc: { viewCount: 1 } }).exec();
}

/** Resolves a course slug to its id, for filter params that arrive as slugs. */
export async function findCourseIdBySlug(slug: string): Promise<string | null> {
    const course = await findOneLean<CourseDoc>(Course, { slug }, { projection: { _id: 1 } });
    return course ? String(course._id) : null;
}

/**
 * Course identity from either a slug or an id — public forms send whichever the
 * caller had. Casting an invalid id throws, so callers guard the call.
 */
export async function findCourseBySlugOrId(
    value: string,
): Promise<Pick<CourseDoc, '_id' | 'name'> | null> {
    return findOneLean<CourseDoc>(
        Course,
        { $or: [{ slug: value }, { _id: value }] } as FilterQuery<CourseDoc>,
        { projection: { name: 1 } },
    );
}

export async function courseAutocomplete(term: string, limit = 6): Promise<CourseDoc[]> {
    const rx = new RegExp(`^${escapeRegex(term)}|\\b${escapeRegex(term)}`, 'i');
    return findLean<CourseDoc>(
        Course,
        { ...PUBLISHED, $or: [{ name: rx }, { shortName: rx }] },
        { sort: { collegeCount: -1 }, limit, projection: { name: 1, slug: 1, categoryName: 1, level: 1 } },
    );
}

/* ----------------------------- specializations --------------------------- */

export async function listSpecializations(
    courseId: string,
    limit = 40,
): Promise<SpecializationDoc[]> {
    return findLean<SpecializationDoc>(
        Specialization,
        { course: courseId, status: 'active' },
        { sort: { displayOrder: 1 }, limit },
    );
}

export async function getSpecializationBySlug(
    courseId: string,
    slug: string,
): Promise<SpecializationDoc | null> {
    return findOneLean<SpecializationDoc>(Specialization, { course: courseId, slug });
}
