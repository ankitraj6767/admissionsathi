import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui/primitives';
import { TRENDING_CATEGORY_LABELS, type TrendingCategory } from '@/config/constants';
import { formatDate } from '@/lib/utils';
import type { NewsPostDoc } from '@/db/models/content.model';
import type { ResolvedSection } from '@/services/homepage.service';
import type { TrendingConfig } from '@/schemas/homepage.schema';

const badgeTone: Record<string, string> = {
    New: 'bg-orange text-white',
    Hot: 'bg-pink text-white',
    Live: 'bg-green text-white',
    Update: 'bg-blue text-white',
    'Closing Soon': 'bg-red-alert text-white',
};

/** "Trending Now" feed — counselling, exam dates, results and deadlines. */
export function TrendingPanel({
    section,
    updates,
}: {
    section: ResolvedSection<TrendingConfig>;
    updates: NewsPostDoc[];
}) {
    return (
        <Card as="section" aria-labelledby="trending-heading" className="flex h-full flex-col" padded={false}>
            <div className="flex items-center gap-1.5 border-b border-line px-3.5 py-3">
                <Flame className="h-4 w-4 text-orange" aria-hidden />
                <h2 id="trending-heading" className="text-[13.5px] font-extrabold text-navy-800">
                    {section.heading ?? 'Trending Now'}
                </h2>
            </div>

            {updates.length === 0 ? (
                <div className="p-3">
                    <EmptyState
                        icon="Newspaper"
                        title="No updates yet"
                        description="Publish news items from the admin to fill this feed."
                        className="py-8"
                    />
                </div>
            ) : (
                <ul className="flex-1 divide-y divide-line">
                    {updates.map((update) => {
                        const href = update.internalUrl ?? update.externalUrl ?? `/news/${update.slug}`;
                        const external = Boolean(update.externalUrl && !update.internalUrl);
                        return (
                            <li key={String(update._id)}>
                                <Link
                                    href={href}
                                    target={external ? '_blank' : undefined}
                                    rel={external ? 'noopener noreferrer' : undefined}
                                    className="group block px-3.5 py-2.5 transition-colors hover:bg-muted/60"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="line-clamp-2 text-[12px] font-bold leading-snug text-ink group-hover:text-navy-700">
                                            {update.title}
                                        </p>
                                        {update.badge ? (
                                            <span
                                                className={`shrink-0 rounded-pill px-1.5 py-0.5 text-[8.5px] font-bold uppercase ${badgeTone[update.badge] ?? 'bg-muted text-ink-soft'
                                                    }`}
                                            >
                                                {update.badge}
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-soft">
                                        <span className="font-semibold text-navy-600">
                                            {TRENDING_CATEGORY_LABELS[update.category as TrendingCategory] ?? update.category}
                                        </span>
                                        <span aria-hidden>•</span>
                                        <span>{formatDate(update.publishDate, { day: '2-digit', month: 'short' })}</span>
                                    </p>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}

            {section.ctaLabel && section.ctaUrl ? (
                <div className="border-t border-line p-2">
                    <Link
                        href={section.ctaUrl}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-[9px] bg-muted text-[11.5px] font-bold text-navy-700 transition-colors hover:bg-navy-50"
                    >
                        {section.ctaLabel}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                </div>
            ) : null}
        </Card>
    );
}
