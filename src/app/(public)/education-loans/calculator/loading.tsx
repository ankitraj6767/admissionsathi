import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the EMI calculator: input panel + results panel, then explainer cards. */
export default function LoanCalculatorLoading() {
    return (
        <div className="shell py-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading the education loan EMI calculator</span>

            <Skeleton className="h-4 w-56" />
            <Skeleton className="mt-4 h-8 w-full max-w-md" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
                <Card>
                    <Skeleton className="h-4 w-36" />
                    <div className="mt-4 space-y-4">
                        {Array.from({ length: 5 }).map((_, field) => (
                            <div key={field}>
                                <Skeleton className="h-3 w-28" />
                                <Skeleton className="mt-2 h-11 w-full rounded-[10px]" />
                            </div>
                        ))}
                    </div>
                    <Skeleton className="mt-4 h-11 w-full rounded-[10px]" />
                </Card>

                <div className="min-w-0 space-y-4">
                    <Card>
                        <Skeleton className="h-4 w-32" />
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, stat) => (
                                <Skeleton key={stat} className="h-20 w-full rounded-[12px]" />
                            ))}
                        </div>
                        <Skeleton className="mt-4 h-48 w-full rounded-[12px]" />
                    </Card>
                    <Card>
                        <Skeleton className="h-4 w-44" />
                        <div className="mt-4 space-y-2">
                            {Array.from({ length: 6 }).map((_, row) => (
                                <Skeleton key={row} className="h-8 w-full rounded-[9px]" />
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            <div className="mt-4 space-y-4">
                {Array.from({ length: 2 }).map((_, card) => (
                    <Card key={card}>
                        <Skeleton className="h-4 w-48" />
                        <div className="mt-3 space-y-2">
                            {Array.from({ length: 3 }).map((_, line) => (
                                <Skeleton key={line} className="h-3.5 w-full max-w-3xl" />
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
