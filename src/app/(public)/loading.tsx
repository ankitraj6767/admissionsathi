import { CardSkeleton, Skeleton } from '@/components/ui/primitives';

/**
 * Default loading state for every public route that does not define its own.
 *
 * Two jobs. First, a click paints a shell immediately instead of waiting on the
 * slowest query in the page. Second — and this is the part that is easy to miss
 * — a dynamic route with no loading boundary cannot be usefully prefetched: the
 * router has nothing to store. Having a boundary here is what lets hover
 * prefetching make these navigations feel instant.
 */
export default function PublicLoading() {
    return (
        <div className="shell py-8" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading</span>

            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-4 h-8 w-full max-w-md" />

            <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <Skeleton className="hidden h-80 w-full rounded-[18px] lg:block" />
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <CardSkeleton key={index} lines={5} />
                    ))}
                </div>
            </div>
        </div>
    );
}
