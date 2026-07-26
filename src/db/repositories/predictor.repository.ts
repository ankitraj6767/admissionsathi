import 'server-only';
import type { FilterQuery } from 'mongoose';
import {
    Cutoff,
    PredictionSession,
    Predictor,
    PredictorDataset,
    type CutoffDoc,
    type PredictorDatasetDoc,
    type PredictorDoc,
} from '@/db/models/predictor.model';
import { connectToDatabase } from '@/db/connect';
import { findLean, findOneLean, paginate } from './base.repository';
import type { Paginated } from '@/types/common';

const PUBLISHED = { status: 'published' as const };

export async function listPredictors(options?: {
    homepageOnly?: boolean;
    limit?: number;
    slugs?: string[];
}): Promise<PredictorDoc[]> {
    const filter: FilterQuery<PredictorDoc> = { ...PUBLISHED };
    if (options?.homepageOnly) filter.showOnHomepage = true;
    if (options?.slugs?.length) filter.slug = { $in: options.slugs };

    return findLean<PredictorDoc>(Predictor, filter, {
        sort: { displayOrder: 1 },
        limit: options?.limit ?? 24,
        projection: {
            name: 1,
            slug: 1,
            subtitle: 1,
            description: 1,
            icon: 1,
            themeColor: 1,
            ctaLabel: 1,
            examShortName: 1,
            metric: 1,
            usageCount: 1,
        },
    });
}

export async function getPredictorBySlug(slug: string): Promise<PredictorDoc | null> {
    return findOneLean<PredictorDoc>(Predictor, { slug, status: 'published' });
}

export async function getPredictorById(id: string): Promise<PredictorDoc | null> {
    return findOneLean<PredictorDoc>(Predictor, { _id: id });
}

export async function listDatasets(predictorId: string): Promise<PredictorDatasetDoc[]> {
    return findLean<PredictorDatasetDoc>(
        PredictorDataset,
        { predictor: predictorId },
        { sort: { version: -1 }, limit: 50 },
    );
}

export async function getActiveDataset(predictorId: string): Promise<PredictorDatasetDoc | null> {
    return findOneLean<PredictorDatasetDoc>(PredictorDataset, {
        predictor: predictorId,
        state: 'published',
    });
}

export interface CutoffQuery {
    predictorId: string;
    metric: 'rank' | 'percentile' | 'score';
    value: number;
    category?: string;
    quota?: string;
    gender?: string;
    round?: number;
    branchNames?: string[];
    stateNames?: string[];
    collegeType?: string;
    /** How far beyond the user's metric to include (rule configurable). */
    toleranceFactor: number;
    limit?: number;
}

/**
 * Fetches candidate cut-off rows for a prediction run.
 * Bounded by `limit` and always filtered to the published dataset.
 */
export async function findCutoffCandidates(query: CutoffQuery): Promise<CutoffDoc[]> {
    await connectToDatabase();

    const filter: FilterQuery<CutoffDoc> = {
        predictor: query.predictorId,
        isPublished: true,
    };

    if (query.category) filter.category = query.category;
    if (query.quota) filter.quota = query.quota;
    if (query.gender) filter.$or = [{ gender: query.gender }, { gender: { $in: [null, ''] } }];
    if (query.round) filter.round = { $lte: query.round };
    if (query.branchNames?.length) filter.branchName = { $in: query.branchNames };
    if (query.stateNames?.length) filter.stateName = { $in: query.stateNames };
    if (query.collegeType) filter.collegeType = query.collegeType;

    if (query.metric === 'rank') {
        // include colleges whose closing rank is at least the user's rank / tolerance
        filter.closingRank = { $gte: Math.floor(query.value / query.toleranceFactor) };
    } else if (query.metric === 'percentile') {
        filter.closingPercentile = { $lte: query.value * query.toleranceFactor };
    } else {
        filter.closingScore = { $lte: query.value * query.toleranceFactor };
    }

    const sort: Record<string, 1 | -1> =
        query.metric === 'rank' ? { closingRank: 1 } : { closingPercentile: -1 };

    return findLean<CutoffDoc>(Cutoff, filter, { sort, limit: query.limit ?? 200 });
}

export async function listCutoffsForCollege(
    collegeSlug: string,
    limit = 200,
): Promise<CutoffDoc[]> {
    return findLean<CutoffDoc>(
        Cutoff,
        { collegeSlug, isPublished: true },
        { sort: { year: -1, round: 1, closingRank: 1 }, limit },
    );
}

export async function paginateCutoffs(args: {
    predictorId?: string;
    datasetId?: string;
    page?: number;
    pageSize?: number;
}): Promise<Paginated<CutoffDoc>> {
    const filter: FilterQuery<CutoffDoc> = {};
    if (args.predictorId) filter.predictor = args.predictorId;
    if (args.datasetId) filter.dataset = args.datasetId;

    return paginate<CutoffDoc>(Cutoff, {
        filter,
        page: args.page,
        pageSize: args.pageSize,
        sort: { closingRank: 1 },
    });
}

export async function incrementPredictorUsage(predictorId: string): Promise<void> {
    await connectToDatabase();
    await Predictor.updateOne({ _id: predictorId }, { $inc: { usageCount: 1 } }).exec();
}

export async function countPredictorSessions(predictorId?: string): Promise<number> {
    await connectToDatabase();
    return PredictionSession.countDocuments(predictorId ? { predictor: predictorId } : {}).exec();
}
