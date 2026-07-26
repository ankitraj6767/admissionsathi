import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for predictor history. Renders inside the dashboard layout's content column. */
export default function DashboardPredictionsLoading() {
    return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your predictor history</span>

            {Array.from({ length: 3 }).map((_, session) => (
                <Card key={session}>
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="mt-2 h-3 w-40" />

                    <div className="mb-3 mt-3 flex flex-wrap gap-2">
                        {Array.from({ length: 4 }).map((_, chip) => (
                            <Skeleton key={chip} className="h-5 w-24 rounded-pill" />
                        ))}
                    </div>

                    <div className="space-y-1.5">
                        {Array.from({ length: 5 }).map((_, row) => (
                            <Skeleton key={row} className="h-12 w-full rounded-[9px]" />
                        ))}
                    </div>
                </Card>
            ))}
        </div>
    );
}
