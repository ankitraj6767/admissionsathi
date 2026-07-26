'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, GitCompare } from 'lucide-react';
import { useComparison } from '@/hooks/use-comparison';
import { toggleSavedItemAction } from '@/actions/saved.actions';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

/** Compare + save buttons shared by college cards and the college detail hero. */
export function CollegeCardActions({
    slug,
    name,
    id,
    className,
}: {
    slug: string;
    name: string;
    id: string;
    className?: string;
}) {
    const { has, toggle, slugs } = useComparison(4);
    const [saved, setSaved] = useState<boolean | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const inComparison = has(slug);

    const onCompare = () => {
        const result = toggle(slug);
        setNotice(result.ok ? null : result.error);
    };

    const onSave = () => {
        startTransition(async () => {
            const result = await toggleSavedItemAction({
                entityType: 'college',
                entityId: id,
                entityName: name,
                entitySlug: slug,
            });
            if (result.ok) {
                setSaved(result.data.saved);
                setNotice(result.data.saved ? 'Saved to your dashboard' : 'Removed from saved');
                if (result.data.saved) {
                    track({ name: ANALYTICS_EVENTS.collegeSave, properties: { slug } });
                }
            } else {
                setNotice(result.error);
            }
        });
    };

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <button
                type="button"
                onClick={onCompare}
                aria-pressed={inComparison}
                className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-[9px] border px-3 text-[12px] font-bold transition-colors',
                    inComparison
                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                        : 'border-line bg-white text-ink hover:border-navy-200',
                )}
            >
                <GitCompare className="h-3.5 w-3.5" aria-hidden />
                {inComparison ? 'In comparison' : 'Compare'}
            </button>

            <button
                type="button"
                onClick={onSave}
                disabled={pending}
                aria-pressed={saved ?? false}
                className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-[9px] border px-3 text-[12px] font-bold transition-colors disabled:opacity-60',
                    saved ? 'border-green/40 bg-green-50 text-green' : 'border-line bg-white text-ink hover:border-navy-200',
                )}
            >
                {saved ? (
                    <BookmarkCheck className="h-3.5 w-3.5" aria-hidden />
                ) : (
                    <Bookmark className="h-3.5 w-3.5" aria-hidden />
                )}
                {saved ? 'Saved' : 'Save'}
            </button>

            {inComparison && slugs.length >= 2 ? (
                <Link
                    href={`/compare-colleges?colleges=${slugs.join(',')}`}
                    className="text-[11.5px] font-bold text-orange hover:underline"
                >
                    Compare {slugs.length} →
                </Link>
            ) : null}

            {notice ? (
                <span role="status" className="text-[11px] font-semibold text-ink-soft">
                    {notice}
                </span>
            ) : null}
        </div>
    );
}
