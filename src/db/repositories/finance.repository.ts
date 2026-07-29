import 'server-only';
import type { FilterQuery } from 'mongoose';
import { connectToDatabase } from '@/db/connect';
import {
    LoanProduct,
    LoanProvider,
    Scholarship,
    type LoanProductDoc,
    type LoanProviderDoc,
    type ScholarshipDoc,
} from '@/db/models/finance.model';
import { LoanCalculation, type LoanCalculationDoc } from '@/db/models/system.model';
import { Course, type CourseDoc } from '@/db/models/course.model';
import { escapeRegex } from '@/lib/utils';
import {
    distinctLean,
    findLean,
    findOneLean,
    listSlugRows,
    paginate,
    type SlugRow,
} from './base.repository';
import type { Paginated } from '@/types/common';

/** Published, indexable and not soft-deleted — what the sitemap may advertise. */
const SITEMAP_FILTER = {
    status: 'published',
    isDeleted: { $ne: true },
    'seo.noIndex': { $ne: true },
} as const;

/* ----------------------------- loan providers ---------------------------- */

export async function listPublishedLoanProviders(limit = 40): Promise<LoanProviderDoc[]> {
    return findLean<LoanProviderDoc>(
        LoanProvider,
        { status: 'published' },
        { sort: { isFeatured: -1, displayOrder: 1 }, limit },
    );
}

export async function getLoanProviderBySlug(slug: string): Promise<LoanProviderDoc | null> {
    return findOneLean<LoanProviderDoc>(LoanProvider, { slug, status: 'published' });
}

export async function listProductsForProvider(
    providerId: unknown,
    limit = 10,
): Promise<LoanProductDoc[]> {
    return findLean<LoanProductDoc>(
        LoanProduct,
        { provider: providerId, status: 'active' } as FilterQuery<LoanProductDoc>,
        { sort: { displayOrder: 1 }, limit },
    );
}

/* --------------------------- loan calculations --------------------------- */

export interface LoanCalculationInput {
    user?: string;
    anonymousId?: string;
    courseFee?: number;
    loanAmount: number;
    interestRate: number;
    tenureMonths: number;
    moratoriumMonths: number;
    processingFeePercent?: number;
    emi: number;
    totalInterest: number;
    totalRepayment: number;
    provider?: string;
}

export async function createLoanCalculation(input: LoanCalculationInput): Promise<string> {
    await connectToDatabase();
    const created = await LoanCalculation.create(input);
    return String(created._id);
}

export async function listLoanCalculationsForUser(
    userId: string,
    limit = 20,
): Promise<LoanCalculationDoc[]> {
    return findLean<LoanCalculationDoc>(
        LoanCalculation,
        { user: userId } as FilterQuery<LoanCalculationDoc>,
        { sort: { createdAt: -1 }, limit },
    );
}

/* ------------------------------ scholarships ----------------------------- */

export async function paginateScholarships(args: {
    filter: FilterQuery<ScholarshipDoc>;
    page: number;
    pageSize: number;
    sort: Record<string, 1 | -1>;
}): Promise<Paginated<ScholarshipDoc>> {
    return paginate<ScholarshipDoc>(Scholarship, args);
}

export async function getScholarshipBySlug(slug: string): Promise<ScholarshipDoc | null> {
    return findOneLean<ScholarshipDoc>(Scholarship, { slug, status: 'published' });
}

/** Name/provider prefix match for the global search box. */
export async function scholarshipAutocomplete(
    term: string,
    limit = 3,
): Promise<ScholarshipDoc[]> {
    const rx = new RegExp(escapeRegex(term), 'i');
    return findLean<ScholarshipDoc>(
        Scholarship,
        { status: 'published', $or: [{ name: rx }, { provider: rx }] },
        {
            limit,
            sort: { isFeatured: -1 },
            projection: { name: 1, slug: 1, provider: 1, amountMax: 1 },
        },
    );
}

/** Indexable scholarship slugs for the sitemap. */
export async function listScholarshipSitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<ScholarshipDoc>(
        Scholarship,
        SITEMAP_FILTER as FilterQuery<ScholarshipDoc>,
        { limit },
    );
}

/** Indexable loan provider slugs for the sitemap. */
export async function listLoanProviderSitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<LoanProviderDoc>(
        LoanProvider,
        SITEMAP_FILTER as FilterQuery<LoanProviderDoc>,
        { limit },
    );
}

export async function listRelatedScholarships(
    excludeId: unknown,
    providerType: string,
    limit = 5,
): Promise<ScholarshipDoc[]> {
    return findLean<ScholarshipDoc>(
        Scholarship,
        {
            status: 'published',
            _id: { $ne: excludeId },
            providerType,
        } as FilterQuery<ScholarshipDoc>,
        { limit, sort: { isFeatured: -1 } },
    );
}

/** Published scholarships, featured first — the generic highlight list. */
export async function listPublishedScholarships(limit = 8): Promise<ScholarshipDoc[]> {
    return findLean<ScholarshipDoc>(
        Scholarship,
        { status: 'published' },
        { limit, sort: { isFeatured: -1, applicationDeadline: 1 } },
    );
}

export async function listFeaturedScholarshipRows(limit = 8): Promise<ScholarshipDoc[]> {
    return findLean<ScholarshipDoc>(
        Scholarship,
        { status: 'published', isFeatured: true },
        { limit, sort: { applicationDeadline: 1 } },
    );
}

/** Scholarships whose target course list contains the given course. */
export async function listScholarshipsForCourse(
    courseId: unknown,
    limit = 6,
): Promise<ScholarshipDoc[]> {
    return findLean<ScholarshipDoc>(
        Scholarship,
        { status: 'published', targetCourses: courseId } as FilterQuery<ScholarshipDoc>,
        { limit, sort: { isFeatured: -1, applicationDeadline: 1 } },
    );
}

/** Scholarships available to students of a given state (or nationwide). */
export async function listScholarshipsForState(
    stateId: unknown,
    limit = 8,
): Promise<ScholarshipDoc[]> {
    return findLean<ScholarshipDoc>(
        Scholarship,
        {
            status: 'published',
            $or: [{ targetStates: stateId }, { targetStates: { $size: 0 } }],
        } as FilterQuery<ScholarshipDoc>,
        { limit, sort: { isFeatured: -1, applicationDeadline: 1 } },
    );
}

/**
 * Course ids referenced by at least one published scholarship.
 *
 * Drives `/scholarships/course` and its sitemap entries, so a course-scoped
 * landing page is only ever published when it will have results.
 */
export async function distinctScholarshipCourseIds(): Promise<unknown[]> {
    return distinctLean<ScholarshipDoc, unknown>(Scholarship, 'targetCourses', {
        status: 'published',
    } as FilterQuery<ScholarshipDoc>);
}

/** Resolves a course slug to its id — used when filtering scholarships by course. */
export async function findCourseIdBySlug(slug: string): Promise<unknown | null> {
    const course = await findOneLean<CourseDoc>(Course, { slug }, { projection: { _id: 1 } });
    return course?._id ?? null;
}
