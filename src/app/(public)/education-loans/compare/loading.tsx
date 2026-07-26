import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the lender comparison table. */
export default function CompareLoansLoading() {
    return (
        <div className="shell py-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading the education loan comparison</span>

            <Skeleton className="h-4 w-56" />
            <Skeleton className="mt-4 h-8 w-full max-w-md" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl" />

            <Card className="mt-6">
                <Skeleton className="h-4 w-40" />
                <div className="mt-4 space-y-2">
                    <Skeleton className="h-8 w-full rounded-[9px]" />
                    {Array.from({ length: 8 }).map((_, row) => (
                        <Skeleton key={row} className="h-11 w-full rounded-[9px]" />
                    ))}
                </div>
                <Skeleton className="mt-3 h-10 w-full rounded-[10px]" />
            </Card>

            <Card className="mt-4">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="mt-2 h-3.5 w-full max-w-xl" />
                <Skeleton className="mt-3 h-10 w-48 rounded-[10px]" />
            </Card>
        </div>
    );
}
