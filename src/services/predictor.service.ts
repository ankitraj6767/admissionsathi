import 'server-only';
import { cache } from 'react';
import type { PredictorDoc } from '@/db/models/predictor.model';
import {
    attachLeadToPredictionSession,
    attachUserToPredictionSession,
    countPublishedPredictors,
    createPredictionSession,
    listCutoffOptionValues,
    listPredictionSessionsForUser,
    createPredictorDataset,
    deleteCutoffsForDataset,
    deletePredictorDataset,
    findCutoffCandidates,
    findDatasetById,
    findExistingCollegeNames,
    findLatestDatasetVersion,
    findLatestRolledBackDataset,
    findPredictionSessionById,
    getActiveDataset,
    getPredictorById,
    getPredictorBySlug,
    incrementPredictorUsage,
    insertCutoffRows,
    listCollegeImportIndex,
    listPredictorOptions,
    listPredictors,
    listRecentDatasets,
    rollBackOtherPublishedDatasets,
    setCutoffPublishedForDataset,
    setCutoffPublishedForPredictor,
    setPredictorActiveDataset,
    updateDatasetCounts,
    updateDatasetState,
} from '@/db/repositories/predictor.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { DEMO_DATA_NOTICE, PROBABILITY_BAND_META, type ProbabilityBand } from '@/config/constants';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import { logger } from '@/lib/logger';
import type { PredictorRunInput } from '@/schemas/predictor.schema';

export interface PredictionRow {
    collegeName: string;
    collegeSlug?: string;
    branchName: string;
    band: ProbabilityBand;
    bandLabel: string;
    bandTone: string;
    previousClosing?: number;
    expectedClosing?: number;
    category: string;
    quota: string;
    round: number;
    location?: string;
    annualFee?: number;
    nirfRank?: number;
}

export interface PredictionResult {
    sessionId: string;
    predictor: {
        name: string;
        slug: string;
        metric: 'rank' | 'percentile' | 'score';
        disclaimer: string;
        examShortName?: string;
    };
    inputs: PredictorRunInput;
    datasetYear?: number;
    datasetVersion?: number;
    rows: PredictionRow[];
    summary: Record<ProbabilityBand, number>;
    totalMatched: number;
}

/** Tolerance controls how far beyond the user's metric we still consider a college. */
const TOLERANCE = { rank: 0.55, percentile: 1.08, score: 1.12 } as const;

/**
 * Rule-based band resolution.
 *
 * `ratio` compares the candidate metric with the historical closing metric.
 * For ranks a *lower* value is better, so ratio = userRank / closingRank.
 * For percentile/score a *higher* value is better, so ratio = userValue / closingValue.
 * Bands come from the predictor configuration, so admins can retune without a deploy.
 */
export function resolveBand(
    predictor: Pick<PredictorDoc, 'bandRules' | 'metricDirection'>,
    ratio: number,
): ProbabilityBand {
    const higherIsBetter = predictor.metricDirection === 'higher_is_better';
    const rules = [...(predictor.bandRules ?? [])];

    if (rules.length === 0) {
        // Sensible defaults if an admin has not configured the bands yet.
        if (higherIsBetter) {
            if (ratio >= 1.08) return 'very_high';
            if (ratio >= 1.02) return 'high';
            if (ratio >= 0.98) return 'moderate';
            if (ratio >= 0.92) return 'low';
            return 'very_low';
        }
        if (ratio <= 0.7) return 'very_high';
        if (ratio <= 0.9) return 'high';
        if (ratio <= 1.05) return 'moderate';
        if (ratio <= 1.25) return 'low';
        return 'very_low';
    }

    if (higherIsBetter) {
        const sorted = rules
            .filter((r) => r.minRatio !== undefined)
            .sort((a, b) => (b.minRatio ?? 0) - (a.minRatio ?? 0));
        for (const rule of sorted) {
            if (ratio >= (rule.minRatio ?? 0)) return rule.band as ProbabilityBand;
        }
        return 'very_low';
    }

    const sorted = rules
        .filter((r) => r.maxRatio !== undefined)
        .sort((a, b) => (a.maxRatio ?? 0) - (b.maxRatio ?? 0));
    for (const rule of sorted) {
        if (ratio <= (rule.maxRatio ?? Infinity)) return rule.band as ProbabilityBand;
    }
    return 'very_low';
}

/** Projects next-year closing using a small drift factor, clearly labelled as an estimate. */
function expectedClosing(previous: number, metric: 'rank' | 'percentile' | 'score'): number {
    if (metric === 'rank') return Math.round(previous * 1.04);
    if (metric === 'percentile') return Number(Math.min(100, previous * 1.002).toFixed(3));
    return Math.round(previous * 1.01);
}

export const getPredictorList = cached(
    async (homepageOnly?: boolean) =>
        toPlain(await listPredictors({ homepageOnly: homepageOnly === true, limit: 24 })),
    ['predictor-list'],
    { tags: [CACHE_TAGS.predictors], revalidate: CACHE_TTL.long },
);

export const getPredictor = cache(async (slug: string) => {
    const predictor = await getPredictorBySlug(slug);
    return predictor ? toPlain(predictor) : null;
});

/** Options for the branch / state selects, derived from the published dataset. */
export const getPredictorOptions = cached(
    async (predictorId: string) => {
        const { branches, states, collegeTypes, rounds } =
            await listCutoffOptionValues(predictorId);

        return {
            branches: branches.filter(Boolean).sort().slice(0, 200),
            states: states.filter(Boolean).sort(),
            collegeTypes: collegeTypes.filter(Boolean).sort(),
            rounds: rounds.filter(Boolean).sort((a, b) => a - b),
        };
    },
    ['predictor-options'],
    { tags: [CACHE_TAGS.predictors], revalidate: CACHE_TTL.long },
);

/**
 * Runs a prediction.
 * Reads only from the published cut-off dataset; never invents cut-off values.
 */
export async function runPrediction(input: PredictorRunInput): Promise<PredictionResult | null> {
    const predictor = await getPredictorBySlug(input.predictorSlug);
    if (!predictor) return null;

    const dataset = await getActiveDataset(String(predictor._id));

    const candidates = await findCutoffCandidates({
        predictorId: String(predictor._id),
        metric: predictor.metric,
        value: input.metricValue,
        category: input.category,
        quota: input.quota,
        gender: undefined,
        round: input.round,
        branchNames: input.branches.length ? input.branches : undefined,
        stateNames: input.preferredStates.length ? input.preferredStates : undefined,
        collegeType: input.collegeType || undefined,
        toleranceFactor: TOLERANCE[predictor.metric],
        limit: 400,
    });

    const seen = new Set<string>();
    const rows: PredictionRow[] = [];

    for (const cut of candidates) {
        const key = `${cut.collegeSlug ?? cut.collegeName}|${cut.branchName}|${cut.category}|${cut.quota}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const closing =
            predictor.metric === 'rank'
                ? cut.closingRank
                : predictor.metric === 'percentile'
                    ? cut.closingPercentile
                    : cut.closingScore;

        if (!closing || closing <= 0) continue;

        const ratio =
            predictor.metricDirection === 'higher_is_better'
                ? input.metricValue / closing
                : input.metricValue / closing;

        const band = resolveBand(predictor, ratio);
        const meta = PROBABILITY_BAND_META[band];

        rows.push({
            collegeName: cut.collegeName,
            collegeSlug: cut.collegeSlug,
            branchName: cut.branchName,
            band,
            bandLabel: meta.label,
            bandTone: meta.tone,
            previousClosing: closing,
            expectedClosing: expectedClosing(closing, predictor.metric),
            category: cut.category,
            quota: cut.quota,
            round: cut.round,
            location: [cut.cityName, cut.stateName].filter(Boolean).join(', '),
            annualFee: cut.annualFee,
            nirfRank: cut.nirfRank,
        });
    }

    const bandOrder: ProbabilityBand[] = ['very_high', 'high', 'moderate', 'low', 'very_low'];
    rows.sort((a, b) => {
        const diff = bandOrder.indexOf(a.band) - bandOrder.indexOf(b.band);
        if (diff !== 0) return diff;
        return (a.nirfRank ?? 999) - (b.nirfRank ?? 999);
    });

    const limited = rows.slice(0, 60);

    const summary = bandOrder.reduce(
        (acc, band) => ({ ...acc, [band]: rows.filter((r) => r.band === band).length }),
        {} as Record<ProbabilityBand, number>,
    );

    // Persist the session (used for history, analytics and counsellor follow-up).
    const session = await createPredictionSession({
        predictor: predictor._id,
        predictorSlug: predictor.slug,
        anonymousId: input.anonymousId,
        inputs: input as unknown as Record<string, unknown>,
        datasetVersion: dataset?.version,
        resultCount: limited.length,
        results: limited,
        completedAt: new Date(),
    });

    void incrementPredictorUsage(String(predictor._id));

    logger.info('predictor.run', {
        predictor: predictor.slug,
        matched: rows.length,
        returned: limited.length,
    });

    return {
        sessionId: String(session._id),
        predictor: {
            name: predictor.name,
            slug: predictor.slug,
            metric: predictor.metric,
            disclaimer: predictor.disclaimer,
            examShortName: predictor.examShortName,
        },
        inputs: input,
        datasetYear: dataset?.year,
        datasetVersion: dataset?.version,
        rows: limited,
        summary,
        totalMatched: rows.length,
    };
}

export async function getPredictionSession(id: string) {
    const session = await findPredictionSessionById(id);
    return session ? toPlain(session) : null;
}

export async function listUserPredictionSessions(userId: string, limit = 20) {
    const rows = await listPredictionSessionsForUser(userId, limit);
    return toPlain(rows);
}

export async function attachUserToSession(sessionId: string, userId: string): Promise<void> {
    await attachUserToPredictionSession(sessionId, userId);
}

export interface PredictionSessionSummary {
    id: string;
    predictorSlug: string;
    resultCount: number;
}

/**
 * The few session facts the lead-capture flow needs.
 * Returns `null` when the session has expired so the caller can ask the student
 * to run the predictor again.
 */
export async function getPredictionSessionSummary(
    sessionId: string,
): Promise<PredictionSessionSummary | null> {
    const session = await findPredictionSessionById(sessionId);
    if (!session) return null;
    return {
        id: String(session._id),
        predictorSlug: session.predictorSlug,
        resultCount: session.resultCount,
    };
}

/** Marks a session as converted and links the lead it produced. */
export async function linkLeadToPredictionSession(
    sessionId: string,
    leadId: string,
): Promise<void> {
    await attachLeadToPredictionSession(sessionId, leadId);
}

export async function countPredictorsPublished(): Promise<number> {
    return countPublishedPredictors();
}

/* -------------------------- cut-off dataset admin ------------------------- */

export interface CutoffRowIssue {
    row: number;
    message: string;
}

/**
 * Names from an upload that will not link to a College row.
 * Bounded on both sides: at most 500 names are checked and 25 reported, because
 * this only drives a warning list in the import preview.
 */
export async function findUnmatchedCollegeNames(names: string[]): Promise<string[]> {
    const bounded = names.slice(0, 500);
    const matched = new Set(await findExistingCollegeNames(bounded));
    return bounded.filter((name) => !matched.has(name)).slice(0, 25);
}

/** Parses a CSV cell into a number, tolerating thousands separators. */
function numeric(value?: string): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : undefined;
}

export interface ImportCutoffDatasetInput {
    predictorId: string;
    name: string;
    year: number;
    sourceNote?: string;
    columnMapping: Record<string, string>;
    rows: Record<string, string>[];
    actorId: string;
}

export interface ImportCutoffDatasetResult {
    datasetId: string;
    version: number;
    predictorName: string;
    inserted: number;
    skipped: number;
}

/**
 * Creates the next dataset version and inserts its rows, unpublished.
 *
 * A new version is always created rather than mutating the live one, so the
 * current predictions keep running until an admin publishes the import. Rows that
 * miss a required value or every closing metric are skipped and reported on the
 * dataset instead of failing the whole file.
 */
export async function importCutoffDataset(
    input: ImportCutoffDatasetInput,
): Promise<ImportCutoffDatasetResult | null> {
    const predictor = await getPredictorById(input.predictorId);
    if (!predictor) return null;

    const latestVersion = await findLatestDatasetVersion(String(predictor._id));

    const dataset = await createPredictorDataset({
        predictor: predictor._id,
        name: input.name,
        version: latestVersion + 1,
        year: input.year,
        sourceNote: input.sourceNote ?? DEMO_DATA_NOTICE,
        columnMapping: input.columnMapping,
        state: 'validated',
        createdBy: input.actorId,
    });

    const collegeDocs = await listCollegeImportIndex();
    const collegeByName = new Map(collegeDocs.map((row) => [row.name.toLowerCase(), row]));

    const rows: Record<string, unknown>[] = [];
    const errors: CutoffRowIssue[] = [];

    input.rows.forEach((row, index) => {
        const get = (key: string) =>
            input.columnMapping[key] ? row[input.columnMapping[key]!] : undefined;
        const collegeName = get('collegeName')?.trim();
        const branchName = get('branchName')?.trim();
        const category = get('category')?.trim();

        if (!collegeName || !branchName || !category) {
            errors.push({ row: index + 2, message: 'Missing required value' });
            return;
        }

        const closingRank = numeric(get('closingRank'));
        const closingPercentile = numeric(get('closingPercentile'));
        const closingScore = numeric(get('closingScore'));
        if (closingRank === undefined && closingPercentile === undefined && closingScore === undefined) {
            errors.push({ row: index + 2, message: 'No closing metric' });
            return;
        }

        const college = collegeByName.get(collegeName.toLowerCase());

        rows.push({
            dataset: dataset._id,
            predictor: predictor._id,
            exam: predictor.exam,
            examShortName: predictor.examShortName,
            year: input.year,
            round: numeric(get('round')) ?? 1,
            college: college?._id,
            collegeName,
            collegeSlug: college?.slug,
            stateName: get('stateName')?.trim() || college?.stateName,
            cityName: get('cityName')?.trim() || college?.cityName,
            collegeType: get('collegeType')?.trim() || college?.ownership,
            branchName,
            courseName: get('courseName')?.trim(),
            category,
            quota: get('quota')?.trim() || 'All India',
            gender: get('gender')?.trim(),
            openingRank: numeric(get('openingRank')),
            closingRank,
            closingPercentile,
            closingScore,
            seats: numeric(get('seats')),
            annualFee: numeric(get('annualFee')) ?? college?.feeRange?.min,
            nirfRank: numeric(get('nirfRank')) ?? college?.ranking?.nirfOverall,
            isPublished: false,
        });
    });

    await insertCutoffRows(rows);

    await updateDatasetCounts(String(dataset._id), {
        rowCount: input.rows.length,
        validRowCount: rows.length,
        invalidRowCount: errors.length,
        validationErrors: errors.slice(0, 200),
    });

    return {
        datasetId: String(dataset._id),
        version: dataset.version,
        predictorName: predictor.name,
        inserted: rows.length,
        skipped: errors.length,
    };
}

export interface DatasetStateResult {
    datasetId: string;
    name: string;
    version: number;
}

/**
 * Publishes, rolls back or archives a dataset version.
 *
 * Publishing unpublishes every other row for the predictor first so a partially
 * published state is never visible, and rolling back re-publishes the previous
 * version when there is one. Returns `null` when the dataset does not exist.
 */
export async function applyDatasetState(
    datasetId: string,
    action: 'publish' | 'rollback' | 'archive',
    actorId: string,
): Promise<DatasetStateResult | null> {
    const dataset = await findDatasetById(datasetId);
    if (!dataset) return null;

    const id = String(dataset._id);
    const predictorId = String(dataset.predictor);

    if (action === 'publish') {
        // Only one published dataset per predictor.
        await rollBackOtherPublishedDatasets(predictorId, id);
        await setCutoffPublishedForPredictor(predictorId, false);
        await setCutoffPublishedForDataset(id, true);

        await updateDatasetState(id, {
            state: 'published',
            publishedAt: new Date(),
            publishedBy: actorId,
        });

        await setPredictorActiveDataset(predictorId, id);
    } else if (action === 'rollback') {
        await setCutoffPublishedForDataset(id, false);
        await updateDatasetState(id, { state: 'rolled_back' });

        // Re-publish the previous published version, if any.
        const previous = await findLatestRolledBackDataset(predictorId, id);
        if (previous) {
            const previousId = String(previous._id);
            await updateDatasetState(previousId, { state: 'published' });
            await setCutoffPublishedForDataset(previousId, true);
            await setPredictorActiveDataset(predictorId, previousId);
        }
    } else {
        await updateDatasetState(id, { state: 'archived' });
        await setCutoffPublishedForDataset(id, false);
    }

    return { datasetId: id, name: dataset.name, version: dataset.version };
}

export type RemoveDatasetResult =
    | { ok: true; datasetId: string; name: string; version: number }
    | { ok: false; code: 'NOT_FOUND' | 'PUBLISHED' };

/** Deletes a dataset and its cut-off rows. A published version must be rolled back first. */
export async function removeDataset(datasetId: string): Promise<RemoveDatasetResult> {
    const dataset = await findDatasetById(datasetId);
    if (!dataset) return { ok: false, code: 'NOT_FOUND' };
    if (dataset.state === 'published') return { ok: false, code: 'PUBLISHED' };

    const id = String(dataset._id);
    await deleteCutoffsForDataset(id);
    await deletePredictorDataset(id);

    return { ok: true, datasetId: id, name: dataset.name, version: dataset.version };
}

export interface DatasetSummaryRow {
    id: string;
    predictorName: string;
    name: string;
    version: number;
    year: number;
    state: string;
    rowCount: number;
    validRowCount: number;
    invalidRowCount: number;
    publishedAt?: string;
    createdAt: string;
}

export interface CutoffDatasetScreenData {
    predictors: { label: string; value: string }[];
    datasets: DatasetSummaryRow[];
}

/**
 * Predictor picker options plus the dataset version history for the import screen.
 * The predictor name is joined here so the page renders a flat, serialisable row.
 */
export async function getCutoffDatasetScreenData(): Promise<CutoffDatasetScreenData> {
    const [predictors, datasets] = await Promise.all([
        listPredictorOptions().then(toPlain),
        listRecentDatasets().then(toPlain),
    ]);

    return {
        predictors: predictors.map((predictor) => ({
            label: predictor.name,
            value: String(predictor._id),
        })),
        datasets: datasets.map((dataset) => ({
            id: String(dataset._id),
            predictorName: (dataset.predictor as unknown as { name?: string })?.name ?? '—',
            name: dataset.name,
            version: dataset.version,
            year: dataset.year,
            state: dataset.state,
            rowCount: dataset.rowCount,
            validRowCount: dataset.validRowCount,
            invalidRowCount: dataset.invalidRowCount,
            publishedAt: dataset.publishedAt ? String(dataset.publishedAt) : undefined,
            createdAt: String(dataset.createdAt),
        })),
    };
}
