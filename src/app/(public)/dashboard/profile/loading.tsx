import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the profile, preferences and account panels. Renders inside the dashboard content column. */
export default function DashboardProfileLoading() {
    return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your profile settings</span>

            <Card>
                <Skeleton className="h-4 w-24" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 8 }).map((_, field) => (
                        <div key={field}>
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="mt-2 h-11 w-full rounded-[10px]" />
                        </div>
                    ))}
                </div>
                <Skeleton className="mt-4 h-11 w-32 rounded-[10px]" />
            </Card>

            <Card>
                <Skeleton className="h-4 w-40" />
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, toggle) => (
                        <Skeleton key={toggle} className="h-10 w-full rounded-[10px]" />
                    ))}
                </div>
                <Skeleton className="mt-4 h-11 w-40 rounded-[10px]" />
            </Card>

            <Card>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-full max-w-md" />
                <div className="mt-4 flex flex-wrap gap-2">
                    <Skeleton className="h-10 w-36 rounded-[10px]" />
                    <Skeleton className="h-10 w-36 rounded-[10px]" />
                </div>
            </Card>
        </div>
    );
}
