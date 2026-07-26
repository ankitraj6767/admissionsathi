'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Printer, Search, Share2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useComparison } from '@/hooks/use-comparison';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { saveComparisonAction } from '@/actions/comparison.actions';

interface SuggestHit {
    id: string;
    label: string;
    sublabel?: string;
    url: string;
}

/** Add / remove colleges, share the comparison and print it. */
export function ComparisonToolbar({ initialSlugs }: { initialSlugs: string[] }) {
    const router = useRouter();
    const { slugs, add, remove, clear, max } = useComparison(4);
    const [term, setTerm] = useState('');
    const [hits, setHits] = useState<SuggestHit[]>([]);
    const [searching, setSearching] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const debounced = useDebouncedValue(term, 260);

    // Keep the URL and the stored tray in sync.
    useEffect(() => {
        if (initialSlugs.length > 0) {
            initialSlugs.forEach((slug) => add(slug));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            .then((data: { groups?: { hits: SuggestHit[] }[] }) => setHits(data.groups?.[0]?.hits ?? []))
            .catch(() => undefined)
            .finally(() => setSearching(false));
        return () => controller.abort();
    }, [debounced]);

    const applySelection = (next: string[]) => {
        const query = next.length ? `?colleges=${next.join(',')}` : '';
        startTransition(() => router.push(`/compare-colleges${query}`, { scroll: false }));
    };

    const onAdd = (hit: SuggestHit) => {
        const slug = hit.url.split('/').pop() ?? '';
        const result = add(slug);
        if (!result.ok) {
            setNotice(result.error);
            return;
        }
        setNotice(null);
        setTerm('');
        setHits([]);
        applySelection([...slugs.filter((s) => s !== slug), slug]);
    };

    const onRemove = (slug: string) => {
        remove(slug);
        applySelection(slugs.filter((s) => s !== slug));
    };

    const onShare = async () => {
        const response = await saveComparisonAction({ slugs });
        if (response.ok) {
            const url = `${window.location.origin}/compare-colleges?share=${response.data.shareId}`;
            setShareUrl(url);
            try {
                await navigator.clipboard.writeText(url);
                setNotice('Share link copied to clipboard.');
            } catch {
                setNotice('Share link ready below.');
            }
        } else {
            setNotice(response.error);
        }
    };

    return (
        <div className="rounded-panel border border-line bg-white p-3.5 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
                {slugs.map((slug) => (
                    <span
                        key={slug}
                        className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-muted/60 px-2.5 py-1 text-[11.5px] font-semibold text-ink"
                    >
                        {slug.replace(/-/g, ' ')}
                        <button
                            type="button"
                            onClick={() => onRemove(slug)}
                            aria-label={`Remove ${slug} from comparison`}
                            className="text-ink-soft hover:text-red-alert"
                        >
                            <X className="h-3 w-3" aria-hidden />
                        </button>
                    </span>
                ))}

                {slugs.length < max ? (
                    <div className="relative">
                        <span className="relative inline-flex items-center">
                            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink-soft" aria-hidden />
                            <input
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                placeholder="Add a college…"
                                aria-label="Add a college to the comparison"
                                className="h-9 w-[210px] rounded-[9px] border border-line pl-8 pr-8 text-[12.5px] outline-none focus:border-navy-300"
                            />
                            {searching ? (
                                <Loader2 className="absolute right-2.5 h-3.5 w-3.5 animate-spin text-ink-soft" aria-hidden />
                            ) : (
                                <Plus className="absolute right-2.5 h-3.5 w-3.5 text-ink-soft" aria-hidden />
                            )}
                        </span>

                        {hits.length > 0 ? (
                            <ul className="absolute left-0 top-[calc(100%+4px)] z-30 w-[280px] rounded-panel border border-line bg-white p-1.5 shadow-pop">
                                {hits.map((hit) => (
                                    <li key={hit.id}>
                                        <button
                                            type="button"
                                            onClick={() => onAdd(hit)}
                                            className="w-full rounded-[8px] px-2 py-1.5 text-left hover:bg-muted"
                                        >
                                            <span className="block truncate text-[12px] font-semibold text-ink">{hit.label}</span>
                                            {hit.sublabel ? (
                                                <span className="block truncate text-[10.5px] text-ink-soft">{hit.sublabel}</span>
                                            ) : null}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ) : null}

                <span className="ml-auto flex flex-wrap items-center gap-2">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin text-ink-soft" aria-hidden /> : null}
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="h-3.5 w-3.5" aria-hidden />
                        Print / PDF
                    </Button>
                    <Button variant="soft" size="sm" onClick={onShare} disabled={slugs.length < 2}>
                        <Share2 className="h-3.5 w-3.5" aria-hidden />
                        Share
                    </Button>
                    {slugs.length > 0 ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                clear();
                                applySelection([]);
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Clear
                        </Button>
                    ) : null}
                </span>
            </div>

            {notice ? (
                <p role="status" className="mt-2 text-[11.5px] font-semibold text-ink-soft">
                    {notice}
                </p>
            ) : null}
            {shareUrl ? (
                <p className="mt-1 break-all text-[11px] text-navy-600">{shareUrl}</p>
            ) : null}
        </div>
    );
}
