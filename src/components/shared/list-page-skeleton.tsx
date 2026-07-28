import { CardSkeleton, Skeleton } from '@/components/ui/primitives';

/**
 * Shared fallback for the listing pages' `loading.tsx`.
 *
 * One component instead of a dozen near-identical files: every listing page has
 * the same shape (heading, optional filter rail, a column of cards), and the
 * fallback only needs to hold the layout steady for a few hundred milliseconds.
 *
 * Note where these boundaries live: in an `(index)` route group next to the
 * listing page, never on the parent segment. A boundary on `/colleges` itself
 * would also cover `/colleges/[slug]`, and flushing its shell commits a `200`
 * before the detail page can call `notFound()` — see "Route loading states and
 * 404 correctness" in docs/architecture.md.
 */
export function ListPageSkeleton({ withFilters = true }: { withFilters?: boolean }) {
    return (
        <div className="shell py-8" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading</span>

            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-4 h-8 w-full max-w-md" />

            <div
                className={
                    withFilters
                        ? 'mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]'
                        : 'mt-6 grid gap-4'
                }
            >
                {withFilters ? <Skeleton className="hidden h-80 w-full rounded-[18px] lg:block" /> : null}

                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <CardSkeleton key={index} lines={5} />
                    ))}
                </div>
            </div>
        </div>
    );
}
