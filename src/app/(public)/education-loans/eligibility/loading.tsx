import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the loan eligibility tool: input panel + estimate panel, then checklists. */
export default function LoanEligibilityLoading() {
    return (
        <div className="shell py-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading the education loan eligibility checker</span>

            <Skeleton className="h-4 w-56" />
            <Skeleton className="mt-4 h-8 w-full max-w-md" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
                <Card>
                    <Skeleton className="h-4 w-40" />
                    <div className="mt-4 space-y-4">
                        {Array.from({ length: 6 }).map((_, field) => (
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
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="mt-3 h-24 w-full rounded-[12px]" />
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, stat) => (
                                <Skeleton key={stat} className="h-16 w-full rounded-[12px]" />
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            <div className="mt-4 space-y-4">
                <Card>
                    <Skeleton className="h-4 w-52" />
                    <div className="mt-3 space-y-2">
                        {Array.from({ length: 5 }).map((_, line) => (
                            <Skeleton key={line} className="h-3.5 w-full max-w-2xl" />
                        ))}
                    </div>
                </Card>
                <Card>
                    <Skeleton className="h-4 w-44" />
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {Array.from({ length: 8 }).map((_, item) => (
                            <Skeleton key={item} className="h-10 w-full rounded-[10px]" />
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
