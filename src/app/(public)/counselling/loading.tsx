import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the counselling hub: type tiles, lifecycle steps, counsellor cards and FAQs. */
export default function CounsellingLoading() {
    return (
        <div className="shell py-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading counselling options</span>

            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-8 w-full max-w-md" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

            <div className="mt-6 space-y-4">
                <Card>
                    <Skeleton className="h-4 w-56" />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 5 }).map((_, tile) => (
                            <Skeleton key={tile} className="h-28 w-full rounded-[18px]" />
                        ))}
                    </div>
                </Card>

                <Card>
                    <Skeleton className="h-4 w-44" />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, step) => (
                            <Skeleton key={step} className="h-24 w-full rounded-[12px]" />
                        ))}
                    </div>
                </Card>

                <Card>
                    <Skeleton className="h-4 w-40" />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, counsellor) => (
                            <Skeleton key={counsellor} className="h-32 w-full rounded-[18px]" />
                        ))}
                    </div>
                </Card>

                <Card>
                    <Skeleton className="h-4 w-40" />
                    <div className="mt-4 space-y-3">
                        {Array.from({ length: 6 }).map((_, faq) => (
                            <div key={faq} className="border-b border-line pb-3 last:border-b-0">
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ))}
                    </div>
                </Card>

                <Skeleton className="h-24 w-full rounded-[18px]" />
            </div>
        </div>
    );
}
