import { Card, Skeleton } from '@/components/ui/primitives';

/**
 * Skeleton for the dashboard overview. Renders inside the dashboard layout's content
 * column (the layout already supplies the page header and the `shell py-6` wrapper),
 * so this file only mirrors the column contents.
 */
export default function DashboardLoading() {
    return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your dashboard</span>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, stat) => (
                    <Skeleton key={stat} className="h-[68px] w-full rounded-[18px]" />
                ))}
            </div>

            <Card>
                <Skeleton className="h-4 w-40" />
                <div className="mt-4 space-y-2">
                    {Array.from({ length: 3 }).map((_, row) => (
                        <Skeleton key={row} className="h-14 w-full rounded-[10px]" />
                    ))}
                </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, panel) => (
                    <Card key={panel}>
                        <Skeleton className="h-4 w-36" />
                        <div className="mt-3 space-y-1.5">
                            {Array.from({ length: 5 }).map((_, row) => (
                                <Skeleton key={row} className="h-8 w-full rounded-[9px]" />
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
