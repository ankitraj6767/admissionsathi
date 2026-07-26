'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import type { SortOption } from '@/types/common';

/** Sort control that writes to the query string (keeps listings server-rendered). */
export function SortSelect({
    options,
    basePath,
    defaultValue,
}: {
    options: SortOption[];
    basePath: string;
    defaultValue: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [pending, startTransition] = useTransition();
    const value = searchParams?.get('sort') ?? defaultValue;

    const onChange = (next: string) => {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        if (next === defaultValue) params.delete('sort');
        else params.set('sort', next);
        params.delete('page');
        const qs = params.toString();
        startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
    };

    return (
        <label className="inline-flex items-center gap-2 text-[12px] text-ink-soft">
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Sort by</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Sort results"
                className="h-9 rounded-[9px] border border-line bg-white px-2 text-[12.5px] font-semibold text-ink outline-none focus:border-navy-300"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        </label>
    );
}
