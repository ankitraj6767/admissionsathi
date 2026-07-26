import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PROBABILITY_BANDS, PROBABILITY_BAND_META, type ProbabilityBand } from '@/config/constants';
import type { PredictorBandRule } from '@/db/models/predictor.model';

/**
 * `resolveBand` is the pure rule engine behind every prediction.
 * The service module also wires up Mongo, the Next cache and the logger, so those
 * side-effect modules are stubbed — nothing here touches a database.
 */
vi.mock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return { ...actual, cache: <T>(fn: T) => fn };
});
vi.mock('@/db/connect', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/db/models/predictor.model', () => ({
    Predictor: { countDocuments: vi.fn() },
    PredictionSession: { create: vi.fn(), findById: vi.fn(), find: vi.fn(), updateOne: vi.fn() },
    Cutoff: { distinct: vi.fn() },
}));
vi.mock('@/db/repositories/predictor.repository', () => ({
    findCutoffCandidates: vi.fn(),
    getActiveDataset: vi.fn(),
    getPredictorBySlug: vi.fn(),
    incrementPredictorUsage: vi.fn(),
    listPredictors: vi.fn(),
}));
vi.mock('@/db/repositories/base.repository', () => ({ toPlain: <T>(v: T) => v }));
vi.mock('@/lib/cache', () => ({
    CACHE_TAGS: { predictors: 'predictors' },
    CACHE_TTL: { long: 3600 },
    cached: <T>(fn: T) => fn,
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

type Predictor = { bandRules: PredictorBandRule[]; metricDirection: 'lower_is_better' | 'higher_is_better' };

let resolveBand: (predictor: Predictor, ratio: number) => ProbabilityBand;

beforeAll(async () => {
    ({ resolveBand } = await import('@/services/predictor.service'));
});

const lowerIsBetter: Predictor = { bandRules: [], metricDirection: 'lower_is_better' };
const higherIsBetter: Predictor = { bandRules: [], metricDirection: 'higher_is_better' };

describe('resolveBand — default rules, lower_is_better (rank)', () => {
    // ratio = userRank / closingRank, so a smaller ratio is a better chance.
    it.each([
        [0.1, 'very_high'],
        [0.7, 'very_high'],
        [0.700001, 'high'],
        [0.9, 'high'],
        [0.900001, 'moderate'],
        [1.05, 'moderate'],
        [1.050001, 'low'],
        [1.25, 'low'],
        [1.250001, 'very_low'],
        [5, 'very_low'],
    ])('ratio %s resolves to %s', (ratio, band) => {
        expect(resolveBand(lowerIsBetter, ratio as number)).toBe(band);
    });

    it('is monotonic — a better ratio never yields a worse band', () => {
        const order = [...PROBABILITY_BANDS];
        const ratios = [0.2, 0.5, 0.7, 0.8, 0.9, 1, 1.05, 1.1, 1.25, 1.5, 3];
        const indexes = ratios.map((r) => order.indexOf(resolveBand(lowerIsBetter, r)));
        for (let i = 1; i < indexes.length; i += 1) {
            expect(indexes[i]!).toBeGreaterThanOrEqual(indexes[i - 1]!);
        }
    });
});

describe('resolveBand — default rules, higher_is_better (percentile / score)', () => {
    // ratio = userValue / closingValue, so a bigger ratio is a better chance.
    it.each([
        [2, 'very_high'],
        [1.08, 'very_high'],
        [1.079999, 'high'],
        [1.02, 'high'],
        [1.019999, 'moderate'],
        [0.98, 'moderate'],
        [0.979999, 'low'],
        [0.92, 'low'],
        [0.919999, 'very_low'],
        [0.1, 'very_low'],
    ])('ratio %s resolves to %s', (ratio, band) => {
        expect(resolveBand(higherIsBetter, ratio as number)).toBe(band);
    });
});

describe('resolveBand — admin configured rules', () => {
    const maxRatioRules: PredictorBandRule[] = [
        { band: 'very_high', maxRatio: 0.5 },
        { band: 'high', maxRatio: 0.8 },
        { band: 'moderate', maxRatio: 1 },
        { band: 'low', maxRatio: 1.4 },
    ];

    const minRatioRules: PredictorBandRule[] = [
        { band: 'very_high', minRatio: 1.2 },
        { band: 'high', minRatio: 1.05 },
        { band: 'moderate', minRatio: 1 },
        { band: 'low', minRatio: 0.9 },
    ];

    it('honours maxRatio thresholds for lower_is_better', () => {
        const predictor: Predictor = { bandRules: maxRatioRules, metricDirection: 'lower_is_better' };
        expect(resolveBand(predictor, 0.4)).toBe('very_high');
        expect(resolveBand(predictor, 0.5)).toBe('very_high');
        expect(resolveBand(predictor, 0.6)).toBe('high');
        expect(resolveBand(predictor, 1)).toBe('moderate');
        expect(resolveBand(predictor, 1.4)).toBe('low');
        expect(resolveBand(predictor, 1.41)).toBe('very_low');
    });

    it('sorts the rules itself, so declaration order does not matter', () => {
        const shuffled: Predictor = {
            bandRules: [...maxRatioRules].reverse(),
            metricDirection: 'lower_is_better',
        };
        expect(resolveBand(shuffled, 0.4)).toBe('very_high');
        expect(resolveBand(shuffled, 0.9)).toBe('moderate');
    });

    it('honours minRatio thresholds for higher_is_better', () => {
        const predictor: Predictor = { bandRules: minRatioRules, metricDirection: 'higher_is_better' };
        expect(resolveBand(predictor, 1.5)).toBe('very_high');
        expect(resolveBand(predictor, 1.2)).toBe('very_high');
        expect(resolveBand(predictor, 1.1)).toBe('high');
        expect(resolveBand(predictor, 1)).toBe('moderate');
        expect(resolveBand(predictor, 0.95)).toBe('low');
        expect(resolveBand(predictor, 0.5)).toBe('very_low');
    });

    it('falls back to very_low when no configured rule matches', () => {
        const predictor: Predictor = {
            bandRules: [{ band: 'very_high', maxRatio: 0.2 }],
            metricDirection: 'lower_is_better',
        };
        expect(resolveBand(predictor, 9)).toBe('very_low');
    });

    it('ignores rules missing the threshold for the active direction', () => {
        const predictor: Predictor = {
            // minRatio rules are meaningless for a lower_is_better metric
            bandRules: [{ band: 'very_high', minRatio: 0.1 }],
            metricDirection: 'lower_is_better',
        };
        expect(resolveBand(predictor, 0.1)).toBe('very_low');
    });
});

describe('resolveBand — output contract', () => {
    it('only ever returns a known probability band with display metadata', () => {
        const ratios = [-1, 0, 0.35, 0.75, 1, 1.3, 42];
        for (const predictor of [lowerIsBetter, higherIsBetter]) {
            for (const ratio of ratios) {
                const band = resolveBand(predictor, ratio);
                expect(PROBABILITY_BANDS).toContain(band);
                expect(PROBABILITY_BAND_META[band].label.length).toBeGreaterThan(0);
            }
        }
    });

    it('covers every band declared in PROBABILITY_BANDS', () => {
        const produced = new Set<ProbabilityBand>(
            [0.1, 0.8, 1, 1.2, 4].map((ratio) => resolveBand(lowerIsBetter, ratio)),
        );
        expect([...produced].sort()).toEqual([...PROBABILITY_BANDS].sort());
    });
});
