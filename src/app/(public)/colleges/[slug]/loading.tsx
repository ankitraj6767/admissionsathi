import { CardSkeleton, Skeleton } from '@/components/ui/primitives';

/**
 * Loading state for the college tabs.
 *
 * Scoped to the segment's children, so the hero and the tab strip stay on screen
 * while a tab's content loads — switching tabs no longer looks like a full page
 * reload.
 */
export default function CollegeTabLoading() {
    return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading college details</span>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                    <CardSkeleton lines={6} />
                    <CardSkeleton lines={4} />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-40 w-full rounded-[18px]" />
                    <Skeleton className="h-56 w-full rounded-[18px]" />
                </div>
            </div>
        </div>
    );
}
