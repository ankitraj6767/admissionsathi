import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the college comparison tool: selection toolbar + comparison table panel. */
export default function CompareCollegesLoading() {
    return (
        <div className="shell py-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading the college comparison</span>

            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-4 h-8 w-full max-w-sm" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

            <Card className="mt-6">
                <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: 4 }).map((_, chip) => (
                        <Skeleton key={chip} className="h-9 w-40 rounded-[10px]" />
                    ))}
                    <Skeleton className="h-9 w-28 rounded-[10px]" />
                </div>
            </Card>

            <Card className="mt-4">
                <Skeleton className="h-4 w-44" />

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, column) => (
                        <Skeleton key={column} className="h-14 w-full rounded-[10px]" />
                    ))}
                </div>

                <div className="mt-4 space-y-2">
                    {Array.from({ length: 10 }).map((_, row) => (
                        <Skeleton key={row} className="h-10 w-full rounded-[9px]" />
                    ))}
                </div>
            </Card>

            <Card className="mt-4">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="mt-2 h-3.5 w-full max-w-xl" />
                <Skeleton className="mt-3 h-10 w-48 rounded-[10px]" />
            </Card>
        </div>
    );
}
