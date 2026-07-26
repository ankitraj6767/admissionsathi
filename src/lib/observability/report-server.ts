import 'server-only';
import { env } from '@/lib/env';
import { logger, newRequestId } from '@/lib/logger';

/**
 * Server-side error tracking adapter.
 *
 * Structured so an APM/Sentry SDK can be dropped in without touching call
 * sites: implement `ErrorReporter` and register it in `resolveReporter()`.
 * Until then every capture lands in the structured log stream, which the
 * hosting platform already indexes.
 */
export interface ErrorReporter {
    readonly name: string;
    capture(error: unknown, context: CaptureContext): Promise<void> | void;
}

export interface CaptureContext {
    /** Logical origin, e.g. `action:lead.create` or `route:/api/cron/notifications`. */
    scope: string;
    requestId?: string;
    userId?: string;
    extra?: Record<string, unknown>;
}

function serialise(error: unknown) {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        };
    }
    return { name: 'UnknownError', message: String(error) };
}

const logReporter: ErrorReporter = {
    name: 'logger',
    capture(error, context) {
        logger.error('error.captured', {
            reporter: 'logger',
            scope: context.scope,
            requestId: context.requestId,
            userId: context.userId,
            error: serialise(error),
            ...(context.extra ?? {}),
        });
    },
};

/**
 * Placeholder transport for a hosted tracker. `SENTRY_DSN` is validated in
 * `env.ts`; when it is present we still log locally and additionally emit a
 * marker so operators can confirm wiring before installing the SDK.
 */
const hostedReporter: ErrorReporter = {
    name: 'hosted',
    capture(error, context) {
        logReporter.capture(error, context);
        logger.warn('error.tracker_not_installed', {
            scope: context.scope,
            hint: 'SENTRY_DSN is set but no SDK is installed. Add @sentry/nextjs and swap resolveReporter().',
        });
    },
};

function resolveReporter(): ErrorReporter {
    return env.SENTRY_DSN ? hostedReporter : logReporter;
}

export async function captureError(error: unknown, context: CaptureContext): Promise<string> {
    const requestId = context.requestId ?? newRequestId();
    try {
        await resolveReporter().capture(error, { ...context, requestId });
    } catch {
        // Reporting must never mask the original failure.
    }
    return requestId;
}
