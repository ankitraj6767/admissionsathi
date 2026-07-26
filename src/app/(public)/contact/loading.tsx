import { Card, Skeleton } from '@/components/ui/primitives';

/** Skeleton for the contact page: form column + contact details column. */
export default function ContactLoading() {
    return (
        <div className="shell py-10" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading contact page</span>

            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-9 w-full max-w-sm" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl" />

            <div className="mt-8 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <Card>
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="mt-2 h-3 w-64" />
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index}>
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="mt-2 h-11 w-full rounded-[10px]" />
                            </div>
                        ))}
                    </div>
                    <Skeleton className="mt-4 h-3 w-24" />
                    <Skeleton className="mt-2 h-32 w-full rounded-[10px]" />
                    <Skeleton className="mt-4 h-12 w-full rounded-[10px]" />
                </Card>

                <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, card) => (
                        <Card key={card}>
                            <Skeleton className="h-4 w-28" />
                            <div className="mt-3 space-y-2">
                                {Array.from({ length: 4 }).map((_, row) => (
                                    <Skeleton key={row} className="h-12 w-full rounded-[10px]" />
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
