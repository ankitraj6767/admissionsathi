'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import { rescanLinkHealthAction } from '@/actions/admin/seo.actions';
import { formatRelativeTime } from '@/lib/utils';
import type { LinkHealthReport } from '@/services/link-health.service';

const SOURCE_LABELS: Record<string, string> = {
    article: 'Article',
    news: 'News',
    navigation: 'Navigation',
    redirect: 'Redirect',
    page: 'Page',
};

/** Broken internal links, with a link straight to the record that holds each one. */
export function LinkHealthPanel({ report }: { report: LinkHealthReport }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [notice, setNotice] = useState<string | null>(null);

    const rescan = () => {
        startTransition(async () => {
            const result = await rescanLinkHealthAction();
            setNotice(result.ok ? (result.message ?? 'Scan complete.') : result.error);
            router.refresh();
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Badge tone={report.brokenCount > 0 ? 'amber' : 'green'} size="lg">
                    {report.brokenCount} broken
                </Badge>
                <Badge tone="neutral" size="lg">
                    {report.internalChecked} internal checked
                </Badge>
                <Badge tone="neutral" size="lg">
                    {report.externalSkipped} external skipped
                </Badge>
                <button
                    type="button"
                    onClick={rescan}
                    disabled={pending}
                    className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line px-3 text-[12px] font-bold text-ink hover:border-navy-200 disabled:opacity-60"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} aria-hidden />
                    Rescan
                </button>
            </div>

            <p className="text-[11.5px] text-ink-soft">
                Last scan {formatRelativeTime(report.scannedAt)}. Internal links are resolved against published slugs and
                real routes — no outbound requests are made, so external links are counted but not verified.
                {report.truncated ? ' Only the most recently updated records were scanned.' : ''}
            </p>

            <div aria-live="polite">
                {notice ? (
                    <p className="rounded-[10px] border border-line bg-muted px-3 py-2 text-[12px] font-semibold text-ink">
                        {notice}
                    </p>
                ) : null}
            </div>

            {report.brokenCount === 0 ? (
                <p className="rounded-[10px] border border-green-50 bg-green-50 px-3 py-2 text-[12.5px] font-semibold text-green">
                    Every internal link resolves to a live page.
                </p>
            ) : (
                <ul className="divide-y divide-line">
                    {report.broken.map((link, index) => (
                        <li key={`${link.href}-${index}`} className="flex flex-wrap items-center gap-2 py-2 text-[12px]">
                            <Badge tone="neutral">{SOURCE_LABELS[link.sourceType] ?? link.sourceType}</Badge>
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-red-alert">
                                {link.href}
                            </code>
                            <span className="min-w-0 flex-1 truncate text-ink-soft">{link.sourceLabel}</span>
                            <Link href={link.editHref} className="shrink-0 font-bold text-navy-600 hover:text-orange">
                                Fix →
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
