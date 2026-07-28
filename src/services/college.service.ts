import 'server-only';
import { cache } from 'react';
import {
    aggregateCollegeOwnershipCounts,
    buildCollegeFilter,
    countColleges,
    getCollegeBySlug,
    getCollegeBySlugHistory,
    listColleges,
    listCollegeCourses,
    listCollegeRankings,
    listSimilarColleges,
    type CollegeListFilters,
} from '@/db/repositories/college.repository';
import { listCollegeReviews } from '@/db/repositories/content.repository';
import { findCourseIdBySlug, listCourseCategories } from '@/db/repositories/course.repository';
import { listPublishedExamOptions } from '@/db/repositories/exam.repository';
import { getCityBySlug, getStateBySlug, listCities, listStates } from '@/db/repositories/geo.repository';
import { toPlain } from '@/db/repositories/base.repository';
import {
    ACCREDITATIONS,
    APPROVAL_BODIES,
    OWNERSHIP_TYPES,
    STUDY_MODES,
} from '@/config/constants';
import { CACHE_TAGS, CACHE_TTL, cached, reviveDates } from '@/lib/cache';
import type { FilterGroup } from '@/components/shared/filter-panel';
import type { CollegeDoc } from '@/db/models/college.model';
import type { Paginated, SortOption } from '@/types/common';

export const COLLEGE_SORTS: SortOption[] = [
    { label: 'Relevance', value: 'relevance' },
    { label: 'Ranking', value: 'ranking' },
    { label: 'Rating', value: 'rating' },
    { label: 'Fees: low to high', value: 'fee-low' },
    { label: 'Fees: high to low', value: 'fee-high' },
    { label: 'Placement', value: 'placement' },
    { label: 'Name A–Z', value: 'name-asc' },
];

export interface CollegeSearchParams {
    q?: string;
    state?: string;
    city?: string;
    course?: string;
    category?: string;
    exam?: string;
    ownership?: string;
    approval?: string;
    accreditation?: string;
    ranking?: string;
    feeMax?: string;
    mode?: string;
    rating?: string;
    hostel?: string;
    placement?: string;
    sort?: string;
    page?: string;
}

/** Converts URL search params into repository filters (all values validated). */
export async function resolveCollegeFilters(
    params: CollegeSearchParams,
    overrides: Partial<CollegeListFilters> = {},
): Promise<CollegeListFilters> {
    const [state, city, courseId] = await Promise.all([
        params.state ? getStateBySlug(params.state) : null,
        params.city ? getCityBySlug(params.city) : null,
        params.course ? findCourseIdBySlug(params.course) : null,
    ]);

    const numeric = (value?: string) => {
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? n : undefined;
    };

    return {
        q: params.q?.slice(0, 80),
        stateId: state ? String(state._id) : undefined,
        cityId: city ? String(city._id) : undefined,
        courseId: courseId ?? undefined,
        ownership: params.ownership?.split(',').filter((v) => (OWNERSHIP_TYPES as readonly string[]).includes(v)),
        approval: params.approval?.split(',').filter((v) => (APPROVAL_BODIES as readonly string[]).includes(v)),
        accreditation: params.accreditation
            ?.split(',')
            .filter((v) => (ACCREDITATIONS as readonly string[]).includes(v)),
        rankingMax: numeric(params.ranking),
        feeMax: numeric(params.feeMax),
        studyMode: params.mode && (STUDY_MODES as readonly string[]).includes(params.mode) ? params.mode : undefined,
        ratingMin: numeric(params.rating),
        hostel: params.hostel === 'true' || params.hostel === '1',
        placementMin: numeric(params.placement),
        sort: params.sort,
        page: Number(params.page) || 1,
        pageSize: 12,
        ...overrides,
    };
}

export async function searchColleges(filters: CollegeListFilters): Promise<Paginated<CollegeDoc>> {
    const result = await listColleges(filters);
    return toPlain(result);
}

/** Facet counts for the filter panel, computed from the current filter set. */
export const getCollegeFacets = cached(
    async (): Promise<{
        ownership: { label: string; value: string; count: number }[];
        states: { label: string; value: string; count: number }[];
        cities: { label: string; value: string; count: number }[];
        categories: { label: string; value: string; count: number }[];
        exams: { label: string; value: string }[];
    }> => {
        const [ownershipRows, states, cities, categories, exams] = await Promise.all([
            aggregateCollegeOwnershipCounts(),
            listStates({ limit: 40 }),
            listCities({ limit: 40 }),
            listCourseCategories({ limit: 12 }),
            listPublishedExamOptions({ limit: 20, sort: { displayOrder: 1 } }),
        ]);

        return {
            ownership: ownershipRows.map((r) => ({ label: r._id, value: r._id, count: r.count })),
            states: states
                .filter((s) => s.collegeCount > 0)
                .map((s) => ({ label: s.name, value: s.slug, count: s.collegeCount })),
            cities: cities
                .filter((c) => c.collegeCount > 0)
                .map((c) => ({ label: `${c.name}`, value: c.slug, count: c.collegeCount })),
            categories: categories.map((c) => ({ label: c.name, value: c.slug, count: c.collegeCount })),
            exams: exams.map((e) => ({ label: e.shortName, value: e.slug })),
        };
    },
    ['college-facets'],
    { tags: [CACHE_TAGS.colleges], revalidate: CACHE_TTL.long },
);

export async function buildCollegeFilterGroups(): Promise<FilterGroup[]> {
    const facets = await getCollegeFacets();

    return [
        { key: 'ownership', label: 'Ownership', type: 'checkbox', options: facets.ownership },
        { key: 'state', label: 'State', type: 'select', options: facets.states },
        { key: 'city', label: 'City', type: 'select', options: facets.cities },
        { key: 'category', label: 'Stream', type: 'checkbox', options: facets.categories },
        {
            key: 'approval',
            label: 'Approvals',
            type: 'checkbox',
            options: APPROVAL_BODIES.map((a) => ({ label: a, value: a })),
        },
        {
            key: 'accreditation',
            label: 'Accreditation',
            type: 'checkbox',
            options: ACCREDITATIONS.map((a) => ({ label: a, value: a })),
        },
        {
            key: 'exam',
            label: 'Exam accepted',
            type: 'select',
            options: facets.exams.map((e) => ({ label: e.label, value: e.value })),
        },
        {
            key: 'mode',
            label: 'Study mode',
            type: 'radio',
            options: STUDY_MODES.map((m) => ({ label: m, value: m })),
        },
        {
            key: 'ranking',
            label: 'NIRF rank within',
            type: 'select',
            options: [
                { label: 'Top 25', value: '25' },
                { label: 'Top 50', value: '50' },
                { label: 'Top 100', value: '100' },
                { label: 'Top 200', value: '200' },
            ],
        },
        {
            key: 'rating',
            label: 'Minimum rating',
            type: 'radio',
            options: [
                { label: '4.5 and above', value: '4.5' },
                { label: '4.0 and above', value: '4' },
                { label: '3.5 and above', value: '3.5' },
            ],
        },
        {
            key: 'feeMax',
            label: 'Maximum annual fee (₹)',
            type: 'select',
            options: [
                { label: 'Under ₹50,000', value: '50000' },
                { label: 'Under ₹1 Lakh', value: '100000' },
                { label: 'Under ₹2 Lakh', value: '200000' },
                { label: 'Under ₹5 Lakh', value: '500000' },
                { label: 'Under ₹10 Lakh', value: '1000000' },
            ],
        },
        {
            key: 'placement',
            label: 'Placement rate',
            type: 'radio',
            options: [
                { label: '90% and above', value: '90' },
                { label: '80% and above', value: '80' },
                { label: '70% and above', value: '70' },
            ],
        },
        { key: 'hostel', label: 'Hostel', type: 'radio', options: [{ label: 'Hostel available', value: 'true' }] },
    ];
}

/**
 * Full detail payload for /colleges/[slug] and its sub-tabs.
 *
 * Cached because this is the most-visited page shape on the site and it costs five
 * queries in two dependent waves — the four related reads need the college's `_id`,
 * so they cannot start until the first one lands. The `reviews` tag is included
 * alongside `colleges` so moderating a review updates the college page too, rather
 * than waiting out the TTL.
 *
 * React `cache()` still wraps the cached loader: `generateMetadata` and the layout
 * both call this, and that keeps it to one lookup per request.
 */
const loadCollegeDetail = cached(
    async (slug: string) => {
        const college = await getCollegeBySlug(slug);
        if (!college) {
            const legacy = await getCollegeBySlugHistory(slug);
            return legacy ? { redirectTo: legacy.slug as string } : null;
        }

        const [courses, reviews, similar, rankings] = await Promise.all([
            listCollegeCourses(String(college._id)),
            listCollegeReviews(String(college._id), { pageSize: 5 }),
            listSimilarColleges(college, 6),
            listCollegeRankings(String(college._id)),
        ]);

        return toPlain({ college, courses, reviews, similar, rankings });
    },
    ['college-detail'],
    { tags: [CACHE_TAGS.colleges, CACHE_TAGS.reviews], revalidate: CACHE_TTL.medium },
);

export const getCollegeDetail = cache(async (slug: string) =>
    reviveDates(await loadCollegeDetail(slug)),
);

export async function countCollegesForFilter(filters: CollegeListFilters): Promise<number> {
    return countColleges(buildCollegeFilter(filters));
}
