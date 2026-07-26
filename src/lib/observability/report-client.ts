/**
 * Client-side error reporting shim.
 *
 * Deliberately provider-agnostic: it forwards to whatever tracker has been
 * attached to `window` (Sentry, Bugsnag, a custom collector) and otherwise
 * logs to the console in development. No DSN or secret is referenced here —
 * this file ships to the browser.
 */
type ErrorContext = Record<string, string | number | boolean | undefined>;

interface WindowWithTracker extends Window {
    Sentry?: { captureException: (error: unknown, hint?: unknown) => void };
    __admissionSathiOnError?: (error: unknown, context?: ErrorContext) => void;
}

export function reportClientError(error: unknown, context?: ErrorContext): void {
    if (typeof window === 'undefined') return;

    const w = window as WindowWithTracker;

    try {
        w.__admissionSathiOnError?.(error, context);
        w.Sentry?.captureException(error, context ? { extra: context } : undefined);
    } catch {
        // Never let the reporter itself break the error boundary.
    }

    if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[client-error]', context ?? {}, error);
    }
}
