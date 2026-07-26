'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/observability/report-client';

/**
 * Last-resort boundary. Catches errors thrown in the root layout itself, so it
 * must render its own <html>/<body> and cannot rely on app CSS variables.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        reportClientError(error, { boundary: 'global-error' });
    }, [error]);

    return (
        <html lang="en-IN">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f5f8fd',
                    color: '#12213d',
                    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
                    padding: '24px',
                }}
            >
                <main
                    style={{
                        maxWidth: '520px',
                        textAlign: 'center',
                        background: '#ffffff',
                        border: '1px solid #e5eaf2',
                        borderRadius: '16px',
                        padding: '40px 28px',
                    }}
                >
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 10px' }}>
                        Something went wrong
                    </h1>
                    <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#667085', margin: '0 0 24px' }}>
                        We hit an unexpected error while loading Admission Sathi. Our team has been notified.
                        Please try again.
                    </p>
                    {error.digest ? (
                        <p style={{ fontSize: '12px', color: '#667085', margin: '0 0 20px' }}>
                            Reference: <code>{error.digest}</code>
                        </p>
                    ) : null}
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            minHeight: '44px',
                            padding: '0 22px',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#ff6b17',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </main>
            </body>
        </html>
    );
}
