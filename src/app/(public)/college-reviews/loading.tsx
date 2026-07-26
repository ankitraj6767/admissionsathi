import { CardSkeleton, Skeleton } from '@/components/ui/primitives';

/** Route-level loading state for the college reviews hub. */
export default function CollegeReviewsLoading() {
    return (
        <div className="shell py-8" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading college reviews</span>

            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-4 h-8 w-full max-w-sm" />

            <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <Skeleton className="hidden h-72 w-full rounded-[18px] lg:block" />
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full rounded-[18px]" />
                    {Array.from({ length: 4 }).map((_, index) => (
                        <CardSkeleton key={index} lines={5} />
                    ))}
                </div>
            </div>
        </div>
    );
}
