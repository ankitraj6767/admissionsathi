import 'server-only';
import { cache } from 'react';
import {
    createLoanCalculation,
    findCourseIdBySlug,
    getLoanProviderBySlug,
    getScholarshipBySlug,
    listFeaturedScholarshipRows,
    listLoanCalculationsForUser,
    listProductsForProvider,
    listPublishedLoanProviders,
    listPublishedScholarships,
    listRelatedScholarships,
    listScholarshipsForState,
    paginateScholarships,
} from '@/db/repositories/finance.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { escapeRegex } from '@/lib/utils';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import type { ScholarshipDoc } from '@/db/models/finance.model';
import type { EmiResult } from '@/lib/finance/emi';
import type { Paginated } from '@/types/common';

/* --------------------------------- loans --------------------------------- */

export const listLoanProviders = cached(
    async () => toPlain(await listPublishedLoanProviders(40)),
    ['loan-providers'],
    { tags: [CACHE_TAGS.loanProviders], revalidate: CACHE_TTL.long },
);

export const getLoanProvider = cache(async (slug: string) => {
    const provider = await getLoanProviderBySlug(slug);
    if (!provider) return null;
    const products = await listProductsForProvider(provider._id, 10);
    return toPlain({ provider, products });
});

export async function saveLoanCalculation(input: {
    userId?: string;
    anonymousId?: string;
    courseFee?: number;
    loanAmount: number;
    interestRate: number;
    tenureMonths: number;
    moratoriumMonths: number;
    processingFeePercent?: number;
    result: EmiResult;
    providerId?: string;
}): Promise<string> {
    return createLoanCalculation({
        user: input.userId,
        anonymousId: input.anonymousId,
        courseFee: input.courseFee,
        loanAmount: input.loanAmount,
        interestRate: input.interestRate,
        tenureMonths: input.tenureMonths,
        moratoriumMonths: input.moratoriumMonths,
        processingFeePercent: input.processingFeePercent,
        emi: input.result.emi,
        totalInterest: input.result.totalInterest,
        totalRepayment: input.result.totalRepayment,
        provider: input.providerId,
    });
}

export async function listUserLoanCalculations(userId: string, limit = 20) {
    return toPlain(await listLoanCalculationsForUser(userId, limit));
}

/* ------------------------------ scholarships ----------------------------- */

export interface ScholarshipSearchParams {
    q?: string;
    provider?: string;
    level?: string;
    category?: string;
    course?: string;
    benefit?: string;
    sort?: string;
    page?: string;
}

export async function searchScholarships(
    params: ScholarshipSearchParams,
): Promise<Paginated<ScholarshipDoc>> {
    const filter: Record<string, unknown> = { status: 'published' };

    if (params.q) {
        const rx = new RegExp(escapeRegex(params.q), 'i');
        filter.$or = [{ name: rx }, { provider: rx }];
    }
    if (params.provider) filter.providerType = params.provider;
    if (params.level) filter.targetLevels = params.level;
    if (params.category) filter.targetCategories = params.category;
    if (params.benefit) filter.benefitType = params.benefit;
    if (params.course) {
        const courseId = await findCourseIdBySlug(params.course);
        if (courseId) filter.targetCourses = courseId;
    }

    const sort: Record<string, 1 | -1> =
        params.sort === 'deadline'
            ? { applicationDeadline: 1 }
            : params.sort === 'amount'
                ? { amountMax: -1 }
                : { isFeatured: -1, applicationDeadline: 1 };

    return toPlain(
        await paginateScholarships({
            filter,
            page: Number(params.page) || 1,
            pageSize: 12,
            sort,
        }),
    );
}

export const getScholarship = cache(async (slug: string) => {
    const scholarship = await getScholarshipBySlug(slug);
    if (!scholarship) return null;

    const related = await listRelatedScholarships(
        scholarship._id,
        scholarship.providerType,
        5,
    );

    return toPlain({ scholarship, related });
});

export const listFeaturedScholarships = cached(
    async () => toPlain(await listFeaturedScholarshipRows(8)),
    ['featured-scholarships'],
    { tags: [CACHE_TAGS.scholarships], revalidate: CACHE_TTL.long },
);

/**
 * Scholarships to surface on a college page.
 *
 * Prefers schemes targeting the college's state (plus nationwide ones, which
 * have an empty `targetStates`), and falls back to the general published list so
 * the section is never empty for a college in an untargeted state.
 */
export async function listScholarshipsForCollege(
    stateId?: string,
    limit = 8,
): Promise<ScholarshipDoc[]> {
    if (stateId) {
        const scoped = await listScholarshipsForState(stateId, limit);
        if (scoped.length > 0) return toPlain(scoped);
    }
    return toPlain(await listPublishedScholarships(limit));
}
