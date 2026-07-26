import Link from 'next/link';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { requireAuthPage } from '@/lib/auth/session';
import { listUserPredictionSessions } from '@/services/predictor.service';
import { formatDate } from '@/lib/utils';
import { PROBABILITY_BAND_META, type ProbabilityBand } from '@/config/constants';

export default async function PredictionHistoryPage() {
    const actor = await requireAuthPage();
    const sessions = await listUserPredictionSessions(actor.id, 30);

    if (sessions.length === 0) {
        return (
            <SectionCard title="Predictor history" icon="Target">
                <EmptyState
                    icon="Target"
                    title="No predictor runs yet"
                    description="Run a predictor to see the colleges where your chances are strongest."
                    action={
                        <Link
                            href="/predictors"
                            className="inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-[13px] font-bold text-white"
                        >
                            Open predictors
                        </Link>
                    }
                />
            </SectionCard>
        );
    }

    return (
        <div className="space-y-4">
            {sessions.map((session) => {
                const inputs = session.inputs as Record<string, unknown>;
                const rows = (session.results ?? []) as {
                    collegeName: string;
                    branchName: string;
                    band: ProbabilityBand;
                    previousClosing?: number;
                    collegeSlug?: string;
                }[];

                return (
                    <SectionCard
                        key={String(session._id)}
                        title={session.predictorSlug.replace(/-/g, ' ')}
                        icon="Target"
                        description={`${session.resultCount} results • ${formatDate(session.createdAt)}`}
                        actions={
                            <Link href={`/predictors/${session.predictorSlug}`} className="link-more">
                                Run again →
                            </Link>
                        }
                    >
                        <p className="mb-3 flex flex-wrap gap-2 text-[11.5px] text-ink-soft">
                            {Object.entries(inputs)
                                .filter(([key]) => !['predictorSlug', 'anonymousId'].includes(key))
                                .filter(([, value]) => value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0))
                                .map(([key, value]) => (
                                    <span key={key} className="rounded-pill border border-line px-2 py-0.5">
                                        <span className="font-semibold text-ink">{key}:</span>{' '}
                                        {Array.isArray(value) ? value.join(', ') : String(value)}
                                    </span>
                                ))}
                        </p>

                        <ul className="space-y-1.5">
                            {rows.slice(0, 8).map((row, index) => (
                                <li
                                    key={`${row.collegeName}-${index}`}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-[9px] border border-line px-3 py-2"
                                >
                                    <span className="min-w-0">
                                        {row.collegeSlug ? (
                                            <Link
                                                href={`/colleges/${row.collegeSlug}`}
                                                className="block truncate text-[12.5px] font-bold text-ink hover:text-navy-700"
                                            >
                                                {row.collegeName}
                                            </Link>
                                        ) : (
                                            <span className="block truncate text-[12.5px] font-bold text-ink">{row.collegeName}</span>
                                        )}
                                        <span className="block truncate text-[11px] text-ink-soft">{row.branchName}</span>
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Badge
                                            tone={
                                                row.band === 'very_high' || row.band === 'high'
                                                    ? 'green'
                                                    : row.band === 'moderate'
                                                        ? 'amber'
                                                        : 'orange'
                                            }
                                        >
                                            {PROBABILITY_BAND_META[row.band]?.label ?? row.band}
                                        </Badge>
                                        {row.previousClosing ? (
                                            <span className="text-[11px] text-ink-soft">
                                                prev {row.previousClosing.toLocaleString('en-IN')}
                                            </span>
                                        ) : null}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                );
            })}
        </div>
    );
}
