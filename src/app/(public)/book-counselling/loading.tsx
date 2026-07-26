import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the booking page: booking form column + supporting aside. */
export default function BookCounsellingLoading() {
    return (
        <div className="shell py-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading the counselling booking form</span>

            <Skeleton className="h-4 w-56" />
            <Skeleton className="mt-4 h-8 w-full max-w-md" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <Card>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="mt-2 h-3 w-64" />

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {Array.from({ length: 8 }).map((_, field) => (
                            <div key={field}>
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="mt-2 h-11 w-full rounded-[10px]" />
                            </div>
                        ))}
                    </div>

                    <Skeleton className="mt-5 h-3 w-32" />
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, slot) => (
                            <Skeleton key={slot} className="h-12 w-full rounded-[10px]" />
                        ))}
                    </div>

                    <Skeleton className="mt-4 h-10 w-full rounded-[10px]" />
                    <Skeleton className="mt-3 h-12 w-full rounded-[10px]" />
                </Card>

                <div className="space-y-4">
                    <Card>
                        <Skeleton className="h-4 w-28" />
                        <div className="mt-3 space-y-2">
                            {Array.from({ length: 4 }).map((_, line) => (
                                <Skeleton key={line} className="h-3.5 w-full max-w-xs" />
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <Skeleton className="h-4 w-32" />
                        <div className="mt-3 space-y-2">
                            {Array.from({ length: 5 }).map((_, row) => (
                                <Skeleton key={row} className="h-12 w-full rounded-[10px]" />
                            ))}
                        </div>
                        <Skeleton className="mt-3 h-3 w-36" />
                    </Card>

                    <Card>
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="mt-3 h-5 w-40" />
                        <Skeleton className="mt-2 h-3 w-48" />
                    </Card>
                </div>
            </div>
        </div>
    );
}
