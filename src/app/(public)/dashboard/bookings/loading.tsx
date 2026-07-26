import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the bookings list. Renders inside the dashboard layout's content column. */
export default function DashboardBookingsLoading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your counselling bookings</span>

            <Card>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
                <div className="mt-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, booking) => (
                        <div key={booking} className="rounded-[12px] border border-line p-3.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-4 w-56" />
                                    <Skeleton className="mt-2 h-3 w-64" />
                                    <Skeleton className="mt-1.5 h-3 w-32" />
                                </div>
                                <Skeleton className="h-5 w-20 rounded-pill" />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Skeleton className="h-9 w-28 rounded-[9px]" />
                                <Skeleton className="h-9 w-28 rounded-[9px]" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
