import 'server-only';
import { cache } from 'react';
import { connectToDatabase } from '@/db/connect';
import { PredictionSession, Predictor, type PredictorDoc } from '@/db/models/predictor.model';
import {
    findCutoffCandidates,
    getActiveDataset,
    getPredictorBySlug,
    incrementPredictorUsage,
    listPredictors,
} from '@/db/repositories/predictor.repository';
import { toPlain } from '@/db/repositories/base.repository';
import { PROBABILITY_BAND_META, type ProbabilityBand } from '@/config/constants';
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
        await connectToDatabase();
        const { Cutoff } = await import('@/db/models/predictor.model');
        const [branches, states, collegeTypes, rounds] = await Promise.all([
            Cutoff.distinct('branchName', { predictor: predictorId, isPublished: true }).exec(),
            Cutoff.distinct('stateName', { predictor: predictorId, isPublished: true }).exec(),
            Cutoff.distinct('collegeType', { predictor: predictorId, isPublished: true }).exec(),
            Cutoff.distinct('round', { predictor: predictorId, isPublished: true }).exec(),
        ]);

        return {
            branches: (branches as string[]).filter(Boolean).sort().slice(0, 200),
            states: (states as string[]).filter(Boolean).sort(),
            collegeTypes: (collegeTypes as string[]).filter(Boolean).sort(),
            rounds: (rounds as number[]).filter(Boolean).sort((a, b) => a - b),
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
    await connectToDatabase();
    const session = await PredictionSession.create({
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
    await connectToDatabase();
    const session = await PredictionSession.findById(id).lean().exec();
    return session ? toPlain(session) : null;
}

export async function listUserPredictionSessions(userId: string, limit = 20) {
    await connectToDatabase();
    const rows = await PredictionSession.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
    return toPlain(rows);
}

export async function attachUserToSession(sessionId: string, userId: string): Promise<void> {
    await connectToDatabase();
    await PredictionSession.updateOne({ _id: sessionId }, { $set: { user: userId } }).exec();
}

export async function countPredictorsPublished(): Promise<number> {
    await connectToDatabase();
    return Predictor.countDocuments({ status: 'published' }).exec();
}
