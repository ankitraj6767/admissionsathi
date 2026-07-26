import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for saved items, grouped by entity type. Renders inside the dashboard content column. */
export default function DashboardSavedLoading() {
    return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your saved items</span>

            {Array.from({ length: 2 }).map((_, group) => (
                <Card key={group}>
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-20" />
                    <div className="mt-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, item) => (
                            <div
                                key={item}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line px-3 py-2.5"
                            >
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="mt-1.5 h-3 w-28" />
                                </div>
                                <Skeleton className="h-5 w-16 rounded-pill" />
                            </div>
                        ))}
                    </div>
                </Card>
            ))}
        </div>
    );
}
