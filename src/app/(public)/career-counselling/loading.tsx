import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the career counselling landing: content column + booking form column. */
export default function CareerCounsellingLoading() {
    return (
        <div className="shell py-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading career counselling</span>

            <Skeleton className="h-4 w-52" />
            <Skeleton className="mt-4 h-8 w-full max-w-sm" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-4">
                    <Card>
                        <Skeleton className="h-4 w-48" />
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, benefit) => (
                                <Skeleton key={benefit} className="h-20 w-full rounded-[12px]" />
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <Skeleton className="h-4 w-36" />
                        <div className="mt-3 space-y-2">
                            {Array.from({ length: 5 }).map((_, line) => (
                                <Skeleton key={line} className="h-3.5 w-full max-w-2xl" />
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <Skeleton className="h-4 w-40" />
                        <div className="mt-3 space-y-2">
                            {Array.from({ length: 4 }).map((_, line) => (
                                <Skeleton key={line} className="h-3.5 w-full max-w-xl" />
                            ))}
                        </div>
                    </Card>

                    <Skeleton className="h-24 w-full rounded-[18px]" />
                </div>

                <div>
                    <Card>
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="mt-2 h-3 w-56" />
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            {Array.from({ length: 6 }).map((_, field) => (
                                <div key={field}>
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="mt-2 h-11 w-full rounded-[10px]" />
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, slot) => (
                                <Skeleton key={slot} className="h-12 w-full rounded-[10px]" />
                            ))}
                        </div>
                        <Skeleton className="mt-4 h-12 w-full rounded-[10px]" />
                    </Card>
                    <Skeleton className="mx-auto mt-3 h-3 w-48" />
                </div>
            </div>
        </div>
    );
}
