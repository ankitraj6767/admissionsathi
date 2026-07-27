import 'server-only';
import type { FilterQuery } from 'mongoose';
import { Exam, ExamDate, type ExamDateDoc, type ExamDoc } from '@/db/models/exam.model';
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

export const EXAM_CARD_PROJECTION = {
    name: 1,
    shortName: 1,
    slug: 1,
    conductingBody: 1,
    level: 1,
    category: 1,
    mode: 1,
    examYear: 1,
    registrationStart: 1,
    registrationEnd: 1,
    examDateFrom: 1,
    examDateTo: 1,
    resultDate: 1,
    logo: 1,
    acceptedByCollegeCount: 1,
    predictorEnabled: 1,
    isFeatured: 1,
} as const;

export interface ExamListFilters {
    q?: string;
    category?: string;
    level?: string;
    mode?: string;
    year?: number;
    featured?: boolean;
    page?: number;
    pageSize?: number;
    sort?: string;
}

const EXAM_SORTS: Record<string, Record<string, 1 | -1>> = {
    default: { isFeatured: -1, displayOrder: 1, shortName: 1 },
    upcoming: { examDateFrom: 1 },
    popular: { viewCount: -1 },
    'name-asc': { shortName: 1 },
};

export async function listExams(filters: ExamListFilters): Promise<Paginated<ExamDoc>> {
    const filter: FilterQuery<ExamDoc> = { ...PUBLISHED };
    if (filters.q) {
        const rx = new RegExp(escapeRegex(filters.q), 'i');
        filter.$or = [{ name: rx }, { shortName: rx }, { conductingBody: rx }];
    }
    if (filters.category) filter.category = filters.category;
    if (filters.level) filter.level = filters.level;
    if (filters.mode) filter.mode = filters.mode;
    if (filters.year) filter.examYear = filters.year;
    if (filters.featured) filter.isFeatured = true;

    return paginate<ExamDoc>(Exam, {
        filter,
        page: filters.page,
        pageSize: filters.pageSize,
        sort: EXAM_SORTS[filters.sort ?? 'default'] ?? EXAM_SORTS.default,
        projection: EXAM_CARD_PROJECTION,
    });
}

export async function getExamBySlug(slug: string): Promise<ExamDoc | null> {
    return findOneLean<ExamDoc>(
        Exam,
        { slug, status: 'published' },
        { populate: [{ path: 'relatedCourses', select: 'name slug level' }] },
    );
}

export async function listExamDates(examId: string): Promise<ExamDateDoc[]> {
    return findLean<ExamDateDoc>(
        ExamDate,
        { exam: examId, status: 'active' },
        { sort: { startDate: 1, displayOrder: 1 }, limit: 60 },
    );
}

export async function listUpcomingExamDates(limit = 8): Promise<ExamDateDoc[]> {
    return findLean<ExamDateDoc>(
        ExamDate,
        { status: 'active', startDate: { $gte: new Date() } },
        { sort: { startDate: 1 }, limit },
    );
}

export async function listFeaturedExams(limit = 8): Promise<ExamDoc[]> {
    return findLean<ExamDoc>(
        Exam,
        { ...PUBLISHED, isFeatured: true },
        { sort: { displayOrder: 1 }, limit, projection: EXAM_CARD_PROJECTION },
    );
}

export async function examAutocomplete(term: string, limit = 6): Promise<ExamDoc[]> {
    const rx = new RegExp(escapeRegex(term), 'i');
    return findLean<ExamDoc>(
        Exam,
        { ...PUBLISHED, $or: [{ name: rx }, { shortName: rx }] },
        { sort: { isFeatured: -1 }, limit, projection: { name: 1, shortName: 1, slug: 1, category: 1, examYear: 1 } },
    );
}

export async function countPublishedExams(): Promise<number> {
    return countDocs(Exam, PUBLISHED);
}

/** Indexable exam slugs for the sitemap, most recently updated first. */
export async function listExamSitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<ExamDoc>(Exam, SITEMAP_FILTER as FilterQuery<ExamDoc>, { limit });
}

/** Best-effort page-view counter. */
export async function incrementExamViewCount(id: string): Promise<void> {
    await connectToDatabase();
    await Exam.updateOne({ _id: id }, { $inc: { viewCount: 1 } }).exec();
}

/** Short name + slug pairs for the exam picker in a filter panel. */
export interface ExamOptionRow {
    shortName: string;
    slug: string;
}

/**
 * Published exams reduced to picker options.
 *
 * `sort` is explicit because the college filter panel lists them in the curated
 * display order while the course filter panel keeps the collection's own order.
 */
export async function listPublishedExamOptions(
    options: { limit?: number; sort?: Record<string, 1 | -1> } = {},
): Promise<ExamOptionRow[]> {
    await connectToDatabase();
    const query = Exam.find(PUBLISHED).select('shortName slug');
    if (options.sort) query.sort(options.sort);
    return query
        .limit(options.limit ?? 20)
        .lean<ExamOptionRow[]>()
        .exec();
}

/** Resolves an exam slug to its id, for filter params that arrive as slugs. */
export async function findExamIdBySlug(slug: string): Promise<string | null> {
    const exam = await findOneLean<ExamDoc>(Exam, { slug }, { projection: { _id: 1 } });
    return exam ? String(exam._id) : null;
}

/** Denormalised name for a slug, for the CRM fields on a lead. */
export async function findExamNameBySlug(
    slug: string,
): Promise<Pick<ExamDoc, '_id' | 'name'> | null> {
    return findOneLean<ExamDoc>(Exam, { slug }, { projection: { name: 1 } });
}

export async function listExamsByIds(ids: string[]): Promise<ExamDoc[]> {
    if (!ids.length) return [];
    return findLean<ExamDoc>(Exam, { _id: { $in: ids } }, { projection: EXAM_CARD_PROJECTION, limit: 20 });
}
