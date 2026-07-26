'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useRecentSearches } from '@/hooks/use-recent-searches';
import { getAnonymousId, track } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

interface SearchHit {
    type: string;
    id: string;
    label: string;
    sublabel?: string;
    url: string;
    meta?: string;
    badge?: string;
}

interface SearchGroup {
    type: string;
    label: string;
    hits: SearchHit[];
}

const TYPE_ICONS: Record<string, string> = {
    college: 'Building2',
    course: 'GraduationCap',
    exam: 'FileText',
    article: 'Newspaper',
    scholarship: 'Award',
    predictor: 'Target',
    city: 'MapPin',
    state: 'Map',
};

/** Highlights the matched substring without using dangerouslySetInnerHTML. */
function Highlighted({ text, term }: { text: string; term: string }) {
    if (!term) return <>{text}</>;
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, index)}
            <mark className="rounded bg-orange-100 px-0.5 text-orange-700">
                {text.slice(index, index + term.length)}
            </mark>
            {text.slice(index + term.length)}
        </>
    );
}

export interface SearchBoxProps {
    placeholder?: string;
    autoFocus?: boolean;
    size?: 'md' | 'lg';
    className?: string;
    onNavigate?: () => void;
    showRecent?: boolean;
    types?: string[];
    ariaLabel?: string;
}

/**
 * Debounced, keyboard-navigable autocomplete.
 * Results are fetched from `/api/search/suggest` (public Route Handler) with
 * request cancellation so fast typing never renders stale results.
 */
export function SearchBox({
    placeholder = 'Search Course, College, Exam or Keyword…',
    autoFocus = false,
    size = 'lg',
    className,
    onNavigate,
    showRecent = true,
    types,
    ariaLabel = 'Search courses, colleges and exams',
}: SearchBoxProps) {
    const router = useRouter();
    const [term, setTerm] = useState('');
    const [groups, setGroups] = useState<SearchGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const debounced = useDebouncedValue(term, 260);
    const { recent, push, clear } = useRecentSearches();
    const abortRef = useRef<AbortController | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const listId = 'search-suggestions';

    const flatHits = useMemo(() => groups.flatMap((g) => g.hits), [groups]);

    useEffect(() => {
        if (debounced.trim().length < 2) {
            setGroups([]);
            setLoading(false);
            return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);

        const params = new URLSearchParams({ q: debounced.trim(), log: '1', aid: getAnonymousId() });
        if (types?.length) params.set('types', types.join(','));

        fetch(`/api/search/suggest?${params.toString()}`, { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : { groups: [], total: 0 }))
            .then((data: { groups?: SearchGroup[]; total?: number }) => {
                setGroups(data.groups ?? []);
                setActiveIndex(-1);
                track({
                    name: (data.total ?? 0) === 0 ? ANALYTICS_EVENTS.searchZeroResults : ANALYTICS_EVENTS.search,
                    properties: { term: debounced.trim(), results: data.total ?? 0 },
                });
            })
            .catch(() => undefined)
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [debounced, types]);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const goTo = useCallback(
        (hit: SearchHit) => {
            push(term);
            track({
                name: ANALYTICS_EVENTS.searchResultClick,
                properties: { term, type: hit.type, url: hit.url },
            });
            setOpen(false);
            onNavigate?.();
            router.push(hit.url);
        },
        [onNavigate, push, router, term],
    );

    const submitSearch = useCallback(
        (value: string) => {
            const clean = value.trim();
            if (clean.length < 2) return;
            push(clean);
            setOpen(false);
            onNavigate?.();
            router.push(`/search?q=${encodeURIComponent(clean)}`);
        },
        [onNavigate, push, router],
    );

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.min(i + 1, flatHits.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const hit = flatHits[activeIndex];
            if (hit) goTo(hit);
            else submitSearch(term);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const heightClass = size === 'lg' ? 'h-12' : 'h-11';
    const showPanel = open && (term.trim().length >= 2 || (showRecent && recent.length > 0));
    let runningIndex = -1;

    return (
        <div ref={containerRef} className={cn('relative w-full', className)}>
            <div className="relative">
                <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
                    aria-hidden
                />
                <input
                    type="search"
                    role="combobox"
                    aria-expanded={showPanel}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-label={ariaLabel}
                    autoFocus={autoFocus}
                    value={term}
                    placeholder={placeholder}
                    onChange={(e) => {
                        setTerm(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    className={cn(
                        'w-full rounded-[10px] border border-line bg-white pl-10 pr-20 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-soft/85 focus:border-navy-300 focus:ring-2 focus:ring-navy-100',
                        heightClass,
                    )}
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin text-ink-soft" aria-hidden /> : null}
                    {term ? (
                        <button
                            type="button"
                            onClick={() => {
                                setTerm('');
                                setGroups([]);
                            }}
                            aria-label="Clear search"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-muted"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => submitSearch(term)}
                        className="inline-flex h-8 items-center rounded-[8px] bg-navy px-3 text-[12px] font-semibold text-white hover:bg-navy-800"
                    >
                        Search
                    </button>
                </div>
            </div>

            {showPanel ? (
                <div
                    id={listId}
                    role="listbox"
                    className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(70vh,460px)] overflow-y-auto rounded-panel border border-line bg-white p-2 shadow-pop"
                >
                    {term.trim().length < 2 && recent.length > 0 ? (
                        <div className="px-1.5 py-1">
                            <div className="mb-1 flex items-center justify-between">
                                <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-soft">
                                    Recent searches
                                </p>
                                <button
                                    type="button"
                                    onClick={clear}
                                    className="text-[11px] font-semibold text-ink-soft hover:text-orange"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {recent.map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => {
                                            setTerm(r);
                                        }}
                                        className="chip"
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {term.trim().length >= 2 && groups.length === 0 && !loading ? (
                        <div className="px-3 py-6 text-center">
                            <p className="text-[13px] font-semibold text-ink">No matches for “{term.trim()}”</p>
                            <p className="mt-1 text-[12px] text-ink-soft">
                                Try a shorter keyword, or{' '}
                                <button
                                    type="button"
                                    className="font-semibold text-orange hover:underline"
                                    onClick={() => submitSearch(term)}
                                >
                                    search all content
                                </button>
                                .
                            </p>
                        </div>
                    ) : null}

                    {groups.map((group) => (
                        <div key={`${group.type}-${group.label}`} className="mb-1 last:mb-0">
                            <p className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-ink-soft">
                                {group.label}
                            </p>
                            <ul>
                                {group.hits.map((hit) => {
                                    runningIndex += 1;
                                    const index = runningIndex;
                                    return (
                                        <li key={`${hit.type}-${hit.id}`}>
                                            <button
                                                type="button"
                                                role="option"
                                                aria-selected={index === activeIndex}
                                                onMouseEnter={() => setActiveIndex(index)}
                                                onClick={() => goTo(hit)}
                                                className={cn(
                                                    'flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left transition-colors',
                                                    index === activeIndex ? 'bg-navy-50' : 'hover:bg-muted',
                                                )}
                                            >
                                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-navy-50 text-navy-700">
                                                    <Icon name={TYPE_ICONS[hit.type] ?? 'Search'} className="h-4 w-4" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13px] font-semibold text-ink">
                                                        <Highlighted text={hit.label} term={term.trim()} />
                                                    </span>
                                                    {hit.sublabel ? (
                                                        <span className="block truncate text-[11.5px] text-ink-soft">{hit.sublabel}</span>
                                                    ) : null}
                                                </span>
                                                {hit.meta ? (
                                                    <span className="shrink-0 text-[11px] font-semibold text-ink-soft">{hit.meta}</span>
                                                ) : null}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
