import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the search page: search box + grouped result cards. */
export default function SearchLoading() {
    return (
        <div className="shell py-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading search results</span>

            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-8 w-full max-w-sm" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
            <Skeleton className="mt-4 h-12 w-full max-w-2xl rounded-[12px]" />

            <div className="mt-6 space-y-4">
                {Array.from({ length: 3 }).map((_, group) => (
                    <Card key={group}>
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="mt-2 h-3 w-24" />
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {Array.from({ length: 6 }).map((_, hit) => (
                                <Skeleton key={hit} className="h-14 w-full rounded-[10px]" />
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
