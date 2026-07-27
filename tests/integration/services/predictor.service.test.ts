import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { College } from '@/db/models/college.model';
import {
    Cutoff,
    PredictionSession,
    Predictor,
    PredictorDataset,
} from '@/db/models/predictor.model';
import {
    applyDatasetState,
    importCutoffDataset,
    runPrediction,
} from '@/services/predictor.service';
import { predictorRunSchema } from '@/schemas/predictor.schema';

const ACTOR_ID = String(new Types.ObjectId());

/**
 * Band rules are deliberately tighter than the tolerance window so every band —
 * including the `very_low` fall-through — is reachable for a rank of 2000.
 */
const BAND_RULES = [
    { band: 'very_high', maxRatio: 0.2 },
    { band: 'high', maxRatio: 0.35 },
    { band: 'moderate', maxRatio: 0.5 },
];

async function seedPredictor(overrides: Record<string, unknown> = {}) {
    return Predictor.create({
        name: 'JEE Main College Predictor',
        slug: 'jee-main-college-predictor',
        examShortName: 'JEE Main',
        metric: 'rank',
        metricDirection: 'lower_is_better',
        bandRules: BAND_RULES,
        status: 'published',
        ...overrides,
    });
}

async function seedDataset(
    predictorId: Types.ObjectId,
    overrides: Record<string, unknown> = {},
) {
    return PredictorDataset.create({
        predictor: predictorId,
        name: 'JoSAA 2025',
        version: 1,
        year: 2025,
        state: 'published',
        ...overrides,
    });
}

async function seedCutoff(
    predictorId: Types.ObjectId,
    datasetId: Types.ObjectId,
    overrides: Record<string, unknown> = {},
) {
    return Cutoff.create({
        dataset: datasetId,
        predictor: predictorId,
        year: 2025,
        round: 1,
        collegeName: 'NIT Trichy',
        collegeSlug: 'nit-trichy',
        branchName: 'Computer Science and Engineering',
        category: 'General',
        quota: 'All India',
        closingRank: 20_000,
        isPublished: true,
        ...overrides,
    });
}

function runInput(overrides: Record<string, unknown> = {}) {
    return predictorRunSchema.parse({
        predictorSlug: 'jee-main-college-predictor',
        metricValue: 2_000,
        category: 'General',
        round: 1,
        ...overrides,
    });
}

describe('runPrediction', () => {
    it('returns null for an unknown predictor slug', async () => {
        expect(await runPrediction(runInput({ predictorSlug: 'no-such-predictor' }))).toBeNull();
    });

    it('reads only published cut-off rows', async () => {
        const predictor = await seedPredictor();
        const live = await seedDataset(predictor._id);
        const staged = await seedDataset(predictor._id, {
            name: 'JoSAA 2026 staged',
            version: 2,
            year: 2026,
            state: 'validated',
        });

        await seedCutoff(predictor._id, live._id, { collegeName: 'Published College' });
        await seedCutoff(predictor._id, staged._id, {
            collegeName: 'Staged College',
            collegeSlug: 'staged-college',
            isPublished: false,
        });

        const result = await runPrediction(runInput());

        expect(result?.rows.map((row) => row.collegeName)).toEqual(['Published College']);
    });

    it('assigns the band configured on the predictor', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id);

        await seedCutoff(predictor._id, dataset._id, {
            collegeName: 'Very High',
            collegeSlug: 'very-high',
            closingRank: 20_000,
        });
        await seedCutoff(predictor._id, dataset._id, {
            collegeName: 'High',
            collegeSlug: 'high',
            closingRank: 8_000,
        });
        await seedCutoff(predictor._id, dataset._id, {
            collegeName: 'Moderate',
            collegeSlug: 'moderate',
            closingRank: 4_500,
        });
        await seedCutoff(predictor._id, dataset._id, {
            collegeName: 'Very Low',
            collegeSlug: 'very-low',
            closingRank: 3_700,
        });

        const result = await runPrediction(runInput());

        expect(
            Object.fromEntries((result?.rows ?? []).map((row) => [row.collegeSlug, row.band])),
        ).toEqual({
            'very-high': 'very_high',
            high: 'high',
            moderate: 'moderate',
            'very-low': 'very_low',
        });
    });

    it('orders rows from the strongest band down and summarises the counts', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id);

        await seedCutoff(predictor._id, dataset._id, {
            collegeSlug: 'moderate-one',
            collegeName: 'Moderate One',
            closingRank: 4_500,
        });
        await seedCutoff(predictor._id, dataset._id, {
            collegeSlug: 'very-high-one',
            collegeName: 'Very High One',
            closingRank: 20_000,
        });

        const result = await runPrediction(runInput());

        expect(result?.rows.map((row) => row.band)).toEqual(['very_high', 'moderate']);
        expect(result?.summary).toMatchObject({ very_high: 1, moderate: 1, high: 0, low: 0 });
    });

    it('de-duplicates rows per college, branch, category and quota', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id);

        await seedCutoff(predictor._id, dataset._id, { closingRank: 20_000 });
        await seedCutoff(predictor._id, dataset._id, { closingRank: 18_000 });

        const result = await runPrediction(runInput());

        expect(result?.rows).toHaveLength(1);
        expect(result?.totalMatched).toBe(1);
    });

    it('keeps rows that differ by branch', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id);

        await seedCutoff(predictor._id, dataset._id);
        await seedCutoff(predictor._id, dataset._id, { branchName: 'Electrical Engineering' });

        const result = await runPrediction(runInput());

        expect(result?.rows).toHaveLength(2);
    });

    it('drops rows whose closing rank is outside the tolerance window', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id);

        // A closing rank far better than the student's rank is not a candidate.
        await seedCutoff(predictor._id, dataset._id, { closingRank: 500 });

        const result = await runPrediction(runInput());

        expect(result?.rows).toEqual([]);
        expect(result?.summary).toMatchObject({ very_high: 0, very_low: 0 });
    });

    it('persists the run as a prediction session', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id);
        await seedCutoff(predictor._id, dataset._id);

        const result = await runPrediction(runInput({ anonymousId: 'anon-123' }));

        const session = await PredictionSession.findById(result?.sessionId).lean();
        expect(session).not.toBeNull();
        expect(session?.predictorSlug).toBe('jee-main-college-predictor');
        expect(session?.resultCount).toBe(1);
        expect(session?.anonymousId).toBe('anon-123');
        expect(session?.completedAt).toBeInstanceOf(Date);
    });

    it('reports the published dataset version and year', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id, { version: 3, year: 2024 });
        await seedCutoff(predictor._id, dataset._id, { year: 2024 });

        const result = await runPrediction(runInput());

        expect(result).toMatchObject({ datasetVersion: 3, datasetYear: 2024 });
    });

    it('narrows candidates by the requested branches', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id);

        await seedCutoff(predictor._id, dataset._id);
        await seedCutoff(predictor._id, dataset._id, { branchName: 'Civil Engineering' });

        const result = await runPrediction(runInput({ branches: ['Civil Engineering'] }));

        expect(result?.rows.map((row) => row.branchName)).toEqual(['Civil Engineering']);
    });
});

describe('importCutoffDataset', () => {
    const columnMapping = {
        collegeName: 'College',
        branchName: 'Branch',
        category: 'Category',
        closingRank: 'Closing Rank',
    };

    it('returns null for an unknown predictor', async () => {
        const result = await importCutoffDataset({
            predictorId: String(new Types.ObjectId()),
            name: 'Orphan import',
            year: 2025,
            columnMapping,
            rows: [{ College: 'A', Branch: 'B', Category: 'General', 'Closing Rank': '100' }],
            actorId: ACTOR_ID,
        });

        expect(result).toBeNull();
    });

    it('creates version 1 in an unpublished state with unpublished rows', async () => {
        const predictor = await seedPredictor();

        const result = await importCutoffDataset({
            predictorId: String(predictor._id),
            name: 'JoSAA 2025 import',
            year: 2025,
            columnMapping,
            rows: [
                { College: 'NIT Trichy', Branch: 'CSE', Category: 'General', 'Closing Rank': '9,000' },
            ],
            actorId: ACTOR_ID,
        });

        expect(result).toMatchObject({ version: 1, inserted: 1, skipped: 0 });

        const dataset = await PredictorDataset.findById(result?.datasetId).lean();
        expect(dataset?.state).toBe('validated');
        expect(dataset?.publishedAt).toBeUndefined();

        const rows = await Cutoff.find({ dataset: result?.datasetId }).lean();
        expect(rows).toHaveLength(1);
        expect(rows[0]?.isPublished).toBe(false);
        expect(rows[0]?.closingRank).toBe(9_000);
    });

    it('creates the next version without touching the live one', async () => {
        const predictor = await seedPredictor();
        await seedDataset(predictor._id, { version: 1, state: 'published' });

        const result = await importCutoffDataset({
            predictorId: String(predictor._id),
            name: 'JoSAA 2026 import',
            year: 2026,
            columnMapping,
            rows: [{ College: 'A College', Branch: 'CSE', Category: 'General', 'Closing Rank': '10' }],
            actorId: ACTOR_ID,
        });

        expect(result?.version).toBe(2);
        expect(await PredictorDataset.countDocuments({ state: 'published' })).toBe(1);
    });

    it('skips rows missing a required value and records why', async () => {
        const predictor = await seedPredictor();

        const result = await importCutoffDataset({
            predictorId: String(predictor._id),
            name: 'Partly broken import',
            year: 2025,
            columnMapping,
            rows: [
                { College: 'Good College', Branch: 'CSE', Category: 'General', 'Closing Rank': '100' },
                { College: '', Branch: 'CSE', Category: 'General', 'Closing Rank': '200' },
            ],
            actorId: ACTOR_ID,
        });

        expect(result).toMatchObject({ inserted: 1, skipped: 1 });

        const dataset = await PredictorDataset.findById(result?.datasetId).lean();
        expect(dataset).toMatchObject({ rowCount: 2, validRowCount: 1, invalidRowCount: 1 });
        // Row 3 is the second data row: the header occupies row 1.
        expect(dataset?.validationErrors).toEqual([{ row: 3, message: 'Missing required value' }]);
    });

    it('skips a row that carries no closing metric at all', async () => {
        const predictor = await seedPredictor();

        const result = await importCutoffDataset({
            predictorId: String(predictor._id),
            name: 'No metric import',
            year: 2025,
            columnMapping,
            rows: [{ College: 'A College', Branch: 'CSE', Category: 'General', 'Closing Rank': '' }],
            actorId: ACTOR_ID,
        });

        expect(result).toMatchObject({ inserted: 0, skipped: 1 });
        const dataset = await PredictorDataset.findById(result?.datasetId).lean();
        expect(dataset?.validationErrors).toEqual([{ row: 2, message: 'No closing metric' }]);
    });

    it('links a row to an existing college by name', async () => {
        const predictor = await seedPredictor();
        await College.create({
            name: 'NIT Trichy',
            slug: 'nit-trichy',
            state: new Types.ObjectId(),
            stateName: 'Tamil Nadu',
            city: new Types.ObjectId(),
            cityName: 'Tiruchirappalli',
            ownership: 'Government',
            status: 'published',
            feeRange: { min: 150_000 },
        });

        const result = await importCutoffDataset({
            predictorId: String(predictor._id),
            name: 'Linked import',
            year: 2025,
            columnMapping,
            rows: [
                { College: 'nit trichy', Branch: 'CSE', Category: 'General', 'Closing Rank': '9000' },
            ],
            actorId: ACTOR_ID,
        });

        const [row] = await Cutoff.find({ dataset: result?.datasetId }).lean();
        expect(row?.collegeSlug).toBe('nit-trichy');
        expect(row?.annualFee).toBe(150_000);
    });

    it('defaults the quota and round when the columns are unmapped', async () => {
        const predictor = await seedPredictor();

        const result = await importCutoffDataset({
            predictorId: String(predictor._id),
            name: 'Defaults import',
            year: 2025,
            columnMapping,
            rows: [{ College: 'A College', Branch: 'CSE', Category: 'General', 'Closing Rank': '10' }],
            actorId: ACTOR_ID,
        });

        const [row] = await Cutoff.find({ dataset: result?.datasetId }).lean();
        expect(row).toMatchObject({ quota: 'All India', round: 1 });
    });
});

describe('applyDatasetState', () => {
    it('returns null for an unknown dataset', async () => {
        expect(
            await applyDatasetState(String(new Types.ObjectId()), 'publish', ACTOR_ID),
        ).toBeNull();
    });

    it('publishes a version, its rows and the predictor pointer', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id, { state: 'validated' });
        await seedCutoff(predictor._id, dataset._id, { isPublished: false });

        const result = await applyDatasetState(String(dataset._id), 'publish', ACTOR_ID);

        expect(result).toMatchObject({ name: 'JoSAA 2025', version: 1 });

        const stored = await PredictorDataset.findById(dataset._id).lean();
        expect(stored?.state).toBe('published');
        expect(stored?.publishedAt).toBeInstanceOf(Date);
        expect(await Cutoff.countDocuments({ dataset: dataset._id, isPublished: true })).toBe(1);
        expect(String((await Predictor.findById(predictor._id).lean())?.activeDataset)).toBe(
            String(dataset._id),
        );
    });

    it('leaves exactly one published dataset per predictor', async () => {
        const predictor = await seedPredictor();
        const first = await seedDataset(predictor._id, { version: 1, state: 'published' });
        const second = await seedDataset(predictor._id, {
            version: 2,
            name: 'JoSAA 2026',
            state: 'validated',
        });
        await seedCutoff(predictor._id, first._id, { isPublished: true });
        await seedCutoff(predictor._id, second._id, {
            isPublished: false,
            collegeSlug: 'iiit-hyderabad',
        });

        await applyDatasetState(String(second._id), 'publish', ACTOR_ID);

        expect(
            await PredictorDataset.countDocuments({ predictor: predictor._id, state: 'published' }),
        ).toBe(1);
        expect((await PredictorDataset.findById(first._id).lean())?.state).toBe('rolled_back');
        expect(await Cutoff.countDocuments({ dataset: first._id, isPublished: true })).toBe(0);
        expect(await Cutoff.countDocuments({ dataset: second._id, isPublished: true })).toBe(1);
    });

    it('re-publishes the previous version on rollback', async () => {
        const predictor = await seedPredictor();
        const first = await seedDataset(predictor._id, { version: 1, state: 'published' });
        const second = await seedDataset(predictor._id, {
            version: 2,
            name: 'JoSAA 2026',
            state: 'validated',
        });
        await seedCutoff(predictor._id, first._id, { isPublished: true });
        await seedCutoff(predictor._id, second._id, {
            isPublished: false,
            collegeSlug: 'iiit-hyderabad',
        });

        await applyDatasetState(String(second._id), 'publish', ACTOR_ID);
        await applyDatasetState(String(second._id), 'rollback', ACTOR_ID);

        expect((await PredictorDataset.findById(second._id).lean())?.state).toBe('rolled_back');
        expect((await PredictorDataset.findById(first._id).lean())?.state).toBe('published');
        expect(await Cutoff.countDocuments({ dataset: first._id, isPublished: true })).toBe(1);
        expect(await Cutoff.countDocuments({ dataset: second._id, isPublished: true })).toBe(0);
        expect(String((await Predictor.findById(predictor._id).lean())?.activeDataset)).toBe(
            String(first._id),
        );
    });

    it('rolls back the only version without re-publishing anything', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id);
        await seedCutoff(predictor._id, dataset._id, { isPublished: true });

        await applyDatasetState(String(dataset._id), 'rollback', ACTOR_ID);

        expect((await PredictorDataset.findById(dataset._id).lean())?.state).toBe('rolled_back');
        expect(await Cutoff.countDocuments({ isPublished: true })).toBe(0);
        expect(await PredictorDataset.countDocuments({ state: 'published' })).toBe(0);
    });

    it('archives a version and unpublishes its rows', async () => {
        const predictor = await seedPredictor();
        const dataset = await seedDataset(predictor._id);
        await seedCutoff(predictor._id, dataset._id, { isPublished: true });

        await applyDatasetState(String(dataset._id), 'archive', ACTOR_ID);

        expect((await PredictorDataset.findById(dataset._id).lean())?.state).toBe('archived');
        expect(await Cutoff.countDocuments({ dataset: dataset._id, isPublished: true })).toBe(0);
    });
});
