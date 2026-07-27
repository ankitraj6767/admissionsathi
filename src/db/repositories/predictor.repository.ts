import 'server-only';
import type { FilterQuery } from 'mongoose';
import {
    Cutoff,
    PredictionSession,
    Predictor,
    PredictorDataset,
    type CutoffDoc,
    type PredictionSessionDoc,
    type PredictorDatasetDoc,
    type PredictorDoc,
} from '@/db/models/predictor.model';
import { College, type CollegeDoc } from '@/db/models/college.model';
import { connectToDatabase } from '@/db/connect';
import {
    distinctLean,
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

export async function countPredictorSessions(
    filter: FilterQuery<PredictionSessionDoc> = {},
): Promise<number> {
    await connectToDatabase();
    return PredictionSession.countDocuments(filter).exec();
}

export async function countPublishedPredictors(): Promise<number> {
    await connectToDatabase();
    return Predictor.countDocuments(PUBLISHED).exec();
}

/** Indexable predictor slugs for the sitemap. */
export async function listPredictorSitemapSlugs(limit: number): Promise<SlugRow[]> {
    return listSlugRows<PredictorDoc>(Predictor, SITEMAP_FILTER as FilterQuery<PredictorDoc>, {
        limit,
    });
}

/** Raw option values for the predictor form selects, from the published dataset. */
export interface CutoffOptionValues {
    branches: string[];
    states: string[];
    collegeTypes: string[];
    rounds: number[];
}

/**
 * Distinct branch / state / college-type / round values a predictor has cut-offs
 * for. Only published rows, so a staged dataset never leaks into the form.
 */
export async function listCutoffOptionValues(predictorId: string): Promise<CutoffOptionValues> {
    const scope = { predictor: predictorId, isPublished: true } as FilterQuery<CutoffDoc>;
    const [branches, states, collegeTypes, rounds] = await Promise.all([
        distinctLean<CutoffDoc, string>(Cutoff, 'branchName', scope),
        distinctLean<CutoffDoc, string>(Cutoff, 'stateName', scope),
        distinctLean<CutoffDoc, string>(Cutoff, 'collegeType', scope),
        distinctLean<CutoffDoc, number>(Cutoff, 'round', scope),
    ]);
    return { branches, states, collegeTypes, rounds };
}

/* --------------------------- prediction sessions -------------------------- */

export async function findPredictionSessionById(
    id: string,
): Promise<PredictionSessionDoc | null> {
    return findOneLean<PredictionSessionDoc>(PredictionSession, { _id: id });
}

/** Stores a completed run so it can be reopened, audited and followed up on. */
export async function createPredictionSession(
    values: Record<string, unknown>,
): Promise<PredictionSessionDoc> {
    await connectToDatabase();
    const created = await PredictionSession.create(values);
    return created.toObject() as PredictionSessionDoc;
}

export async function listPredictionSessionsForUser(
    userId: string,
    limit = 20,
): Promise<PredictionSessionDoc[]> {
    return findLean<PredictionSessionDoc>(
        PredictionSession,
        { user: userId } as FilterQuery<PredictionSessionDoc>,
        { sort: { createdAt: -1 }, limit },
    );
}

/** Claims an anonymous session for an account after sign-in. */
export async function attachUserToPredictionSession(
    sessionId: string,
    userId: string,
): Promise<void> {
    await connectToDatabase();
    await PredictionSession.updateOne({ _id: sessionId }, { $set: { user: userId } }).exec();
}

/**
 * Links a captured lead to the session that produced it, so counsellors can see
 * the exact result list the student was looking at.
 */
export async function attachLeadToPredictionSession(
    sessionId: string,
    leadId: string,
): Promise<void> {
    await connectToDatabase();
    await PredictionSession.updateOne(
        { _id: sessionId },
        { $set: { leadCaptured: true, lead: leadId } },
    ).exec();
}

/* --------------------------- cut-off dataset admin ------------------------ */

/**
 * College names that already exist, used by the CSV import preview to report
 * which rows will not link to a College document.
 */
export async function findExistingCollegeNames(names: string[]): Promise<string[]> {
    if (names.length === 0) return [];
    const rows = await findLean<CollegeDoc>(
        College,
        { name: { $in: names } },
        { projection: { name: 1 }, limit: 500, sort: { name: 1 } },
    );
    return rows.map((row) => row.name);
}

export type CollegeImportRow = Pick<
    CollegeDoc,
    '_id' | 'name' | 'slug' | 'cityName' | 'stateName' | 'ownership' | 'feeRange' | 'ranking'
>;

/**
 * Every college keyed by name, for the import's name → college join.
 * Deliberately unbounded: a cut-off file may reference any college, and a capped
 * read would silently drop the link for colleges past the cap.
 */
export async function listCollegeImportIndex(): Promise<CollegeImportRow[]> {
    await connectToDatabase();
    return College.find({})
        .select('name slug _id cityName stateName ownership feeRange ranking')
        .lean<CollegeImportRow[]>()
        .exec();
}

/** Highest existing version for a predictor, or 0 when it has no datasets yet. */
export async function findLatestDatasetVersion(predictorId: string): Promise<number> {
    await connectToDatabase();
    const latest = await PredictorDataset.findOne({ predictor: predictorId })
        .sort({ version: -1 })
        .select('version')
        .lean<{ version: number }>()
        .exec();
    return latest?.version ?? 0;
}

export async function createPredictorDataset(
    values: Record<string, unknown>,
): Promise<PredictorDatasetDoc> {
    await connectToDatabase();
    const created = await PredictorDataset.create(values);
    return created.toObject() as PredictorDatasetDoc;
}

export async function findDatasetById(id: string): Promise<PredictorDatasetDoc | null> {
    return findOneLean<PredictorDatasetDoc>(PredictorDataset, { _id: id });
}

/** Unordered bulk insert so one bad row cannot abort the whole import. */
export async function insertCutoffRows(rows: Record<string, unknown>[]): Promise<void> {
    if (rows.length === 0) return;
    await connectToDatabase();
    await Cutoff.insertMany(rows, { ordered: false });
}

export async function updateDatasetCounts(
    datasetId: string,
    counts: {
        rowCount: number;
        validRowCount: number;
        invalidRowCount: number;
        validationErrors: { row: number; message: string }[];
    },
): Promise<void> {
    await connectToDatabase();
    await PredictorDataset.updateOne({ _id: datasetId }, { $set: counts }).exec();
}

export async function updateDatasetState(
    datasetId: string,
    values: Record<string, unknown>,
): Promise<void> {
    await connectToDatabase();
    await PredictorDataset.updateOne({ _id: datasetId }, { $set: values }).exec();
}

/** Only one dataset per predictor may be published at a time. */
export async function rollBackOtherPublishedDatasets(
    predictorId: string,
    exceptDatasetId: string,
): Promise<void> {
    await connectToDatabase();
    await PredictorDataset.updateMany(
        { predictor: predictorId, _id: { $ne: exceptDatasetId }, state: 'published' },
        { $set: { state: 'rolled_back' } },
    ).exec();
}

/** The version to fall back on when the live dataset is rolled back. */
export async function findLatestRolledBackDataset(
    predictorId: string,
    exceptDatasetId: string,
): Promise<PredictorDatasetDoc | null> {
    await connectToDatabase();
    return PredictorDataset.findOne({
        predictor: predictorId,
        _id: { $ne: exceptDatasetId },
        state: 'rolled_back',
    })
        .sort({ version: -1 })
        .lean<PredictorDatasetDoc>()
        .exec();
}

export async function setCutoffPublishedForPredictor(
    predictorId: string,
    isPublished: boolean,
): Promise<void> {
    await connectToDatabase();
    await Cutoff.updateMany({ predictor: predictorId }, { $set: { isPublished } }).exec();
}

export async function setCutoffPublishedForDataset(
    datasetId: string,
    isPublished: boolean,
): Promise<void> {
    await connectToDatabase();
    await Cutoff.updateMany({ dataset: datasetId }, { $set: { isPublished } }).exec();
}

export async function setPredictorActiveDataset(
    predictorId: string,
    datasetId: string,
): Promise<void> {
    await connectToDatabase();
    await Predictor.updateOne({ _id: predictorId }, { $set: { activeDataset: datasetId } }).exec();
}

export async function deleteCutoffsForDataset(datasetId: string): Promise<void> {
    await connectToDatabase();
    await Cutoff.deleteMany({ dataset: datasetId }).exec();
}

export async function deletePredictorDataset(datasetId: string): Promise<void> {
    await connectToDatabase();
    await PredictorDataset.deleteOne({ _id: datasetId }).exec();
}

/** Predictor name/slug pairs for admin pickers. */
export async function listPredictorOptions(limit = 60): Promise<PredictorDoc[]> {
    return findLean<PredictorDoc>(
        Predictor,
        { isDeleted: { $ne: true } },
        { sort: { displayOrder: 1 }, limit, projection: { name: 1, slug: 1 } },
    );
}

/** Recent dataset versions across every predictor, with the predictor name joined. */
export async function listRecentDatasets(limit = 60): Promise<PredictorDatasetDoc[]> {
    return findLean<PredictorDatasetDoc>(
        PredictorDataset,
        {},
        {
            sort: { createdAt: -1 },
            limit,
            populate: { path: 'predictor', select: 'name' },
        },
    );
}
