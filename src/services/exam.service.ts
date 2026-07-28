import 'server-only';
import { cache } from 'react';
import {
    getExamBySlug,
    listExamDates,
    listExams,
    type ExamListFilters,
} from '@/db/repositories/exam.repository';
import { listColleges } from '@/db/repositories/college.repository';
import { listArticlesForEntity, listResourcesForExam, listTrendingUpdates } from '@/db/repositories/content.repository';
import { listPredictors } from '@/db/repositories/predictor.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { EXAM_CATEGORIES, EXAM_LEVELS, EXAM_MODES } from '@/config/constants';
import { CACHE_TAGS, CACHE_TTL, cached, reviveDates } from '@/lib/cache';
import type { FilterGroup } from '@/components/shared/filter-panel';
import type { ExamDoc } from '@/db/models/exam.model';
import type { Paginated, SortOption } from '@/types/common';

export const EXAM_SORTS: SortOption[] = [
    { label: 'Recommended', value: 'default' },
    { label: 'Upcoming first', value: 'upcoming' },
    { label: 'Most viewed', value: 'popular' },
    { label: 'Name A–Z', value: 'name-asc' },
];

export interface ExamSearchParams {
    q?: string;
    category?: string;
    level?: string;
    mode?: string;
    year?: string;
    sort?: string;
    page?: string;
}

export function resolveExamFilters(params: ExamSearchParams): ExamListFilters {
    return {
        q: params.q?.slice(0, 80),
        category:
            params.category && (EXAM_CATEGORIES as readonly string[]).includes(params.category)
                ? params.category
                : undefined,
        level: params.level && (EXAM_LEVELS as readonly string[]).includes(params.level) ? params.level : undefined,
        mode: params.mode && (EXAM_MODES as readonly string[]).includes(params.mode) ? params.mode : undefined,
        year: Number(params.year) || undefined,
        sort: params.sort,
        page: Number(params.page) || 1,
        pageSize: 12,
    };
}

export async function searchExams(filters: ExamListFilters): Promise<Paginated<ExamDoc>> {
    return toPlain(await listExams(filters));
}

export const buildExamFilterGroups = cached(
    async (): Promise<FilterGroup[]> => [
        {
            key: 'category',
            label: 'Category',
            type: 'radio',
            options: EXAM_CATEGORIES.map((c) => ({ label: c, value: c })),
        },
        { key: 'level', label: 'Level', type: 'checkbox', options: EXAM_LEVELS.map((l) => ({ label: l, value: l })) },
        { key: 'mode', label: 'Mode', type: 'radio', options: EXAM_MODES.map((m) => ({ label: m, value: m })) },
    ],
    ['exam-filter-groups'],
    { tags: [CACHE_TAGS.exams], revalidate: CACHE_TTL.day },
);

/**
 * Detail payload shared by /exams/[slug] and its sub-routes.
 *
 * The heaviest detail loader on the site: eight reads, and the seven related ones
 * cannot start until the exam document resolves. Cached for the same reason as the
 * college and course equivalents, with `news` in the tag list because the payload
 * embeds trending updates.
 */
const loadExamDetail = cached(
    async (slug: string) => {
        const exam = await getExamBySlug(slug);
        if (!exam) return null;

        const [dates, colleges, papers, mocks, articles, updates, predictors] = await Promise.all([
            listExamDates(String(exam._id)),
            listColleges({ examId: String(exam._id), pageSize: 10, sort: 'ranking' }),
            listResourcesForExam(String(exam._id), 'previous_year_paper', 6),
            listResourcesForExam(String(exam._id), 'mock_test', 4),
            listArticlesForEntity('relatedExams', String(exam._id), 4),
            listTrendingUpdates({ limit: 6 }),
            listPredictors({ limit: 24 }),
        ]);

        const examPredictors = predictors.filter(
            (p) => p.examShortName === exam.shortName || String(p.exam) === String(exam._id),
        );

        return toPlain({
            exam,
            dates,
            colleges,
            papers,
            mocks,
            articles,
            updates,
            predictors: examPredictors,
        });
    },
    ['exam-detail'],
    {
        tags: [CACHE_TAGS.exams, CACHE_TAGS.news, CACHE_TAGS.predictors],
        revalidate: CACHE_TTL.medium,
    },
);

export const getExamDetail = cache(async (slug: string) => reviveDates(await loadExamDetail(slug)));
