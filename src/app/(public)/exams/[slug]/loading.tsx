import { CardSkeleton, Skeleton } from '@/components/ui/primitives';

/** Loading state for the exam sections — keeps the hero and section nav in place. */
export default function ExamSectionLoading() {
    return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading exam details</span>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                    <CardSkeleton lines={6} />
                    <CardSkeleton lines={4} />
                </div>
                <Skeleton className="h-64 w-full rounded-[18px]" />
            </div>
        </div>
    );
}
