import 'server-only';
import { z } from 'zod';
import { AuthenticationError, AuthorizationError } from '@/lib/auth/rbac';
import { logger, newRequestId } from '@/lib/logger';
import type { ActionErrorCode, ActionResult, FieldErrors } from '@/types/common';

export class NotFoundError extends Error {
    readonly code = 'NOT_FOUND';
    constructor(message = 'The requested record was not found.') {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends Error {
    readonly code = 'CONFLICT';
    constructor(message = 'This record conflicts with an existing one.') {
        super(message);
        this.name = 'ConflictError';
    }
}

export class StaleDataError extends Error {
    readonly code = 'STALE';
    constructor(
        message = 'This record was modified by someone else. Reload the page and try again.',
    ) {
        super(message);
        this.name = 'StaleDataError';
    }
}

export class RateLimitedError extends Error {
    readonly code = 'RATE_LIMITED';
    constructor(message = 'Too many attempts. Please try again in a few minutes.') {
        super(message);
        this.name = 'RateLimitedError';
    }
}

export function fail<T = never>(
    error: string,
    code: ActionErrorCode = 'INTERNAL',
    fieldErrors?: FieldErrors,
): ActionResult<T> {
    return { ok: false, error, code, fieldErrors };
}

export function succeed<T>(data: T, message?: string): ActionResult<T> {
    return { ok: true, data, message };
}

/** Maps a Zod error to `{ field: [messages] }` for React Hook Form. */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
    const out: FieldErrors = {};
    for (const issue of error.issues) {
        const key = issue.path.join('.') || 'root';
        out[key] = [...(out[key] ?? []), issue.message];
    }
    return out;
}

interface RunOptions {
    action: string;
    context?: Record<string, unknown>;
}

/**
 * Wraps a Server Action body: converts thrown domain errors into a typed
 * `ActionResult`, logs unexpected failures with a request id, and never leaks
 * internal error details to the client in production.
 */
export async function runAction<T>(
    options: RunOptions,
    fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
    const requestId = newRequestId();
    try {
        return await fn();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                ok: false,
                error: 'Please correct the highlighted fields.',
                code: 'VALIDATION',
                fieldErrors: zodFieldErrors(error),
            };
        }
        if (error instanceof AuthenticationError) {
            return { ok: false, error: error.message, code: 'UNAUTHENTICATED' };
        }
        if (error instanceof AuthorizationError) {
            return { ok: false, error: error.message, code: 'FORBIDDEN' };
        }
        if (error instanceof NotFoundError) {
            return { ok: false, error: error.message, code: 'NOT_FOUND' };
        }
        if (error instanceof ConflictError) {
            return { ok: false, error: error.message, code: 'CONFLICT' };
        }
        if (error instanceof StaleDataError) {
            return { ok: false, error: error.message, code: 'STALE' };
        }
        if (error instanceof RateLimitedError) {
            return { ok: false, error: error.message, code: 'RATE_LIMITED' };
        }

        // Mongo duplicate key
        const mongoError = error as { code?: number; keyPattern?: Record<string, unknown> };
        if (mongoError?.code === 11000) {
            const field = Object.keys(mongoError.keyPattern ?? {})[0] ?? 'value';
            return {
                ok: false,
                error: `A record with this ${field} already exists.`,
                code: 'DUPLICATE',
                fieldErrors: { [field]: ['Already exists'] },
            };
        }

        logger.error('action.unhandled_error', {
            action: options.action,
            requestId,
            ...options.context,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join(' | ') : undefined,
        });

        return {
            ok: false,
            error: `Something went wrong. Please try again. (ref: ${requestId})`,
            code: 'INTERNAL',
        };
    }
}

/** Parses `FormData` into a plain object suitable for Zod. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) continue;
        if (key.endsWith('[]')) {
            const k = key.slice(0, -2);
            out[k] = [...((out[k] as string[]) ?? []), value];
        } else if (out[key] !== undefined) {
            out[key] = [...(Array.isArray(out[key]) ? (out[key] as string[]) : [out[key] as string]), value];
        } else {
            out[key] = value;
        }
    }
    return out;
}
