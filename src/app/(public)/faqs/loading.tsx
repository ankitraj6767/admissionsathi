import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the FAQ page: category rail + grouped question cards. */
export default function FaqsLoading() {
    return (
        <div className="shell py-10" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading frequently asked questions</span>

            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-9 w-full max-w-md" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

            <div className="mt-8 grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                <Card padded={false} className="p-3">
                    <Skeleton className="h-3 w-24" />
                    <div className="mt-3 space-y-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} className="h-10 w-full rounded-[10px]" />
                        ))}
                    </div>
                </Card>

                <div className="min-w-0 space-y-4">
                    {Array.from({ length: 3 }).map((_, card) => (
                        <Card key={card}>
                            <Skeleton className="h-4 w-40" />
                            <div className="mt-4 space-y-3">
                                {Array.from({ length: 4 }).map((_, row) => (
                                    <div key={row} className="border-b border-line pb-3 last:border-b-0">
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
