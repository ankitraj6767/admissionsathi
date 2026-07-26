'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportClientError } from '@/lib/observability/report-client';

/**
 * Error boundary for every public route. The site header/footer from the
 * layout stay mounted, so visitors keep their navigation.
 */
export default function PublicError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        reportClientError(error, { boundary: 'public' });
    }, [error]);

    return (
        <div className="shell flex min-h-[55vh] flex-col items-center justify-center py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange">
                <AlertTriangle className="h-8 w-8" aria-hidden="true" />
            </span>

            <h1 className="mt-6 text-2xl font-extrabold text-ink sm:text-3xl">
                This page could not be loaded
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
                Something went wrong on our side. Retrying usually fixes it. If the problem continues, please
                reach out to our support team.
            </p>

            {error.digest ? (
                <p className="mt-3 text-xs text-ink-soft">
                    Reference: <code className="rounded bg-muted px-1.5 py-0.5">{error.digest}</code>
                </p>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button type="button" onClick={reset}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Try again
                </Button>
                <Button asChild variant="outline">
                    <Link href="/">Back to home</Link>
                </Button>
            </div>
        </div>
    );
}
