import { Skeleton } from '@/components/ui/primitives';

/** Route-level loading state for admin pages. */
export default function AdminLoading() {
    return (
        <div className="space-y-6 p-1" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading admin view</span>

            <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-64" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full rounded-[14px]" />
                ))}
            </div>

            <Skeleton className="h-[420px] w-full rounded-[16px]" />
        </div>
    );
}
