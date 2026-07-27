import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { CutoffImport, type DatasetRow } from '@/components/admin/cutoff-import';
import { SectionCard } from '@/components/shared/content-blocks';
import { getCutoffDatasetScreenData } from '@/services/predictor.service';
import { requirePermissionPage } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Cut-off datasets' };

export default async function AdminCutoffDatasetsPage() {
    await requirePermissionPage('cutoff.import');

    const { predictors, datasets } = await getCutoffDatasetScreenData();
    const rows: DatasetRow[] = datasets;

    return (
        <>
            <AdminPageHeader
                title="Cut-off datasets"
                description="Import previous-year closing data per predictor, validate it, preview rows, then publish. Only one version per predictor is live at a time — rollback restores the previous one."
                icon="Database"
                breadcrumbs={[{ label: 'Cut-off datasets' }]}
            />

            <CutoffImport predictors={predictors} datasets={rows} />

            <SectionCard className="mt-4" title="CSV format" icon="FileStack">
                <p className="text-[12.5px] text-ink-soft">
                    Any column order works — you map columns after upload. Required columns are{' '}
                    <code className="font-mono text-[11.5px]">collegeName</code>,{' '}
                    <code className="font-mono text-[11.5px]">branchName</code> and{' '}
                    <code className="font-mono text-[11.5px]">category</code>, plus at least one closing metric
                    (rank, percentile or score).
                </p>
                <pre className="mt-2 overflow-x-auto rounded-[10px] bg-navy-800 p-3 text-[11px] leading-relaxed text-white/85">
                    {`College,Branch,Category,Quota,Round,Closing Rank,Closing Percentile,Seats,Annual Fee
Northfield Institute of Technology,Computer Science & Engineering,General,All India,1,18452,98.412,60,185000
Northfield Institute of Technology,Computer Science & Engineering,OBC-NCL,All India,1,26890,97.104,32,185000`}
                </pre>
            </SectionCard>
        </>
    );
}
