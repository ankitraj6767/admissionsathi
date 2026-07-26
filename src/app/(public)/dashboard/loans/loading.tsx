import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for saved loan calculations. Renders inside the dashboard layout's content column. */
export default function DashboardLoansLoading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your saved loan calculations</span>

            <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="mt-2 h-3 w-32" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                </div>

                <div className="mt-4 space-y-2">
                    <Skeleton className="h-7 w-full rounded-[9px]" />
                    {Array.from({ length: 6 }).map((_, row) => (
                        <Skeleton key={row} className="h-10 w-full rounded-[9px]" />
                    ))}
                </div>
            </Card>
        </div>
    );
}
