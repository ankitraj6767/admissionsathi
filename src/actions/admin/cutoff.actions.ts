'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { connectToDatabase } from '@/db/connect';
import { Cutoff, Predictor, PredictorDataset } from '@/db/models/predictor.model';
import { College } from '@/db/models/college.model';
import {
    cutoffImportSchema,
    datasetActionSchema,
    REQUIRED_CUTOFF_COLUMNS,
} from '@/schemas/predictor.schema';
import { requirePermission } from '@/lib/auth/session';
import { recordAudit } from '@/services/audit.service';
import { CACHE_TAGS } from '@/lib/cache';
import { invalidateTags } from '@/lib/revalidate';
import { NotFoundError, fail, runAction, succeed } from '@/lib/action-helpers';
import { DEMO_DATA_NOTICE } from '@/config/constants';
import type { ActionResult } from '@/types/common';

export interface ValidationIssue {
    row: number;
    message: string;
}

export interface ImportPreview {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    issues: ValidationIssue[];
    sample: Record<string, string | number>[];
    unmatchedColleges: string[];
}

const numeric = (value?: string) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Validates an uploaded CSV against the column mapping without writing anything.
 * The admin sees the issues and a sample before committing.
 */
export async function validateCutoffImportAction(input: unknown): Promise<ActionResult<ImportPreview>> {
    return runAction({ action: 'admin.cutoff.validate' }, async () => {
        await requirePermission('cutoff.import');
        const data = cutoffImportSchema.parse(input);

        const missing = REQUIRED_CUTOFF_COLUMNS.filter((column) => !data.columnMapping[column]);
        if (missing.length > 0) {
            return fail(`Map these required columns first: ${missing.join(', ')}`, 'VALIDATION');
        }

        const issues: ValidationIssue[] = [];
        const sample: Record<string, string | number>[] = [];
        const collegeNames = new Set<string>();
        let validRows = 0;

        data.rows.forEach((row, index) => {
            const rowNumber = index + 2; // account for the header row
            const get = (key: string) => (data.columnMapping[key] ? row[data.columnMapping[key]!] : undefined);

            const collegeName = get('collegeName')?.trim();
            const branchName = get('branchName')?.trim();
            const category = get('category')?.trim();
            const closingRank = numeric(get('closingRank'));
            const closingPercentile = numeric(get('closingPercentile'));
            const closingScore = numeric(get('closingScore'));

            if (!collegeName) issues.push({ row: rowNumber, message: 'College name is empty' });
            if (!branchName) issues.push({ row: rowNumber, message: 'Branch name is empty' });
            if (!category) issues.push({ row: rowNumber, message: 'Category is empty' });
            if (closingRank === undefined && closingPercentile === undefined && closingScore === undefined) {
                issues.push({ row: rowNumber, message: 'No closing rank, percentile or score provided' });
            }
            if (closingPercentile !== undefined && (closingPercentile < 0 || closingPercentile > 100)) {
                issues.push({ row: rowNumber, message: 'Closing percentile must be between 0 and 100' });
            }

            const hadIssue = issues.some((issue) => issue.row === rowNumber);
            if (!hadIssue) {
                validRows += 1;
                if (collegeName) collegeNames.add(collegeName);
                if (sample.length < 8) {
                    sample.push({
                        collegeName: collegeName ?? '',
                        branchName: branchName ?? '',
                        category: category ?? '',
                        quota: get('quota') ?? 'All India',
                        round: numeric(get('round')) ?? 1,
                        closingRank: closingRank ?? '',
                        closingPercentile: closingPercentile ?? '',
                        closingScore: closingScore ?? '',
                    });
                }
            }
        });

        // Which college names will not link to a College document?
        await connectToDatabase();
        const names = Array.from(collegeNames).slice(0, 500);
        const matched = await College.find({ name: { $in: names } }).select('name').lean().exec();
        const matchedSet = new Set(matched.map((row) => row.name));
        const unmatchedColleges = names.filter((name) => !matchedSet.has(name)).slice(0, 25);

        return succeed({
            totalRows: data.rows.length,
            validRows,
            invalidRows: data.rows.length - validRows,
            issues: issues.slice(0, 100),
            sample,
            unmatchedColleges,
        });
    });
}

/** Creates a new dataset version and inserts the valid rows (unpublished). */
export async function importCutoffDatasetAction(
    input: unknown,
): Promise<ActionResult<{ datasetId: string; inserted: number; skipped: number }>> {
    return runAction({ action: 'admin.cutoff.import' }, async () => {
        const actor = await requirePermission('cutoff.import');
        const data = cutoffImportSchema.parse(input);

        await connectToDatabase();
        const predictor = await Predictor.findById(data.predictorId).lean().exec();
        if (!predictor) throw new NotFoundError('Predictor not found.');

        const latest = await PredictorDataset.findOne({ predictor: predictor._id })
            .sort({ version: -1 })
            .select('version')
            .lean()
            .exec();

        const dataset = await PredictorDataset.create({
            predictor: predictor._id,
            name: data.name,
            version: (latest?.version ?? 0) + 1,
            year: data.year,
            sourceNote: data.sourceNote ?? DEMO_DATA_NOTICE,
            columnMapping: data.columnMapping,
            state: 'validated',
            createdBy: actor.id,
        });

        const collegeDocs = await College.find({}).select('name slug _id cityName stateName ownership feeRange ranking').lean().exec();
        const collegeByName = new Map(collegeDocs.map((row) => [row.name.toLowerCase(), row]));

        const rows: Record<string, unknown>[] = [];
        const errors: ValidationIssue[] = [];

        data.rows.forEach((row, index) => {
            const get = (key: string) => (data.columnMapping[key] ? row[data.columnMapping[key]!] : undefined);
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
                year: data.year,
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

        if (rows.length > 0) {
            await Cutoff.insertMany(rows, { ordered: false });
        }

        await PredictorDataset.updateOne(
            { _id: dataset._id },
            {
                $set: {
                    rowCount: data.rows.length,
                    validRowCount: rows.length,
                    invalidRowCount: errors.length,
                    validationErrors: errors.slice(0, 200),
                },
            },
        ).exec();

        await recordAudit({
            actor,
            action: 'cutoff.import',
            entity: 'PredictorDataset',
            entityId: String(dataset._id),
            entityLabel: `${predictor.name} v${dataset.version}`,
            newValues: { rows: rows.length, skipped: errors.length, year: data.year },
        });

        revalidatePath('/admin/cutoff-datasets');

        return succeed(
            { datasetId: String(dataset._id), inserted: rows.length, skipped: errors.length },
            `Imported ${rows.length} row(s) into version ${dataset.version}. Publish it to make predictions use this data.`,
        );
    });
}

/** Publish / rollback / archive a dataset version. */
export async function datasetStateAction(input: unknown): Promise<ActionResult<{ datasetId: string }>> {
    return runAction({ action: 'admin.cutoff.state' }, async () => {
        const actor = await requirePermission('cutoff.publish');
        const data = datasetActionSchema.parse(input);

        await connectToDatabase();
        const dataset = await PredictorDataset.findById(data.datasetId).exec();
        if (!dataset) throw new NotFoundError('Dataset not found.');

        if (data.action === 'publish') {
            // Only one published dataset per predictor.
            await PredictorDataset.updateMany(
                { predictor: dataset.predictor, _id: { $ne: dataset._id }, state: 'published' },
                { $set: { state: 'rolled_back' } },
            ).exec();
            await Cutoff.updateMany({ predictor: dataset.predictor }, { $set: { isPublished: false } }).exec();
            await Cutoff.updateMany({ dataset: dataset._id }, { $set: { isPublished: true } }).exec();

            dataset.state = 'published';
            dataset.publishedAt = new Date();
            dataset.publishedBy = actor.id as never;
            await dataset.save();

            await Predictor.updateOne({ _id: dataset.predictor }, { $set: { activeDataset: dataset._id } }).exec();
        } else if (data.action === 'rollback') {
            await Cutoff.updateMany({ dataset: dataset._id }, { $set: { isPublished: false } }).exec();
            dataset.state = 'rolled_back';
            await dataset.save();

            // Re-publish the previous published version, if any.
            const previous = await PredictorDataset.findOne({
                predictor: dataset.predictor,
                _id: { $ne: dataset._id },
                state: 'rolled_back',
            })
                .sort({ version: -1 })
                .exec();

            if (previous) {
                previous.state = 'published';
                await previous.save();
                await Cutoff.updateMany({ dataset: previous._id }, { $set: { isPublished: true } }).exec();
                await Predictor.updateOne({ _id: dataset.predictor }, { $set: { activeDataset: previous._id } }).exec();
            }
        } else {
            dataset.state = 'archived';
            await dataset.save();
            await Cutoff.updateMany({ dataset: dataset._id }, { $set: { isPublished: false } }).exec();
        }

        await recordAudit({
            actor,
            action: `cutoff.${data.action}`,
            entity: 'PredictorDataset',
            entityId: String(dataset._id),
            entityLabel: `${dataset.name} v${dataset.version}`,
        });

        invalidateTags([CACHE_TAGS.predictors]);
        revalidatePath('/admin/cutoff-datasets');
        revalidatePath('/predictors');

        return succeed({ datasetId: String(dataset._id) }, `Dataset ${data.action} complete.`);
    });
}

const deleteDatasetSchema = z.object({ datasetId: z.string().min(1) });

export async function deleteDatasetAction(input: unknown): Promise<ActionResult<{ datasetId: string }>> {
    return runAction({ action: 'admin.cutoff.delete' }, async () => {
        const actor = await requirePermission('cutoff.publish');
        const data = deleteDatasetSchema.parse(input);

        await connectToDatabase();
        const dataset = await PredictorDataset.findById(data.datasetId).lean().exec();
        if (!dataset) throw new NotFoundError('Dataset not found.');
        if (dataset.state === 'published') {
            return fail('Roll back the dataset before deleting it.', 'CONFLICT');
        }

        await Cutoff.deleteMany({ dataset: dataset._id }).exec();
        await PredictorDataset.deleteOne({ _id: dataset._id }).exec();

        await recordAudit({
            actor,
            action: 'cutoff.delete_dataset',
            entity: 'PredictorDataset',
            entityId: String(dataset._id),
            entityLabel: `${dataset.name} v${dataset.version}`,
        });

        revalidatePath('/admin/cutoff-datasets');
        return succeed({ datasetId: data.datasetId }, 'Dataset deleted.');
    });
}
