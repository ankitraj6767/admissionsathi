import 'server-only';
import { cache } from 'react';
import {
    getCourseBySlug,
    getCourseBySlugHistory,
    getCourseCategoryBySlug,
    listCourseCategories,
    listCourses,
    listRelatedCourses,
    listSpecializations,
    type CourseListFilters,
} from '@/db/repositories/course.repository';
import { listCollegesOfferingCourse } from '@/db/repositories/college.repository';
import { listArticlesForEntity } from '@/db/repositories/content.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { Exam } from '@/db/models/exam.model';
import { COURSE_LEVELS, STUDY_MODES } from '@/config/constants';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import type { FilterGroup } from '@/components/shared/filter-panel';
import type { CourseDoc } from '@/db/models/course.model';
import type { Paginated, SortOption } from '@/types/common';

export const COURSE_SORTS: SortOption[] = [
    { label: 'Recommended', value: 'default' },
    { label: 'Most colleges', value: 'colleges' },
    { label: 'Fees: low to high', value: 'fee-low' },
    { label: 'Fees: high to low', value: 'fee-high' },
    { label: 'Name A–Z', value: 'name-asc' },
];

export interface CourseSearchParams {
    q?: string;
    category?: string;
    level?: string;
    mode?: string;
    duration?: string;
    exam?: string;
    feeMax?: string;
    sort?: string;
    page?: string;
}

export async function resolveCourseFilters(
    params: CourseSearchParams,
    overrides: Partial<CourseListFilters> = {},
): Promise<CourseListFilters> {
    const exam = params.exam
        ? await Exam.findOne({ slug: params.exam }).select('_id').lean().exec()
        : null;

    const numeric = (value?: string) => {
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? n : undefined;
    };

    return {
        q: params.q?.slice(0, 80),
        categorySlug: params.category,
        level: params.level && (COURSE_LEVELS as readonly string[]).includes(params.level) ? params.level : undefined,
        studyMode: params.mode && (STUDY_MODES as readonly string[]).includes(params.mode) ? params.mode : undefined,
        durationMax: numeric(params.duration),
        examId: exam ? String(exam._id) : undefined,
        feeMax: numeric(params.feeMax),
        sort: params.sort,
        page: Number(params.page) || 1,
        pageSize: 12,
        ...overrides,
    };
}

export async function searchCourses(filters: CourseListFilters): Promise<Paginated<CourseDoc>> {
    return toPlain(await listCourses(filters));
}

export const buildCourseFilterGroups = cached(
    async (): Promise<FilterGroup[]> => {
        const [categories, exams] = await Promise.all([
            listCourseCategories({ limit: 12 }),
            Exam.find({ status: 'published' }).select('shortName slug').limit(20).lean().exec(),
        ]);

        return [
            {
                key: 'category',
                label: 'Stream',
                type: 'radio',
                options: categories.map((c) => ({ label: c.name, value: c.slug, count: c.courseCount })),
            },
            {
                key: 'level',
                label: 'Level',
                type: 'checkbox',
                options: COURSE_LEVELS.map((l) => ({ label: l, value: l })),
            },
            {
                key: 'mode',
                label: 'Study mode',
                type: 'radio',
                options: STUDY_MODES.map((m) => ({ label: m, value: m })),
            },
            {
                key: 'duration',
                label: 'Maximum duration',
                type: 'select',
                options: [
                    { label: 'Up to 1 year', value: '12' },
                    { label: 'Up to 2 years', value: '24' },
                    { label: 'Up to 3 years', value: '36' },
                    { label: 'Up to 4 years', value: '48' },
                    { label: 'Up to 5 years', value: '60' },
                ],
            },
            {
                key: 'exam',
                label: 'Entrance exam',
                type: 'select',
                options: exams.map((e) => ({ label: e.shortName, value: e.slug })),
            },
            {
                key: 'feeMax',
                label: 'Maximum fee (₹)',
                type: 'select',
                options: [
                    { label: 'Under ₹50,000', value: '50000' },
                    { label: 'Under ₹1 Lakh', value: '100000' },
                    { label: 'Under ₹3 Lakh', value: '300000' },
                    { label: 'Under ₹10 Lakh', value: '1000000' },
                ],
            },
        ];
    },
    ['course-filter-groups'],
    { tags: [CACHE_TAGS.courses], revalidate: CACHE_TTL.long },
);

/** Detail payload for /courses/[slug] and its sub-routes. */
export const getCourseDetail = cache(async (slug: string) => {
    const course = await getCourseBySlug(slug);
    if (!course) {
        const legacy = await getCourseBySlugHistory(slug);
        return legacy ? { redirectTo: legacy.slug as string } : null;
    }

    const [specializations, colleges, related, articles] = await Promise.all([
        listSpecializations(String(course._id)),
        listCollegesOfferingCourse(String(course._id), { pageSize: 10, sort: 'fee-low' }),
        listRelatedCourses(course, 6),
        listArticlesForEntity('relatedCourses', String(course._id), 4),
    ]);

    return toPlain({ course, specializations, colleges, related, articles });
});

export const getCategoryDetail = cache(async (slug: string) => {
    const category = await getCourseCategoryBySlug(slug);
    if (!category) return null;
    const courses = await listCourses({ categoryId: String(category._id), pageSize: 24 });
    return toPlain({ category, courses });
});
