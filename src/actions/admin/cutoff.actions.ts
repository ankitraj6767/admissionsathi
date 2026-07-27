'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
    cutoffImportSchema,
    datasetActionSchema,
    REQUIRED_CUTOFF_COLUMNS,
} from '@/schemas/predictor.schema';
import {
    applyDatasetState,
    findUnmatchedCollegeNames,
    importCutoffDataset,
    removeDataset,
} from '@/services/predictor.service';
import { requirePermission } from '@/lib/auth/session';
import { recordAudit } from '@/services/audit.service';
import { CACHE_TAGS } from '@/lib/cache';
import { invalidateTags } from '@/lib/revalidate';
import { NotFoundError, fail, runAction, succeed } from '@/lib/action-helpers';
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
        const unmatchedColleges = await findUnmatchedCollegeNames(Array.from(collegeNames));

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

        const result = await importCutoffDataset({
            predictorId: data.predictorId,
            name: data.name,
            year: data.year,
            sourceNote: data.sourceNote,
            columnMapping: data.columnMapping,
            rows: data.rows,
            actorId: actor.id,
        });
        if (!result) throw new NotFoundError('Predictor not found.');

        await recordAudit({
            actor,
            action: 'cutoff.import',
            entity: 'PredictorDataset',
            entityId: result.datasetId,
            entityLabel: `${result.predictorName} v${result.version}`,
            newValues: { rows: result.inserted, skipped: result.skipped, year: data.year },
        });

        revalidatePath('/admin/cutoff-datasets');

        return succeed(
            { datasetId: result.datasetId, inserted: result.inserted, skipped: result.skipped },
            `Imported ${result.inserted} row(s) into version ${result.version}. Publish it to make predictions use this data.`,
        );
    });
}

/** Publish / rollback / archive a dataset version. */
export async function datasetStateAction(input: unknown): Promise<ActionResult<{ datasetId: string }>> {
    return runAction({ action: 'admin.cutoff.state' }, async () => {
        const actor = await requirePermission('cutoff.publish');
        const data = datasetActionSchema.parse(input);

        const dataset = await applyDatasetState(data.datasetId, data.action, actor.id);
        if (!dataset) throw new NotFoundError('Dataset not found.');

        await recordAudit({
            actor,
            action: `cutoff.${data.action}`,
            entity: 'PredictorDataset',
            entityId: dataset.datasetId,
            entityLabel: `${dataset.name} v${dataset.version}`,
        });

        invalidateTags([CACHE_TAGS.predictors]);
        revalidatePath('/admin/cutoff-datasets');
        revalidatePath('/predictors');

        return succeed({ datasetId: dataset.datasetId }, `Dataset ${data.action} complete.`);
    });
}

const deleteDatasetSchema = z.object({ datasetId: z.string().min(1) });

export async function deleteDatasetAction(input: unknown): Promise<ActionResult<{ datasetId: string }>> {
    return runAction({ action: 'admin.cutoff.delete' }, async () => {
        const actor = await requirePermission('cutoff.publish');
        const data = deleteDatasetSchema.parse(input);

        const result = await removeDataset(data.datasetId);
        if (!result.ok) {
            if (result.code === 'NOT_FOUND') throw new NotFoundError('Dataset not found.');
            return fail('Roll back the dataset before deleting it.', 'CONFLICT');
        }

        await recordAudit({
            actor,
            action: 'cutoff.delete_dataset',
            entity: 'PredictorDataset',
            entityId: result.datasetId,
            entityLabel: `${result.name} v${result.version}`,
        });

        revalidatePath('/admin/cutoff-datasets');
        return succeed({ datasetId: data.datasetId }, 'Dataset deleted.');
    });
}
