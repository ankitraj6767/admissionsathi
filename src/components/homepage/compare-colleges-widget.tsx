'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Loader2, Plus, Search, X } from 'lucide-react';
import { Card, RatingStars } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { useComparison } from '@/hooks/use-comparison';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatCompactINR, initials } from '@/lib/utils';
import type { MiniCollege } from '@/app/api/colleges/mini/route';

interface SuggestHit {
    id: string;
    label: string;
    sublabel?: string;
    url: string;
}

/**
 * Homepage comparison widget.
 * Selection lives in localStorage (shared with college cards and /compare-colleges)
 * and college details are hydrated from a small public Route Handler.
 */
export function CompareCollegesWidget({
    heading,
    description,
    ctaLabel,
    ctaUrl,
    maxColleges,
    defaultSlugs,
}: {
    heading: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    maxColleges: number;
    defaultSlugs: string[];
}) {
    const { slugs, ready, add, remove } = useComparison(maxColleges);
    const [colleges, setColleges] = useState<MiniCollege[]>([]);
    const [loading, setLoading] = useState(true);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [term, setTerm] = useState('');
    const [hits, setHits] = useState<SuggestHit[]>([]);
    const [searching, setSearching] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const debounced = useDebouncedValue(term, 260);
    const pickerRef = useRef<HTMLDivElement>(null);

    const activeSlugs = slugs.length > 0 ? slugs : defaultSlugs;

    const hydrate = useCallback(async (list: string[]) => {
        setLoading(true);
        try {
            const params = list.length ? `?slugs=${list.join(',')}` : '';
            const res = await fetch(`/api/colleges/mini${params}`);
            const data = (await res.json()) as { colleges: MiniCollege[] };
            setColleges(data.colleges ?? []);
        } catch {
            setColleges([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!ready) return;
        void hydrate(activeSlugs);
    }, [ready, activeSlugs.join(','), hydrate]);

    useEffect(() => {
        if (debounced.trim().length < 2) {
            setHits([]);
            return;
        }
        setSearching(true);
        const controller = new AbortController();
        fetch(`/api/search/suggest?q=${encodeURIComponent(debounced.trim())}&types=college`, {
            signal: controller.signal,
        })
            .then((res) => res.json())
            .then((data: { groups?: { hits: SuggestHit[] }[] }) => {
                setHits(data.groups?.[0]?.hits ?? []);
            })
            .catch(() => undefined)
            .finally(() => setSearching(false));
        return () => controller.abort();
    }, [debounced]);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const onPick = (hit: SuggestHit) => {
        const slug = hit.url.split('/').pop() ?? '';
        const result = add(slug);
        if (!result.ok) setNotice(result.error);
        else setNotice(null);
        setTerm('');
        setHits([]);
        setPickerOpen(false);
    };

    const compareUrl =
        activeSlugs.length >= 2
            ? `/compare-colleges?colleges=${activeSlugs.join(',')}`
            : (ctaUrl ?? '/compare-colleges');

    return (
        <Card as="section" aria-labelledby="compare-heading" className="h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h2 id="compare-heading" className="section-title text-[15px] md:text-[17px]">
                        {heading}
                    </h2>
                    {description ? <p className="mt-0.5 text-[11.5px] text-ink-soft">{description}</p> : null}
                </div>
                <Link href={compareUrl} className="link-more mt-1 shrink-0">
                    {ctaLabel ?? 'View Comparison'}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-[126px] animate-pulse rounded-[14px] border border-line bg-muted/60" />
                    ))
                ) : (
                    colleges.slice(0, maxColleges).map((college) => (
                        <div
                            key={college.id}
                            className="relative flex min-h-[126px] flex-col items-center rounded-[14px] border border-line bg-white px-2 py-3 text-center"
                        >
                            <button
                                type="button"
                                onClick={() => remove(college.slug)}
                                aria-label={`Remove ${college.name} from comparison`}
                                className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-ink-soft transition-colors hover:bg-red-50 hover:text-red-alert"
                            >
                                <X className="h-3 w-3" aria-hidden />
                            </button>

                            <span className="mb-1.5 inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-line bg-navy-50 text-[10px] font-bold text-navy-700">
                                {college.logoUrl ? (
                                    <Image
                                        src={college.logoUrl}
                                        alt=""
                                        width={36}
                                        height={36}
                                        className="h-9 w-9 object-contain"
                                    />
                                ) : (
                                    initials(college.shortName ?? college.name)
                                )}
                            </span>

                            <Link
                                href={`/colleges/${college.slug}`}
                                className="line-clamp-2 text-[11px] font-bold leading-tight text-ink hover:text-navy-700"
                            >
                                {college.shortName ?? college.name}
                            </Link>
                            <span className="mt-0.5 text-[9px] text-ink-soft">{college.ownership}</span>

                            <span className="mt-1.5">
                                <RatingStars value={college.rating} size="sm" showValue />
                            </span>

                            <span className="mt-1 text-[9.5px] font-semibold text-ink-soft">
                                Fees: {college.annualFee ? `${formatCompactINR(college.annualFee)}/Year` : '—'}
                            </span>
                        </div>
                    ))
                )}

                {/* Add slot */}
                {colleges.length < maxColleges ? (
                    <div ref={pickerRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setPickerOpen((o) => !o)}
                            aria-expanded={pickerOpen}
                            className="flex h-full min-h-[126px] w-full flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-line bg-muted/40 text-ink-soft transition-colors hover:border-orange-200 hover:bg-orange-50/60 hover:text-orange-700"
                        >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white">
                                <Plus className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="text-[10.5px] font-bold">Add College</span>
                        </button>

                        {pickerOpen ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 w-[260px] rounded-panel border border-line bg-white p-2 shadow-pop">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" aria-hidden />
                                    <input
                                        autoFocus
                                        value={term}
                                        onChange={(e) => setTerm(e.target.value)}
                                        placeholder="Search colleges…"
                                        aria-label="Search colleges to compare"
                                        className="h-9 w-full rounded-[8px] border border-line pl-8 pr-8 text-[12.5px] outline-none focus:border-navy-300"
                                    />
                                    {searching ? (
                                        <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-ink-soft" aria-hidden />
                                    ) : null}
                                </div>

                                <ul className="mt-1.5 max-h-56 overflow-y-auto">
                                    {hits.map((hit) => (
                                        <li key={hit.id}>
                                            <button
                                                type="button"
                                                onClick={() => onPick(hit)}
                                                className="w-full rounded-[8px] px-2 py-1.5 text-left hover:bg-muted"
                                            >
                                                <span className="block truncate text-[12px] font-semibold text-ink">{hit.label}</span>
                                                {hit.sublabel ? (
                                                    <span className="block truncate text-[10.5px] text-ink-soft">{hit.sublabel}</span>
                                                ) : null}
                                            </button>
                                        </li>
                                    ))}
                                    {term.trim().length >= 2 && hits.length === 0 && !searching ? (
                                        <li className="px-2 py-3 text-center text-[11.5px] text-ink-soft">No colleges found</li>
                                    ) : null}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {notice ? (
                <p role="alert" className="mt-2 text-[11.5px] font-semibold text-orange-700">
                    {notice}
                </p>
            ) : null}

            <div className={cn('mt-3 flex items-center justify-between gap-2 border-t border-line pt-3')}>
                <p className="text-[11px] text-ink-soft">
                    {activeSlugs.length < 2
                        ? 'Pick at least 2 colleges to compare fees, ranking and placements.'
                        : `${activeSlugs.length} college${activeSlugs.length > 1 ? 's' : ''} selected`}
                </p>
                <Button asChild size="xs" variant={activeSlugs.length >= 2 ? 'primary' : 'outline'}>
                    <Link href={compareUrl}>Compare Now</Link>
                </Button>
            </div>
        </Card>
    );
}
