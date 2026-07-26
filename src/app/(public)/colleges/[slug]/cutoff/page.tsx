import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CtaBanner, DataNotice, RichText, SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { getCollegeDetail } from '@/services/college.service';
import { listCutoffsForCollege } from '@/db/repositories/predictor.repository';
import { toPlain } from '@/db/repositories/base.repository';

export default async function CollegeCutoffPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) notFound();

    const { college } = detail;
    const cutoffs = toPlain(await listCutoffsForCollege(college.slug, 300));

    const grouped = cutoffs.reduce<Record<string, typeof cutoffs>>((acc, row) => {
        const key = `${row.examShortName ?? 'Exam'} • ${row.branchName}`;
        acc[key] = [...(acc[key] ?? []), row];
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            <SectionCard title="Previous-year cut-offs" icon="Gauge" description="Closing ranks, percentiles and scores from imported datasets">
                {cutoffs.length === 0 ? (
                    <EmptyState
                        icon="Gauge"
                        title="Cut-off data not published for this college yet"
                        description="Cut-off datasets are imported per exam. Try the predictor for an estimate based on comparable colleges."
                        action={
                            <Link
                                href="/predictors"
                                className="inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-[13px] font-bold text-white"
                            >
                                Open predictors
                            </Link>
                        }
                    />
                ) : (
                    <div className="space-y-5">
                        {Object.entries(grouped)
                            .slice(0, 12)
                            .map(([label, rows]) => (
                                <div key={label}>
                                    <h3 className="mb-2 flex flex-wrap items-center gap-2 text-[13px] font-extrabold text-navy-800">
                                        {label}
                                        <Badge tone="neutral">{rows.length} rows</Badge>
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[12px]">
                                            <thead>
                                                <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-soft">
                                                    <th className="py-2 pr-3">Year</th>
                                                    <th className="py-2 pr-3">Round</th>
                                                    <th className="py-2 pr-3">Category</th>
                                                    <th className="py-2 pr-3">Quota</th>
                                                    <th className="py-2 pr-3">Closing rank</th>
                                                    <th className="py-2 pr-3">Closing percentile</th>
                                                    <th className="py-2">Seats</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.slice(0, 12).map((row) => (
                                                    <tr key={String(row._id)} className="border-b border-line/70 last:border-0">
                                                        <td className="py-2 pr-3 text-ink-soft">{row.year}</td>
                                                        <td className="py-2 pr-3 text-ink-soft">{row.round}</td>
                                                        <td className="py-2 pr-3 font-semibold text-ink">{row.category}</td>
                                                        <td className="py-2 pr-3 text-ink-soft">{row.quota}</td>
                                                        <td className="py-2 pr-3 font-bold text-ink">
                                                            {row.closingRank?.toLocaleString('en-IN') ?? '—'}
                                                        </td>
                                                        <td className="py-2 pr-3 text-ink-soft">
                                                            {row.closingPercentile ? row.closingPercentile.toFixed(2) : '—'}
                                                        </td>
                                                        <td className="py-2 text-ink-soft">{row.seats ?? '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                <DataNotice
                    className="mt-4"
                    note="Cut-off values are imported historical datasets used for estimation only. Actual closing ranks change every year with the seat matrix and applicant pool."
                />
            </SectionCard>

            {college.cutoffHtml ? (
                <SectionCard title="Cut-off notes" icon="Info">
                    <RichText html={college.cutoffHtml} />
                </SectionCard>
            ) : null}

            <CtaBanner
                title="Check your chances at this college"
                description="Run the relevant predictor with your rank, category and quota to see a probability band."
                ctaLabel="Run a predictor"
                ctaUrl="/predictors"
            />
        </div>
    );
}
