import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function pageHref(basePath: string, params: Record<string, string | undefined>, page: number) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value && key !== 'page') sp.set(key, value);
    });
    if (page > 1) sp.set('page', String(page));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
}

function pageWindow(current: number, total: number): (number | 'gap')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>([1, total, current, current - 1, current + 1]);
    if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
    if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));

    const sorted = Array.from(pages)
        .filter((p) => p >= 1 && p <= total)
        .sort((a, b) => a - b);

    const output: (number | 'gap')[] = [];
    sorted.forEach((page, index) => {
        if (index > 0 && page - (sorted[index - 1] as number) > 1) output.push('gap');
        output.push(page);
    });
    return output;
}

/** Server-rendered, crawlable pagination (real links, no client JS). */
export function Pagination({
    basePath,
    params,
    page,
    totalPages,
    total,
    pageSize,
    className,
}: {
    basePath: string;
    params: Record<string, string | undefined>;
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    className?: string;
}) {
    if (totalPages <= 1) {
        return (
            <p className={cn('text-[12px] text-ink-soft', className)}>
                Showing {total} result{total === 1 ? '' : 's'}
            </p>
        );
    }

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(total, page * pageSize);

    return (
        <nav
            aria-label="Pagination"
            className={cn('flex flex-col items-center gap-3 sm:flex-row sm:justify-between', className)}
        >
            <p className="text-[12px] text-ink-soft">
                Showing <span className="font-semibold text-ink">{from}</span>–
                <span className="font-semibold text-ink">{to}</span> of{' '}
                <span className="font-semibold text-ink">{total}</span>
            </p>

            <ul className="flex items-center gap-1">
                <li>
                    {page > 1 ? (
                        <Link
                            href={pageHref(basePath, params, page - 1)}
                            rel="prev"
                            aria-label="Previous page"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-line bg-white text-ink hover:border-navy-200"
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden />
                        </Link>
                    ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-line bg-muted text-ink-soft/50">
                            <ChevronLeft className="h-4 w-4" aria-hidden />
                        </span>
                    )}
                </li>

                {pageWindow(page, totalPages).map((item, index) =>
                    item === 'gap' ? (
                        <li key={`gap-${index}`} className="px-1 text-[12px] text-ink-soft">
                            …
                        </li>
                    ) : (
                        <li key={item}>
                            <Link
                                href={pageHref(basePath, params, item)}
                                aria-current={item === page ? 'page' : undefined}
                                className={cn(
                                    'inline-flex h-9 min-w-9 items-center justify-center rounded-[9px] border px-2 text-[12.5px] font-semibold',
                                    item === page
                                        ? 'border-navy bg-navy text-white'
                                        : 'border-line bg-white text-ink hover:border-navy-200',
                                )}
                            >
                                {item}
                            </Link>
                        </li>
                    ),
                )}

                <li>
                    {page < totalPages ? (
                        <Link
                            href={pageHref(basePath, params, page + 1)}
                            rel="next"
                            aria-label="Next page"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-line bg-white text-ink hover:border-navy-200"
                        >
                            <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                    ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-line bg-muted text-ink-soft/50">
                            <ChevronRight className="h-4 w-4" aria-hidden />
                        </span>
                    )}
                </li>
            </ul>
        </nav>
    );
}
