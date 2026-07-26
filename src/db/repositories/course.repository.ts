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
import { escapeRegex } from '@/lib/utils';
import { countDocs, findLean, findOneLean, paginate } from './base.repository';
import type { Paginated } from '@/types/common';

const PUBLISHED = { status: 'published' as const };

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
