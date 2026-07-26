'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportClientError } from '@/lib/observability/report-client';

/**
 * Admin error boundary. Admin users are staff, so the copy is more specific
 * than the public boundary — it surfaces the message and digest to help
 * operators report the failure accurately.
 */
export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        reportClientError(error, { boundary: 'admin' });
    }, [error]);

    const isAuthorization = /permission|forbidden/i.test(error.message);

    return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-[16px] border border-line bg-white p-8 text-center shadow-card">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange">
                    <AlertOctagon className="h-7 w-7" aria-hidden="true" />
                </span>

                <h1 className="mt-5 text-xl font-bold text-ink">
                    {isAuthorization ? 'You do not have access to this' : 'This admin screen failed to load'}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {isAuthorization
                        ? 'Your role is missing a permission required by this module. Ask a Super Admin to update your role.'
                        : 'The request could not be completed. Retry, and if it keeps failing share the reference below with your engineering team.'}
                </p>

                <div className="mt-4 space-y-1 rounded-[10px] bg-muted p-3 text-left">
                    <p className="text-xs font-semibold text-ink">Details</p>
                    <p className="break-words text-xs text-ink-soft">{error.message || 'Unknown error'}</p>
                    {error.digest ? (
                        <p className="text-xs text-ink-soft">
                            Reference: <code>{error.digest}</code>
                        </p>
                    ) : null}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Button type="button" onClick={reset} size="sm">
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Retry
                    </Button>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/admin">Admin dashboard</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
