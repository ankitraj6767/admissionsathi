import 'server-only';
import type { FilterQuery } from 'mongoose';
import { Exam, ExamDate, type ExamDateDoc, type ExamDoc } from '@/db/models/exam.model';
import { escapeRegex } from '@/lib/utils';
import { countDocs, findLean, findOneLean, paginate } from './base.repository';
import type { Paginated } from '@/types/common';

const PUBLISHED = { status: 'published' as const };

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

export async function listExamsByIds(ids: string[]): Promise<ExamDoc[]> {
    if (!ids.length) return [];
    return findLean<ExamDoc>(Exam, { _id: { $in: ids } }, { projection: EXAM_CARD_PROJECTION, limit: 20 });
}
