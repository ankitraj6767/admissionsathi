import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the notifications list. Renders inside the dashboard layout's content column. */
export default function DashboardNotificationsLoading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your notifications</span>

            <Card>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-48" />

                <div className="mt-4 space-y-2">
                    {Array.from({ length: 6 }).map((_, item) => (
                        <div key={item} className="rounded-[10px] border border-line px-3 py-2.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-4 w-52" />
                                    <Skeleton className="mt-1.5 h-3 w-full max-w-md" />
                                </div>
                                <Skeleton className="h-5 w-20 rounded-pill" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
