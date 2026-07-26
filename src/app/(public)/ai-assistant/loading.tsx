import { Skeleton } from '@/components/ui/primitives';

/** Route-level loading state for the full assistant page. */
export default function AiAssistantLoading() {
    return (
        <div className="shell py-8" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading the AI assistant</span>

            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-4 h-8 w-full max-w-sm" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl" />

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <Skeleton className="h-[420px] w-full rounded-[18px]" />
                <div className="space-y-4">
                    <Skeleton className="h-40 w-full rounded-[18px]" />
                    <Skeleton className="h-40 w-full rounded-[18px]" />
                </div>
            </div>
        </div>
    );
}
