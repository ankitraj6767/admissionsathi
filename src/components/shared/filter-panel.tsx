'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterOption {
    label: string;
    value: string;
    count?: number;
}

export interface FilterGroup {
    key: string;
    label: string;
    type: 'checkbox' | 'radio' | 'range' | 'select';
    options?: FilterOption[];
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    collapsed?: boolean;
}

/**
 * URL-driven filter panel.
 * State lives in the query string so listings stay server-rendered, shareable
 * and crawlable; this component only writes to the URL.
 */
export function FilterPanel({
    groups,
    basePath,
    className,
    title = 'Filters',
}: {
    groups: FilterGroup[];
    basePath: string;
    className?: string;
    title?: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [pending, startTransition] = useTransition();
    const [mobileOpen, setMobileOpen] = useState(false);

    const current = useCallback(
        (key: string): string[] => {
            const value = searchParams?.get(key);
            return value ? value.split(',').filter(Boolean) : [];
        },
        [searchParams],
    );

    const pushParams = useCallback(
        (mutate: (params: URLSearchParams) => void) => {
            const params = new URLSearchParams(searchParams?.toString() ?? '');
            mutate(params);
            params.delete('page');
            const qs = params.toString();
            startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
        },
        [basePath, router, searchParams],
    );

    const toggleValue = (key: string, value: string, multiple: boolean) => {
        pushParams((params) => {
            if (!multiple) {
                if (params.get(key) === value) params.delete(key);
                else params.set(key, value);
                return;
            }
            const values = new Set(current(key));
            if (values.has(value)) values.delete(value);
            else values.add(value);
            if (values.size === 0) params.delete(key);
            else params.set(key, Array.from(values).join(','));
        });
    };

    const setSingle = (key: string, value: string) => {
        pushParams((params) => {
            if (!value) params.delete(key);
            else params.set(key, value);
        });
    };

    const activeCount = groups.reduce((sum, group) => sum + current(group.key).length, 0);

    const clearAll = () => {
        pushParams((params) => {
            groups.forEach((group) => params.delete(group.key));
        });
    };

    const body = (
        <div className="space-y-4">
            {groups.map((group) => {
                const selected = current(group.key);
                return (
                    <fieldset key={group.key} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                        <legend className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-soft">
                            {group.label}
                        </legend>

                        {group.type === 'range' ? (
                            <div className="space-y-2">
                                <input
                                    type="range"
                                    min={group.min ?? 0}
                                    max={group.max ?? 100}
                                    step={group.step ?? 1}
                                    defaultValue={selected[0] ?? group.max ?? 100}
                                    aria-label={group.label}
                                    onChange={(e) => setSingle(group.key, e.target.value)}
                                    className="w-full accent-orange"
                                />
                                <p className="text-[11.5px] text-ink-soft">
                                    Up to{' '}
                                    <span className="font-semibold text-ink">
                                        {selected[0] ?? group.max}
                                        {group.unit ?? ''}
                                    </span>
                                </p>
                            </div>
                        ) : group.type === 'select' ? (
                            <select
                                value={selected[0] ?? ''}
                                onChange={(e) => setSingle(group.key, e.target.value)}
                                aria-label={group.label}
                                className="h-10 w-full rounded-[9px] border border-line bg-white px-2.5 text-[12.5px] outline-none focus:border-navy-300"
                            >
                                <option value="">Any</option>
                                {group.options?.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                        {option.count !== undefined ? ` (${option.count})` : ''}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                                {group.options?.map((option) => {
                                    const checked = selected.includes(option.value);
                                    return (
                                        <li key={option.value}>
                                            <label className="flex min-h-[32px] cursor-pointer items-center gap-2 text-[12.5px] text-ink">
                                                <input
                                                    type={group.type === 'radio' ? 'radio' : 'checkbox'}
                                                    name={group.key}
                                                    checked={checked}
                                                    onChange={() => toggleValue(group.key, option.value, group.type === 'checkbox')}
                                                    className="h-3.5 w-3.5 accent-orange"
                                                />
                                                <span className="flex-1 truncate">{option.label}</span>
                                                {option.count !== undefined ? (
                                                    <span className="text-[11px] text-ink-soft">{option.count}</span>
                                                ) : null}
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </fieldset>
                );
            })}
        </div>
    );

    return (
        <>
            {/* Mobile trigger */}
            <div className="mb-3 flex items-center justify-between lg:hidden">
                <Button variant="outline" size="sm" onClick={() => setMobileOpen(true)}>
                    <Filter className="h-4 w-4" aria-hidden />
                    {title}
                    {activeCount > 0 ? (
                        <span className="ml-1 rounded-pill bg-orange px-1.5 text-[10px] font-bold text-white">
                            {activeCount}
                        </span>
                    ) : null}
                </Button>
                {activeCount > 0 ? (
                    <button type="button" onClick={clearAll} className="text-[12px] font-semibold text-orange">
                        Clear all
                    </button>
                ) : null}
            </div>

            {/* Desktop panel */}
            <aside
                className={cn(
                    'hidden rounded-panel border border-line bg-white p-4 shadow-card lg:block',
                    className,
                )}
                aria-label={title}
            >
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-navy-800">
                        <Filter className="h-4 w-4 text-navy-600" aria-hidden />
                        {title}
                        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-soft" aria-hidden /> : null}
                    </h2>
                    {activeCount > 0 ? (
                        <button type="button" onClick={clearAll} className="text-[11.5px] font-semibold text-orange">
                            Clear ({activeCount})
                        </button>
                    ) : null}
                </div>
                {body}
            </aside>

            {/* Mobile sheet */}
            {mobileOpen ? (
                <div className="fixed inset-0 z-[75] lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
                    <button
                        type="button"
                        aria-label="Close filters"
                        onClick={() => setMobileOpen(false)}
                        className="absolute inset-0 bg-navy-900/45"
                    />
                    <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-[slideUp_.22s_var(--ease-premium)] overflow-y-auto rounded-t-panel bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-[15px] font-extrabold text-navy-800">{title}</h2>
                            <button
                                type="button"
                                onClick={() => setMobileOpen(false)}
                                aria-label="Close filters"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
                            >
                                <X className="h-4 w-4" aria-hidden />
                            </button>
                        </div>
                        {body}
                        <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-line bg-white pt-3">
                            <Button variant="outline" full onClick={clearAll}>
                                Clear all
                            </Button>
                            <Button variant="primary" full onClick={() => setMobileOpen(false)}>
                                Show results
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
