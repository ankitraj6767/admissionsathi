import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { SectionCard } from '@/components/shared/content-blocks';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { getTopSearchTerms, getZeroResultTerms } from '@/services/analytics.service';
import { connectToDatabase } from '@/db/connect';
import { SearchQuery, SearchSynonym } from '@/db/models/system.model';
import { toPlain } from '@/db/repositories/base.repository';
import { requirePermissionPage } from '@/lib/auth/session';
import { formatRelativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Search insights' };

export default async function AdminSearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    await requirePermissionPage('analytics.view');
    const params = await searchParams;
    await connectToDatabase();

    const [topTerms, zeroTerms, recent, synonyms] = await Promise.all([
        getTopSearchTerms(30, 15),
        getZeroResultTerms(30, 15),
        SearchQuery.find().sort({ createdAt: -1 }).limit(20).lean().exec().then(toPlain),
        SearchSynonym.find().sort({ term: 1 }).limit(50).lean().exec().then(toPlain),
    ]);

    return (
        <>
            <AdminPageHeader
                title="Search insights"
                description="What visitors search for, which searches return nothing, and the synonym / promoted-result rules that fix them."
                icon="Search"
                breadcrumbs={[{ label: 'Search insights' }]}
                actions={
                    params.q ? (
                        <Link
                            href={`/search?q=${encodeURIComponent(params.q)}`}
                            target="_blank"
                            className="inline-flex h-10 items-center rounded-[10px] border border-line px-4 text-[13px] font-bold text-ink"
                        >
                            Test “{params.q}” on the site
                        </Link>
                    ) : undefined
                }
            />

            <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard title="Top searches — last 30 days" icon="TrendingUp">
                    {topTerms.length === 0 ? (
                        <EmptyState icon="Search" title="No searches recorded yet" className="py-8" />
                    ) : (
                        <ul className="divide-y divide-line text-[12.5px]">
                            {topTerms.map((term) => (
                                <li key={term._id} className="flex items-center justify-between gap-2 py-2">
                                    <Link
                                        href={`/search?q=${encodeURIComponent(term._id)}`}
                                        target="_blank"
                                        className="truncate font-semibold text-ink hover:text-navy-700"
                                    >
                                        {term._id}
                                    </Link>
                                    <span className="flex shrink-0 items-center gap-2">
                                        {term.zero > 0 ? <Badge tone="red">{term.zero} zero-result</Badge> : null}
                                        <span className="font-bold text-navy-700">{term.count}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard
                    title="Zero-result searches"
                    icon="AlertTriangle"
                    description="Fix these with a synonym, promoted result or new content"
                >
                    {zeroTerms.length === 0 ? (
                        <EmptyState icon="CheckCircle2" title="No zero-result searches" className="py-8" />
                    ) : (
                        <ul className="divide-y divide-line text-[12.5px]">
                            {zeroTerms.map((term) => (
                                <li key={term._id} className="flex items-center justify-between gap-2 py-2">
                                    <span className="truncate font-semibold text-ink">{term._id}</span>
                                    <span className="shrink-0 font-bold text-red-alert">{term.count}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard title="Recent searches" icon="Clock">
                    {recent.length === 0 ? (
                        <EmptyState icon="Search" title="No recent searches" className="py-8" />
                    ) : (
                        <ul className="divide-y divide-line text-[12.5px]">
                            {recent.map((row) => (
                                <li key={String(row._id)} className="flex items-center justify-between gap-2 py-2">
                                    <span className="truncate text-ink">{row.term}</span>
                                    <span className="flex shrink-0 items-center gap-2 text-[11px] text-ink-soft">
                                        {row.zeroResults ? <Badge tone="red">0</Badge> : <Badge tone="neutral">{row.resultCount}</Badge>}
                                        {formatRelativeTime(row.createdAt)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard
                    title="Synonyms & promoted results"
                    icon="Link2"
                    description="Managed in MongoDB; the search service expands queries with these rules"
                >
                    {synonyms.length === 0 ? (
                        <div className="space-y-2">
                            <EmptyState
                                icon="Link2"
                                title="No synonym rules yet"
                                description="Add documents to the searchsynonyms collection to map alternate spellings and promote specific results."
                                className="py-6"
                            />
                            <pre className="overflow-x-auto rounded-[10px] bg-navy-800 p-3 text-[11px] text-white/85">
                                {`{
  "term": "btech",
  "synonyms": ["b.tech", "be", "bachelor of technology"],
  "promotedEntityType": "course",
  "promotedLabel": "Bachelor of Technology (B.Tech)",
  "promotedUrl": "/courses/b-tech",
  "status": "active"
}`}
                            </pre>
                        </div>
                    ) : (
                        <ul className="divide-y divide-line text-[12.5px]">
                            {synonyms.map((row) => (
                                <li key={String(row._id)} className="py-2">
                                    <p className="font-bold text-ink">{row.term}</p>
                                    <p className="text-[11.5px] text-ink-soft">{row.synonyms.join(', ')}</p>
                                    {row.promotedUrl ? (
                                        <p className="mt-0.5 text-[11px] text-navy-600">
                                            Promotes: {row.promotedLabel} → {row.promotedUrl}
                                        </p>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
            </div>
        </>
    );
}
